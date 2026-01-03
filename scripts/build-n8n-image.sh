#!/bin/bash
# Build custom n8n image with SSH client
# This image is required for Execute Command nodes to SSH to the host

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building custom n8n image with SSH client..."
docker build -t immoguinee/n8n:latest "$PROJECT_DIR/docker/n8n"

echo "Image built successfully: immoguinee/n8n:latest"
echo ""
echo "To update the running service:"
echo "  docker service update --image immoguinee/n8n:latest immog_n8n"
