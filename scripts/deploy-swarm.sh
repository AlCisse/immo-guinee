#!/bin/bash
# ===============================================
# ImmoGuinée — Docker Swarm Deployment (stack Rust)
# Cible : docker/docker-compose.swarm.rust.yml
# Usage : ./scripts/deploy-swarm.sh [command]
# ===============================================

# C9 — fail-fast strict : -e (sortie sur erreur) + -o pipefail (sortie si un
# maillon d'un pipeline échoue). Sans pipefail, un `docker info | grep -q
# "Swarm: active"` où docker info échoue laisserait grep renvoyer "no match" et
# l'erreur amont serait silencieuse. On n'ajoute PAS -u : ce script de prod
# référence des vars/env optionnelles qu'on ne peut pas valider à froid.
set -e -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"
COMPOSE_FILE="docker-compose.swarm.rust.yml"
STACK_NAME="immog"

# Image names must match the compose (${DOCKER_REGISTRY:-}immoguinee-{backend,frontend}:${VERSION}).
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-latest}"
BACKEND_IMAGE="${DOCKER_REGISTRY}immoguinee-backend:${VERSION}"
FRONTEND_IMAGE="${DOCKER_REGISTRY}immoguinee-frontend:${VERSION}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ImmoGuinée — Swarm (Rust) : ${COMPOSE_FILE}${NC}"
echo -e "${BLUE}========================================${NC}"

check_permissions() {
    if [[ $EUID -ne 0 ]] && ! docker info &>/dev/null; then
        echo -e "${RED}Lancez avec sudo/root ou avec un accès au daemon Docker${NC}"
        exit 1
    fi
}

# Initialize Docker Swarm
init_swarm() {
    echo -e "${YELLOW}Initialisation de Docker Swarm...${NC}"
    if docker info | grep -q "Swarm: active"; then
        echo -e "${GREEN}Swarm déjà actif${NC}"
    else
        PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
        docker swarm init --advertise-addr "$PUBLIC_IP" || docker swarm init
        echo -e "${GREEN}Swarm initialisé${NC}"
    fi
}

# Build images (backend Rust + frontend Next). Pour la prod, build en --release
# (voir rust-backend/Dockerfile). --no-cache pour forcer un rebuild propre.
build_images() {
    echo -e "${YELLOW}Build des images...${NC}"
    cd "$PROJECT_DIR"

    echo -e "${YELLOW}Backend (Rust/Axum) → ${BACKEND_IMAGE}${NC}"
    docker build --no-cache -t "$BACKEND_IMAGE" -f rust-backend/Dockerfile rust-backend/

    echo -e "${YELLOW}Frontend (Next.js) → ${FRONTEND_IMAGE}${NC}"
    docker build --no-cache -t "$FRONTEND_IMAGE" \
        --build-arg NEXT_PUBLIC_API_URL=/api \
        -f frontend/Dockerfile frontend/

    echo -e "${GREEN}Images construites${NC}"
}

# Deploy stack (compose Rust unique). Les variables d'env (VAULT_ROLE_ID,
# DOCKER_REGISTRY, VERSION) sont lues depuis docker/.env si présent.
deploy_stack() {
    echo -e "${YELLOW}Déploiement de la stack...${NC}"
    cd "$DOCKER_DIR"

    if [ -f .env ]; then
        set -a; . ./.env; set +a
    fi

    DOCKER_REGISTRY="$DOCKER_REGISTRY" VERSION="$VERSION" \
    docker stack deploy \
        -c "$COMPOSE_FILE" \
        --with-registry-auth \
        "$STACK_NAME"

    echo -e "${GREEN}Stack déployée${NC}"
    echo -e "${YELLOW}Rappel : Vault doit être init/unseal et l'AppRole configuré (voir docker/vault/vault.hcl).${NC}"
}

# Force a rolling update of one service
update_service() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Usage: $0 update <service>${NC}"
        echo "Services : backend, frontend, traefik, postgres, redis, minio, evolution, vault, grafana, pgadmin"
        exit 1
    fi
    echo -e "${YELLOW}Mise à jour du service ${STACK_NAME}_${SERVICE}...${NC}"
    docker service update --force "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}Service mis à jour${NC}"
}

cleanup() {
    echo -e "${YELLOW}Nettoyage conteneurs/images inutilisés...${NC}"
    docker container prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    # Garde les 2 dernières versions des images applicatives.
    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
        | grep -E '(^|/)immoguinee-(frontend|backend):' \
        | tail -n +3 | awk '{print $2}' | xargs -r docker rmi 2>/dev/null || true
    echo -e "${GREEN}Nettoyage terminé${NC}"
}

# Update frontend : build + rolling update (zéro coupure, start-first)
update_frontend() {
    echo -e "${YELLOW}Mise à jour frontend...${NC}"
    cd "$PROJECT_DIR"
    docker build --no-cache -t "$FRONTEND_IMAGE" \
        --build-arg NEXT_PUBLIC_API_URL=/api \
        -f frontend/Dockerfile frontend/
    docker service update \
        --image "$FRONTEND_IMAGE" --force \
        --update-parallelism 1 --update-delay 10s \
        --update-failure-action rollback --update-order start-first \
        "${STACK_NAME}_frontend"
    cleanup
    echo -e "${GREEN}Frontend mis à jour${NC}"
}

# Update backend : build + rolling update. Les migrations s'appliquent via `migrate`.
update_backend() {
    echo -e "${YELLOW}Mise à jour backend (Rust)...${NC}"
    cd "$PROJECT_DIR"
    docker build --no-cache -t "$BACKEND_IMAGE" -f rust-backend/Dockerfile rust-backend/
    docker service update \
        --image "$BACKEND_IMAGE" --force \
        --update-parallelism 1 --update-delay 10s \
        --update-failure-action rollback --update-order start-first \
        "${STACK_NAME}_backend"
    cleanup
    echo -e "${GREEN}Backend mis à jour${NC}"
    echo -e "${YELLOW}Si le schéma a changé : ./scripts/deploy-swarm.sh migrate${NC}"
}

update_all() {
    echo -e "${YELLOW}Mise à jour complète...${NC}"
    build_images
    docker service update --image "$BACKEND_IMAGE" --force "${STACK_NAME}_backend"
    docker service update --image "$FRONTEND_IMAGE" --force "${STACK_NAME}_frontend"
    cleanup
    echo -e "${GREEN}Tous les services mis à jour${NC}"
}

# Run SeaORM migrations : re-exécute le service one-shot `migrate` du compose.
migrate() {
    echo -e "${YELLOW}Application des migrations (immog-migrate up)...${NC}"
    docker service update --force "${STACK_NAME}_migrate"
    echo -e "${GREEN}Migrations relancées — suivez : $0 logs migrate${NC}"
}

show_status() {
    echo -e "${BLUE}=== Services ===${NC}"
    docker stack services "$STACK_NAME"
    echo ""
    echo -e "${BLUE}=== Tasks ===${NC}"
    docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null | head -40
}

show_logs() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then echo "Usage: $0 logs <service>"; exit 1; fi
    docker service logs "${STACK_NAME}_${SERVICE}" --tail 100 -f
}

rollback_service() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then echo "Usage: $0 rollback <service>"; exit 1; fi
    echo -e "${YELLOW}Rollback ${STACK_NAME}_${SERVICE}...${NC}"
    docker service rollback "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}Service rollback effectué${NC}"
}

# Scale : uniquement les services applicatifs stateless (backend, frontend).
scale_service() {
    SERVICE=$1; REPLICAS=$2
    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        echo "Usage: $0 scale <service> <replicas>  (backend|frontend)"
        exit 1
    fi
    case "$SERVICE" in
        backend|frontend) ;;
        *) echo -e "${RED}Seuls backend/frontend sont scalables (les autres sont single-instance).${NC}"; exit 1 ;;
    esac
    echo -e "${YELLOW}Scale ${STACK_NAME}_${SERVICE} → ${REPLICAS}...${NC}"
    docker service scale "${STACK_NAME}_${SERVICE}=${REPLICAS}"
    echo -e "${GREEN}Service scalé${NC}"
}

remove_stack() {
    echo -e "${YELLOW}Suppression de la stack...${NC}"
    docker stack rm "$STACK_NAME"
    echo -e "${GREEN}Stack supprimée${NC}"
}

case "$1" in
    "init")            check_permissions; init_swarm ;;
    "build")           build_images ;;
    "deploy")          check_permissions; deploy_stack ;;
    "full")            check_permissions; init_swarm; build_images; deploy_stack; show_status ;;
    "update")          update_service "$2" ;;
    "update-frontend") update_frontend ;;
    "update-backend")  update_backend ;;
    "update-all")      update_all ;;
    "migrate")         migrate ;;
    "status")          show_status ;;
    "logs")            show_logs "$2" ;;
    "rollback")        rollback_service "$2" ;;
    "scale")           scale_service "$2" "$3" ;;
    "remove")          remove_stack ;;
    "cleanup")         cleanup ;;
    *)
        echo "Usage: $0 {command}"
        echo ""
        echo "  init             - Initialise Docker Swarm"
        echo "  build            - Build images backend (Rust) + frontend"
        echo "  deploy           - Déploie la stack (${COMPOSE_FILE})"
        echo "  full             - init + build + deploy + status"
        echo ""
        echo "  update-backend   - Rebuild + rolling update backend (zéro coupure)"
        echo "  update-frontend  - Rebuild + rolling update frontend (zéro coupure)"
        echo "  update-all       - Met à jour backend + frontend"
        echo "  update SERVICE   - Force update d'un service"
        echo "  migrate          - Rejoue les migrations SeaORM (service one-shot)"
        echo ""
        echo "  status           - État de la stack"
        echo "  logs SERVICE     - Logs d'un service (-f)"
        echo "  rollback SERVICE - Rollback d'un service"
        echo "  scale SERVICE N  - Scale backend|frontend à N réplicas"
        echo "  remove           - Supprime la stack"
        echo "  cleanup          - Purge conteneurs/images inutilisés"
        echo ""
        echo "Prérequis prod : Vault init/unseal + AppRole, secrets ./docker/secrets/*,"
        echo "certs d'origine Cloudflare (cf_origin_*), configs postgres_ssl_*."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Terminé !${NC}"
