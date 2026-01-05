#!/bin/bash
# ===============================================
# ImmoGuinée - Docker Swarm Deployment Script
# Usage: ./scripts/deploy-swarm.sh [command]
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"
STACK_NAME="immog"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ImmoGuinée Docker Swarm Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]] && ! docker info &>/dev/null; then
        echo -e "${RED}Please run with sudo or as root${NC}"
        exit 1
    fi
}

# Initialize Docker Swarm
init_swarm() {
    echo -e "${YELLOW}Initializing Docker Swarm...${NC}"

    if docker info | grep -q "Swarm: active"; then
        echo -e "${GREEN}Swarm already active${NC}"
    else
        # Get the public IP
        PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
        docker swarm init --advertise-addr "$PUBLIC_IP" || docker swarm init
        echo -e "${GREEN}Swarm initialized${NC}"
    fi
}

# Build images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    cd "$PROJECT_DIR"

    # Build frontend (--no-cache to force rebuild)
    echo -e "${YELLOW}Building frontend image...${NC}"
    docker build --no-cache -t immoguinee/frontend:latest \
        --build-arg NEXT_PUBLIC_API_URL=/api \
        -f frontend/Dockerfile frontend/

    # Build PHP (--no-cache to force rebuild)
    echo -e "${YELLOW}Building PHP image...${NC}"
    docker build --no-cache -t immoguinee/php:latest \
        -f docker/php/Dockerfile backend/

    echo -e "${GREEN}Images built successfully${NC}"
}

# Deploy stack
deploy_stack() {
    echo -e "${YELLOW}Deploying stack...${NC}"
    cd "$DOCKER_DIR"

    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    # Deploy with both compose files
    docker stack deploy \
        -c docker-compose.yml \
        -c docker-compose.prod.yml \
        --with-registry-auth \
        "$STACK_NAME"

    echo -e "${GREEN}Stack deployed${NC}"
}

# Update a single service (rolling update)
update_service() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Usage: $0 update <service_name>${NC}"
        echo "Available services: frontend, php, nginx, queue-worker, scheduler"
        exit 1
    fi

    echo -e "${YELLOW}Updating service: ${STACK_NAME}_${SERVICE}...${NC}"
    docker service update --force "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}Service updated${NC}"
}

# Cleanup old containers and images
cleanup() {
    echo -e "${YELLOW}Cleaning up old containers and images...${NC}"

    # Remove stopped containers
    docker container prune -f 2>/dev/null || true

    # Remove unused images (dangling)
    docker image prune -f 2>/dev/null || true

    # Remove old images not used by any container (keep last 2 versions)
    echo -e "${YELLOW}Removing old unused images...${NC}"
    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -E '^immoguinee/(frontend|php):' | tail -n +3 | awk '{print $2}' | xargs -r docker rmi 2>/dev/null || true

    echo -e "${GREEN}Cleanup completed${NC}"
}

# Update frontend with new build
update_frontend() {
    echo -e "${YELLOW}Updating frontend...${NC}"

    # Pull latest code
    cd "$PROJECT_DIR"
    git pull

    # Step 1: Build new image FIRST
    echo -e "${YELLOW}Step 1/3: Building new frontend image...${NC}"
    docker build --no-cache -t immoguinee/frontend:latest \
        --build-arg NEXT_PUBLIC_API_URL=/api \
        -f frontend/Dockerfile frontend/

    # Step 2: Update service with new image (rolling update - zero downtime)
    echo -e "${YELLOW}Step 2/3: Updating service with new image...${NC}"
    docker service update \
        --image immoguinee/frontend:latest \
        --force \
        --update-parallelism 1 \
        --update-delay 30s \
        --update-failure-action rollback \
        --update-order start-first \
        "${STACK_NAME}_frontend"

    # Step 3: Cleanup old containers and images
    echo -e "${YELLOW}Step 3/3: Cleaning up...${NC}"
    cleanup

    echo -e "${GREEN}Frontend updated with zero downtime${NC}"
}

# Update backend (PHP)
# Usage: update_backend [--quick] [--no-migrate]
update_backend() {
    local QUICK_MODE=false
    local RUN_MIGRATE=true
    local REMOTE_HOST="${REMOTE_HOST:-immoguinee}"
    local REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/immoguinee}"

    # Parse arguments
    for arg in "$@"; do
        case $arg in
            --quick) QUICK_MODE=true ;;
            --no-migrate) RUN_MIGRATE=false ;;
        esac
    done

    echo -e "${YELLOW}Updating backend...${NC}"

    # Detect if running locally or on server
    if [ -n "$SSH_CONNECTION" ] || [ "$(hostname)" = "immoguinee" ]; then
        # Running on server
        echo -e "${BLUE}Running on server${NC}"
        cd "$PROJECT_DIR"

        if [ "$QUICK_MODE" = false ]; then
            git pull
            # Build new image
            docker build --no-cache -t immoguinee/php:latest \
                -f docker/php/Dockerfile backend/

            # Update all PHP services with new image
            docker service update \
                --image immoguinee/php:latest \
                --force \
                --update-parallelism 1 \
                --update-delay 10s \
                --update-failure-action rollback \
                "${STACK_NAME}_php"

            docker service update \
                --image immoguinee/php:latest \
                --force \
                "${STACK_NAME}_queue-worker"

            docker service update \
                --image immoguinee/php:latest \
                --force \
                "${STACK_NAME}_scheduler"

            # Cleanup after update
            cleanup
        fi
    else
        # Running locally - sync files to server
        echo -e "${BLUE}Running locally - syncing to ${REMOTE_HOST}${NC}"

        # Sync backend files to server
        echo -e "${YELLOW}Syncing backend files...${NC}"
        rsync -avz --delete \
            --chmod=F644,D755 \
            --exclude 'vendor' \
            --exclude 'node_modules' \
            --exclude '.env' \
            --exclude 'storage/logs/*' \
            --exclude 'storage/framework/cache/*' \
            --exclude 'storage/framework/sessions/*' \
            --exclude 'storage/framework/views/*' \
            --exclude 'bootstrap/cache/*' \
            "$PROJECT_DIR/backend/" \
            "${REMOTE_HOST}:${REMOTE_DIR}/backend/"

        if [ "$QUICK_MODE" = true ]; then
            echo -e "${YELLOW}Quick mode: Copying files to containers...${NC}"

            # Get container IDs
            PHP_CONTAINERS=$(ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}' | grep -E '${STACK_NAME}_php\.[0-9]' | tr '\n' ' '")

            for CONTAINER in $PHP_CONTAINERS; do
                echo -e "${YELLOW}Updating container: ${CONTAINER}${NC}"

                # Copy updated files to container
                ssh "$REMOTE_HOST" "
                    docker cp ${REMOTE_DIR}/backend/app/. ${CONTAINER}:/var/www/backend/app/ && \
                    docker cp ${REMOTE_DIR}/backend/config/. ${CONTAINER}:/var/www/backend/config/ && \
                    docker cp ${REMOTE_DIR}/backend/routes/. ${CONTAINER}:/var/www/backend/routes/ && \
                    docker cp ${REMOTE_DIR}/backend/database/migrations/. ${CONTAINER}:/var/www/backend/database/migrations/
                "
            done

            # Clear caches
            echo -e "${YELLOW}Clearing caches...${NC}"
            FIRST_PHP=$(ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}' | grep '${STACK_NAME}_php\.[0-9]' | head -1")
            ssh "$REMOTE_HOST" "
                docker exec ${FIRST_PHP} php artisan config:clear && \
                docker exec ${FIRST_PHP} php artisan cache:clear && \
                docker exec ${FIRST_PHP} php artisan route:clear
            "
        else
            echo -e "${YELLOW}Full rebuild mode: Building new image on server...${NC}"
            ssh "$REMOTE_HOST" "
                cd ${REMOTE_DIR} && \
                docker build --no-cache -t immoguinee/php:latest -f docker/php/Dockerfile backend/
            "

            # Update services with new image
            echo -e "${YELLOW}Updating services...${NC}"
            ssh "$REMOTE_HOST" "
                docker service update --image immoguinee/php:latest --force \
                    --update-parallelism 1 --update-delay 10s --update-failure-action rollback \
                    ${STACK_NAME}_php && \
                docker service update --image immoguinee/php:latest --force ${STACK_NAME}_queue-worker && \
                docker service update --image immoguinee/php:latest --force ${STACK_NAME}_scheduler
            "
        fi

        # Run migrations if requested
        if [ "$RUN_MIGRATE" = true ]; then
            echo -e "${YELLOW}Running migrations...${NC}"
            FIRST_PHP=$(ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}' | grep '${STACK_NAME}_php\.[0-9]' | head -1")
            ssh "$REMOTE_HOST" "docker exec ${FIRST_PHP} php artisan migrate --force" || true
        fi

        # Clear and rebuild caches
        echo -e "${YELLOW}Rebuilding caches...${NC}"
        FIRST_PHP=$(ssh "$REMOTE_HOST" "docker ps --format '{{.Names}}' | grep '${STACK_NAME}_php\.[0-9]' | head -1")
        ssh "$REMOTE_HOST" "
            docker exec ${FIRST_PHP} php artisan config:clear && \
            docker exec ${FIRST_PHP} php artisan cache:clear && \
            docker exec ${FIRST_PHP} php artisan route:clear
        " || true
    fi

    echo -e "${GREEN}Backend updated${NC}"
}

# Full update (frontend + backend)
update_all() {
    echo -e "${YELLOW}Full update...${NC}"

    cd "$PROJECT_DIR"
    git pull

    # Step 1: Build all images first
    echo -e "${YELLOW}Step 1/3: Building all images...${NC}"
    build_images

    # Step 2: Update all application services with new images
    echo -e "${YELLOW}Step 2/3: Updating all services...${NC}"
    docker service update --image immoguinee/frontend:latest --force "${STACK_NAME}_frontend"
    docker service update --image immoguinee/php:latest --force "${STACK_NAME}_php"
    docker service update --image immoguinee/php:latest --force "${STACK_NAME}_queue-worker"
    docker service update --image immoguinee/php:latest --force "${STACK_NAME}_scheduler"

    # Step 3: Cleanup
    echo -e "${YELLOW}Step 3/3: Cleaning up...${NC}"
    cleanup

    echo -e "${GREEN}All services updated${NC}"
}

# Show stack status
show_status() {
    echo -e "${BLUE}=== Stack Services ===${NC}"
    docker stack services "$STACK_NAME"

    echo ""
    echo -e "${BLUE}=== Service Tasks ===${NC}"
    docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null | head -30
}

# Show logs
show_logs() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        echo "Usage: $0 logs <service_name>"
        exit 1
    fi
    docker service logs "${STACK_NAME}_${SERVICE}" --tail 100 -f
}

# Rollback service
rollback_service() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        echo "Usage: $0 rollback <service_name>"
        exit 1
    fi

    echo -e "${YELLOW}Rolling back service: ${STACK_NAME}_${SERVICE}...${NC}"
    docker service rollback "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}Service rolled back${NC}"
}

# Scale service
scale_service() {
    SERVICE=$1
    REPLICAS=$2
    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        echo "Usage: $0 scale <service_name> <replicas>"
        exit 1
    fi

    echo -e "${YELLOW}Scaling ${STACK_NAME}_${SERVICE} to ${REPLICAS} replicas...${NC}"
    docker service scale "${STACK_NAME}_${SERVICE}=${REPLICAS}"
    echo -e "${GREEN}Service scaled${NC}"
}

# Remove stack
remove_stack() {
    echo -e "${YELLOW}Removing stack...${NC}"
    docker stack rm "$STACK_NAME"
    echo -e "${GREEN}Stack removed${NC}"
}

# Run Laravel commands
artisan() {
    CONTAINER=$(docker ps -qf "name=${STACK_NAME}_php" | head -1)
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}PHP container not found${NC}"
        exit 1
    fi
    docker exec -it "$CONTAINER" php artisan "$@"
}

# Post-deploy fixes (run after fresh deployment)
post_deploy() {
    echo -e "${YELLOW}Running post-deployment fixes...${NC}"
    cd "$DOCKER_DIR"

    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 30

    # Get PHP container
    CONTAINER=$(docker ps -qf "name=${STACK_NAME}_php" | head -1)
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}PHP container not found, waiting more...${NC}"
        sleep 30
        CONTAINER=$(docker ps -qf "name=${STACK_NAME}_php" | head -1)
    fi

    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}PHP container still not found. Please check services.${NC}"
        exit 1
    fi

    # Load APP_KEY from .env if exists
    if [ -f .env ]; then
        APP_KEY=$(grep APP_KEY .env | cut -d= -f2)
        if [ -n "$APP_KEY" ]; then
            echo -e "${YELLOW}Updating services with APP_KEY...${NC}"
            docker service update --env-add APP_KEY="$APP_KEY" --force "${STACK_NAME}_php"
            docker service update --env-add APP_KEY="$APP_KEY" --force "${STACK_NAME}_queue-worker"
            docker service update --env-add APP_KEY="$APP_KEY" --force "${STACK_NAME}_scheduler"
            sleep 15
            CONTAINER=$(docker ps -qf "name=${STACK_NAME}_php" | head -1)
        fi
    fi

    # Run migrations
    echo -e "${YELLOW}Running migrations...${NC}"
    docker exec "$CONTAINER" php artisan migrate --force || true

    # Seed database if fresh install
    if [ "$1" = "--seed" ]; then
        echo -e "${YELLOW}Seeding database...${NC}"
        docker exec "$CONTAINER" php artisan db:seed --force || true
    fi

    # Generate Passport keys
    echo -e "${YELLOW}Generating Passport keys...${NC}"
    docker exec "$CONTAINER" php artisan passport:keys --force || true
    docker exec "$CONTAINER" bash -c "chown www-data:www-data /var/www/backend/storage/oauth-*.key 2>/dev/null" || true
    docker exec "$CONTAINER" bash -c "chmod 600 /var/www/backend/storage/oauth-private.key 2>/dev/null" || true

    # Create Passport client if not exists
    echo -e "${YELLOW}Creating Passport personal access client...${NC}"
    docker exec "$CONTAINER" php artisan passport:client --personal --name="ImmoGuinée Personal Access Client" 2>/dev/null || echo "Client may already exist"

    # Fix OAuth tables for UUID support
    echo -e "${YELLOW}Fixing OAuth tables for UUID support...${NC}"
    POSTGRES_CONTAINER=$(docker ps -qf "name=${STACK_NAME}_postgres" | head -1)
    if [ -n "$POSTGRES_CONTAINER" ]; then
        docker exec "$POSTGRES_CONTAINER" psql -U immog_user -d immog_db -c "
            DO \$\$
            BEGIN
                -- Check and alter user_id columns to uuid if they are bigint
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth_access_tokens' AND column_name = 'user_id' AND data_type = 'bigint') THEN
                    ALTER TABLE oauth_access_tokens ALTER COLUMN user_id TYPE uuid USING NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth_auth_codes' AND column_name = 'user_id' AND data_type = 'bigint') THEN
                    ALTER TABLE oauth_auth_codes ALTER COLUMN user_id TYPE uuid USING NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth_clients' AND column_name = 'user_id' AND data_type = 'bigint') THEN
                    ALTER TABLE oauth_clients ALTER COLUMN user_id TYPE uuid USING NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'OAuth tables already have correct types or error occurred';
            END \$\$;
        " 2>/dev/null || echo "OAuth table fix may have already been applied"
    fi

    # Clear and rebuild caches
    echo -e "${YELLOW}Rebuilding caches...${NC}"
    docker exec "$CONTAINER" php artisan config:cache || true
    docker exec "$CONTAINER" php artisan route:cache || true

    # Setup WAHA configuration
    echo -e "${YELLOW}Configuring WAHA...${NC}"
    setup_waha

    echo -e "${GREEN}Post-deployment fixes completed!${NC}"
}

# Setup WAHA (WhatsApp API) configuration
setup_waha() {
    echo -e "${YELLOW}Setting up WAHA...${NC}"
    cd "$DOCKER_DIR"

    # Load WAHA_API_KEY from .env if exists
    if [ -f .env ]; then
        WAHA_API_KEY=$(grep WAHA_API_KEY .env | cut -d= -f2)
    fi

    # Require WAHA_API_KEY from environment - DO NOT use hardcoded defaults for security
    if [ -z "$WAHA_API_KEY" ]; then
        echo -e "${RED}ERROR: WAHA_API_KEY not found in .env file or environment${NC}"
        echo -e "${YELLOW}Please set WAHA_API_KEY in your .env file${NC}"
        return 1
    fi

    # Update WAHA service with correct environment variables
    echo -e "${YELLOW}Updating WAHA service...${NC}"
    docker service update \
        --env-add WAHA_API_KEY="$WAHA_API_KEY" \
        --env-add WHATSAPP_API_KEY="$WAHA_API_KEY" \
        --env-add WHATSAPP_HOOK_URL="http://${STACK_NAME}_nginx/api/webhooks/waha" \
        --env-add WHATSAPP_HOOK_EVENTS="message,message.any,message.ack,session.status" \
        --force "${STACK_NAME}_waha" 2>/dev/null || echo "WAHA service update may have failed"

    # Update PHP services with WAHA configuration
    echo -e "${YELLOW}Updating PHP services with WAHA config...${NC}"
    docker service update \
        --env-add WAHA_URL="http://${STACK_NAME}_waha:3000" \
        --env-add WAHA_API_KEY="$WAHA_API_KEY" \
        --env-add WAHA_SESSION_NAME="default" \
        --force "${STACK_NAME}_php" 2>/dev/null || true

    docker service update \
        --env-add WAHA_URL="http://${STACK_NAME}_waha:3000" \
        --env-add WAHA_API_KEY="$WAHA_API_KEY" \
        --env-add WAHA_SESSION_NAME="default" \
        --force "${STACK_NAME}_queue-worker" 2>/dev/null || true

    # Wait for WAHA to be ready
    echo -e "${YELLOW}Waiting for WAHA to be ready...${NC}"
    sleep 20

    # Create default session
    WAHA_CONTAINER=$(docker ps -qf "name=${STACK_NAME}_waha" | head -1)
    if [ -n "$WAHA_CONTAINER" ]; then
        echo -e "${YELLOW}Creating WAHA default session...${NC}"
        docker exec "$WAHA_CONTAINER" curl -s -X POST \
            -H "X-Api-Key: $WAHA_API_KEY" \
            -H "Content-Type: application/json" \
            http://localhost:3000/api/sessions/start \
            -d "{\"name\": \"default\", \"config\": {\"webhooks\": [{\"url\": \"http://${STACK_NAME}_nginx/api/webhooks/waha\", \"events\": [\"message\", \"message.ack\", \"session.status\"]}]}}" 2>/dev/null || echo "Session may already exist"
    fi

    echo -e "${GREEN}WAHA configuration completed${NC}"
}

# Fix database credentials mismatch
# SECURITY: Credentials are read from Docker Secrets, not hardcoded
fix_db_credentials() {
    echo -e "${YELLOW}Fixing database credentials...${NC}"

    # Read credentials from .env or environment - DO NOT hardcode
    if [ -f .env ]; then
        DB_USERNAME=$(grep DB_USERNAME .env | cut -d= -f2)
        DB_DATABASE=$(grep DB_DATABASE .env | cut -d= -f2)
    fi

    DB_USERNAME="${DB_USERNAME:-immog_user}"
    DB_DATABASE="${DB_DATABASE:-immog_db}"

    echo -e "${YELLOW}Note: DB_PASSWORD should be managed via Docker Secrets${NC}"
    echo -e "${YELLOW}Services will use /run/secrets/db_password${NC}"

    # Only update username and database - password comes from secrets
    docker service update \
        --env-add DB_USERNAME="$DB_USERNAME" \
        --env-add DB_DATABASE="$DB_DATABASE" \
        --env-add DB_PASSWORD_FILE="/run/secrets/db_password" \
        --force "${STACK_NAME}_php"

    docker service update \
        --env-add DB_USERNAME="$DB_USERNAME" \
        --env-add DB_DATABASE="$DB_DATABASE" \
        --env-add DB_PASSWORD_FILE="/run/secrets/db_password" \
        --force "${STACK_NAME}_queue-worker"

    docker service update \
        --env-add DB_USERNAME="$DB_USERNAME" \
        --env-add DB_DATABASE="$DB_DATABASE" \
        --env-add DB_PASSWORD_FILE="/run/secrets/db_password" \
        --force "${STACK_NAME}_scheduler"

    echo -e "${GREEN}Database credentials fixed (using Docker Secrets)${NC}"
}

# Main menu
case "$1" in
    "init")
        check_permissions
        init_swarm
        ;;
    "build")
        build_images
        ;;
    "deploy")
        check_permissions
        deploy_stack
        ;;
    "full")
        check_permissions
        init_swarm
        build_images
        deploy_stack
        show_status
        ;;
    "update")
        update_service "$2"
        ;;
    "update-frontend")
        update_frontend
        ;;
    "update-backend")
        update_backend
        ;;
    "update-all")
        update_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "rollback")
        rollback_service "$2"
        ;;
    "scale")
        scale_service "$2" "$3"
        ;;
    "remove")
        remove_stack
        ;;
    "artisan")
        shift
        artisan "$@"
        ;;
    "post-deploy")
        post_deploy "$2"
        ;;
    "fix-db")
        fix_db_credentials
        ;;
    "setup-waha")
        setup_waha
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {command}"
        echo ""
        echo "Commands:"
        echo "  init            - Initialize Docker Swarm"
        echo "  build           - Build Docker images"
        echo "  deploy          - Deploy stack to Swarm"
        echo "  full            - Full deployment (init + build + deploy)"
        echo ""
        echo "  update-frontend - Update frontend (zero downtime)"
        echo "  update-backend  - Update PHP services"
        echo "  update-all      - Update all services"
        echo "  update SERVICE  - Force update a specific service"
        echo ""
        echo "  status          - Show stack status"
        echo "  logs SERVICE    - Show service logs"
        echo "  rollback SERVICE - Rollback service to previous version"
        echo "  scale SERVICE N - Scale service to N replicas"
        echo "  remove          - Remove stack"
        echo ""
        echo "  artisan CMD     - Run Laravel artisan command"
        echo "  post-deploy     - Run post-deployment fixes (migrations, passport, etc.)"
        echo "  post-deploy --seed - Run post-deployment fixes with database seeding"
        echo "  fix-db          - Fix database credentials if connection fails"
        echo "  setup-waha      - Configure WAHA (WhatsApp API) service"
        echo "  cleanup         - Remove stopped containers and unused images"
        echo ""
        echo "Examples:"
        echo "  $0 full                    # First time deployment"
        echo "  $0 post-deploy --seed      # Run after fresh deployment"
        echo "  $0 update-frontend         # Update frontend after git pull"
        echo "  $0 scale frontend 3        # Scale frontend to 3 replicas"
        echo "  $0 logs frontend           # View frontend logs"
        echo "  $0 artisan migrate         # Run migrations"
        echo "  $0 setup-waha              # Configure WhatsApp notifications"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
