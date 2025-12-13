#!/bin/bash
# ==============================================
# ImmoGuinée - Production Deployment Script
# Server: 3.93.74.117 | Domain: immoguinee.com
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="3.93.74.117"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/immoguinee.pem"
PROJECT_NAME="immoguinee"
REMOTE_PATH="/home/ubuntu/immoguinee"
DOCKER_REGISTRY=""  # Leave empty for local builds

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ImmoGuinée Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to run commands on server
run_remote() {
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy files to server
copy_to_server() {
    scp -i "$SSH_KEY" -r "$1" "$SERVER_USER@$SERVER_IP:$2"
}

# Check SSH key
check_ssh() {
    echo -e "${YELLOW}Checking SSH connection...${NC}"
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'Connected'" 2>/dev/null; then
        echo -e "${RED}Cannot connect to server. Check SSH key and server IP.${NC}"
        exit 1
    fi
    echo -e "${GREEN}SSH connection OK${NC}"
}

# Install Docker on server
install_docker() {
    echo -e "${YELLOW}Installing Docker on server...${NC}"
    run_remote "
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker ubuntu
            sudo systemctl enable docker
            sudo systemctl start docker
            echo 'Docker installed successfully'
        else
            echo 'Docker already installed'
        fi
    "
}

# Initialize Docker Swarm
init_swarm() {
    echo -e "${YELLOW}Initializing Docker Swarm...${NC}"
    run_remote "
        if ! docker info | grep -q 'Swarm: active'; then
            docker swarm init --advertise-addr $SERVER_IP
            echo 'Swarm initialized'
        else
            echo 'Swarm already active'
        fi
    "
}

# Create project directory
create_directories() {
    echo -e "${YELLOW}Creating project directories...${NC}"
    run_remote "
        mkdir -p $REMOTE_PATH
        mkdir -p $REMOTE_PATH/docker/nginx/sites
        mkdir -p $REMOTE_PATH/backend
        mkdir -p $REMOTE_PATH/frontend
    "
}

# Copy project files
copy_files() {
    echo -e "${YELLOW}Copying project files to server...${NC}"

    # Copy docker configs
    copy_to_server "docker-compose.prod.yml" "$REMOTE_PATH/"
    copy_to_server ".env.production" "$REMOTE_PATH/.env"
    copy_to_server "docker/nginx" "$REMOTE_PATH/docker/"
    copy_to_server "docker/php" "$REMOTE_PATH/docker/"

    # Copy backend
    echo -e "${YELLOW}Copying backend files...${NC}"
    rsync -avz --progress -e "ssh -i $SSH_KEY" \
        --exclude='vendor' \
        --exclude='node_modules' \
        --exclude='storage/logs/*' \
        --exclude='storage/framework/cache/*' \
        --exclude='storage/framework/sessions/*' \
        --exclude='storage/framework/views/*' \
        --exclude='.env' \
        --exclude='tests' \
        backend/ "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/backend/"

    # Copy frontend
    echo -e "${YELLOW}Copying frontend files...${NC}"
    rsync -avz --progress -e "ssh -i $SSH_KEY" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='coverage' \
        --exclude='.env*' \
        frontend/ "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/frontend/"

    echo -e "${GREEN}Files copied successfully${NC}"
}

# Build Docker images on server
build_images() {
    echo -e "${YELLOW}Building Docker images on server...${NC}"
    run_remote "
        cd $REMOTE_PATH

        # Build PHP image
        echo 'Building PHP image...'
        docker build -t immoguinee/php:latest -f docker/php/Dockerfile backend/

        # Build Frontend image
        echo 'Building Frontend image...'
        docker build -t immoguinee/frontend:latest \
            --build-arg NEXT_PUBLIC_API_URL=https://api.immoguinee.com \
            --build-arg NEXT_PUBLIC_APP_URL=https://immoguinee.com \
            frontend/

        echo 'Images built successfully'
    "
}

# Deploy stack
deploy_stack() {
    echo -e "${YELLOW}Deploying Docker Stack...${NC}"
    run_remote "
        cd $REMOTE_PATH

        # Load environment variables
        export \$(cat .env | grep -v '^#' | xargs)

        # Deploy stack
        docker stack deploy -c docker-compose.prod.yml immog

        echo 'Stack deployed'
    "
}

# Run Laravel setup
setup_laravel() {
    echo -e "${YELLOW}Setting up Laravel...${NC}"
    run_remote "
        # Wait for PHP container to be ready
        sleep 30

        # Get PHP container ID
        PHP_CONTAINER=\$(docker ps -qf 'name=immog_php')

        if [ -n \"\$PHP_CONTAINER\" ]; then
            # Generate app key if not set
            docker exec \$PHP_CONTAINER php artisan key:generate --force

            # Run migrations
            docker exec \$PHP_CONTAINER php artisan migrate --force

            # Clear and cache config
            docker exec \$PHP_CONTAINER php artisan config:cache
            docker exec \$PHP_CONTAINER php artisan route:cache
            docker exec \$PHP_CONTAINER php artisan view:cache

            # Setup Passport
            docker exec \$PHP_CONTAINER php artisan passport:keys --force

            # Create storage link
            docker exec \$PHP_CONTAINER php artisan storage:link

            echo 'Laravel setup complete'
        else
            echo 'PHP container not found, skipping Laravel setup'
        fi
    "
}

# Create MinIO buckets
setup_minio() {
    echo -e "${YELLOW}Setting up MinIO buckets...${NC}"
    run_remote "
        # Wait for MinIO to be ready
        sleep 20

        MINIO_CONTAINER=\$(docker ps -qf 'name=immog_minio')

        if [ -n \"\$MINIO_CONTAINER\" ]; then
            docker exec \$MINIO_CONTAINER mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD
            docker exec \$MINIO_CONTAINER mc mb local/listings --ignore-existing
            docker exec \$MINIO_CONTAINER mc anonymous set download local/listings
            echo 'MinIO buckets created'
        fi
    "
}

# Show deployment status
show_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Deployment Status${NC}"
    echo -e "${BLUE}========================================${NC}"
    run_remote "
        echo '=== Docker Services ==='
        docker service ls

        echo ''
        echo '=== Service Replicas ==='
        docker stack ps immog --no-trunc 2>/dev/null | head -20
    "

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "URLs:"
    echo -e "  Frontend:  ${BLUE}https://immoguinee.com${NC}"
    echo -e "  API:       ${BLUE}https://api.immoguinee.com${NC}"
    echo -e "  Grafana:   ${BLUE}https://grafana.immoguinee.com${NC}"
    echo -e "  n8n:       ${BLUE}https://n8n.immoguinee.com${NC}"
    echo -e "  MinIO:     ${BLUE}https://minio.immoguinee.com${NC}"
    echo -e "  Traefik:   ${BLUE}https://traefik.immoguinee.com${NC}"
    echo ""
}

# Rollback deployment
rollback() {
    echo -e "${YELLOW}Rolling back deployment...${NC}"
    run_remote "
        docker stack rm immog
        echo 'Stack removed. Deploy previous version manually.'
    "
}

# Update single service
update_service() {
    SERVICE=$1
    echo -e "${YELLOW}Updating service: $SERVICE${NC}"
    run_remote "
        docker service update --force immog_$SERVICE
    "
}

# View logs
view_logs() {
    SERVICE=$1
    echo -e "${YELLOW}Viewing logs for: $SERVICE${NC}"
    run_remote "
        docker service logs immog_$SERVICE --tail 100 -f
    "
}

# Main menu
case "$1" in
    "full")
        check_ssh
        install_docker
        init_swarm
        create_directories
        copy_files
        build_images
        deploy_stack
        setup_laravel
        setup_minio
        show_status
        ;;
    "update")
        check_ssh
        copy_files
        build_images
        deploy_stack
        show_status
        ;;
    "deploy")
        check_ssh
        deploy_stack
        show_status
        ;;
    "build")
        check_ssh
        copy_files
        build_images
        ;;
    "status")
        check_ssh
        show_status
        ;;
    "rollback")
        check_ssh
        rollback
        ;;
    "logs")
        check_ssh
        view_logs "$2"
        ;;
    "setup-laravel")
        check_ssh
        setup_laravel
        ;;
    *)
        echo "Usage: $0 {full|update|deploy|build|status|rollback|logs|setup-laravel}"
        echo ""
        echo "Commands:"
        echo "  full          - Full deployment (first time)"
        echo "  update        - Update files, rebuild, and redeploy"
        echo "  deploy        - Deploy existing images"
        echo "  build         - Copy files and build images only"
        echo "  status        - Show deployment status"
        echo "  rollback      - Remove stack"
        echo "  logs SERVICE  - View service logs"
        echo "  setup-laravel - Run Laravel setup commands"
        exit 1
        ;;
esac
