#!/bin/bash
# ===============================================
# ImmoGuinée - Simple Deployment Script
# Run on server: ./scripts/deploy.sh
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"

echo -e "${YELLOW}=== ImmoGuinée Deployment ===${NC}"
echo "Project: $PROJECT_DIR"

# Go to project directory
cd "$PROJECT_DIR"

# 1. Pull latest code
echo -e "${YELLOW}[1/5] Pulling latest code...${NC}"
git pull || {
    echo -e "${RED}Git pull failed. Resolving conflicts...${NC}"
    git stash
    git pull
    echo -e "${YELLOW}Note: Your local changes were stashed${NC}"
}

# 2. Build frontend image
echo -e "${YELLOW}[2/5] Building frontend image...${NC}"
docker build -t immoguinee/frontend:latest \
    --build-arg NEXT_PUBLIC_API_URL=/api \
    -f frontend/Dockerfile frontend/

# 3. Stop and remove old frontend container
echo -e "${YELLOW}[3/5] Updating frontend container...${NC}"
docker stop immog-frontend 2>/dev/null || true
docker rm immog-frontend 2>/dev/null || true

# 4. Start new frontend container
echo -e "${YELLOW}[4/5] Starting new frontend...${NC}"
cd "$DOCKER_DIR"

# Get the network name (docker compose prefixes it)
NETWORK=$(docker network ls --format '{{.Name}}' | grep immog-network | head -1)
if [ -z "$NETWORK" ]; then
    NETWORK="docker_immog-network"
fi

docker run -d \
    --name immog-frontend \
    --network "$NETWORK" \
    -e NODE_ENV=production \
    -e NEXT_PUBLIC_API_URL=/api \
    --restart unless-stopped \
    immoguinee/frontend:latest

# 5. Verify deployment
echo -e "${YELLOW}[5/5] Verifying deployment...${NC}"
sleep 5

if docker ps | grep -q immog-frontend; then
    # Check if frontend is responding
    if docker exec immog-frontend node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" 2>/dev/null; then
        echo -e "${GREEN}✓ Frontend is running and healthy${NC}"
    else
        echo -e "${YELLOW}! Frontend started but health check pending${NC}"
        echo "  Logs: docker logs immog-frontend --tail 20"
    fi
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    docker logs immog-frontend --tail 30
    exit 1
fi

# Reload Traefik config
docker exec immog-traefik kill -HUP 1 2>/dev/null || docker restart immog-traefik

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Site: https://immoguinee.com"
