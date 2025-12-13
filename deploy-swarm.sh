#!/bin/bash

# ImmoGuinée - Script de déploiement Docker Swarm
# Ce script déploie l'infrastructure complète sur Docker Swarm

set -e

echo "=========================================="
echo "ImmoGuinée - Déploiement Docker Swarm"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Swarm est initialisé
if ! docker info | grep -q "Swarm: active"; then
    warning "Docker Swarm n'est pas initialisé."
    read -p "Voulez-vous initialiser Docker Swarm maintenant ? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Initialisation de Docker Swarm..."
        docker swarm init
    else
        error "Docker Swarm doit être initialisé pour continuer."
        exit 1
    fi
fi

# Vérifier les fichiers nécessaires
if [ ! -f "docker-compose.swarm.yml" ]; then
    error "Le fichier docker-compose.swarm.yml est manquant."
    exit 1
fi

# Variables d'environnement
STACK_NAME="immog"
COMPOSE_FILE="docker-compose.swarm.yml"

# Menu interactif
echo ""
echo "Que voulez-vous faire ?"
echo "1) Déployer/Mettre à jour le stack complet"
echo "2) Déployer uniquement le frontend"
echo "3) Déployer uniquement le backend"
echo "4) Arrêter le stack"
echo "5) Supprimer le stack"
echo "6) Afficher les logs"
echo "7) Afficher le status"
echo "8) Scaler les services"
echo "9) Quitter"
echo ""
read -p "Votre choix (1-9): " choice

case $choice in
    1)
        info "Déploiement du stack complet..."

        # Build des images si nécessaire
        info "Construction des images Docker..."

        # Build frontend
        if [ -d "frontend" ]; then
            info "Build du frontend Next.js..."
            docker build -t immog-frontend:latest \
                --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost/api} \
                --build-arg NEXT_PUBLIC_ECHO_HOST=${NEXT_PUBLIC_ECHO_HOST:-localhost} \
                --build-arg NEXT_PUBLIC_ECHO_PORT=${NEXT_PUBLIC_ECHO_PORT:-6001} \
                ./frontend
        fi

        # Build backend PHP si Dockerfile existe
        if [ -f "Dockerfile.php" ]; then
            info "Build du backend PHP..."
            docker build -t immog-php:latest -f Dockerfile.php .
        fi

        # Déploiement du stack
        info "Déploiement du stack sur Docker Swarm..."
        docker stack deploy -c $COMPOSE_FILE $STACK_NAME

        info "✓ Déploiement terminé!"
        echo ""
        info "Pour voir le status : docker stack services $STACK_NAME"
        info "Pour voir les logs : docker service logs -f ${STACK_NAME}_frontend"
        ;;

    2)
        info "Déploiement du frontend uniquement..."

        if [ ! -d "frontend" ]; then
            error "Le dossier frontend n'existe pas."
            exit 1
        fi

        info "Build du frontend Next.js..."
        docker build -t immog-frontend:latest \
            --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost/api} \
            --build-arg NEXT_PUBLIC_ECHO_HOST=${NEXT_PUBLIC_ECHO_HOST:-localhost} \
            --build-arg NEXT_PUBLIC_ECHO_PORT=${NEXT_PUBLIC_ECHO_PORT:-6001} \
            ./frontend

        info "Mise à jour du service frontend..."
        docker service update --image immog-frontend:latest ${STACK_NAME}_frontend

        info "✓ Frontend mis à jour!"
        ;;

    3)
        info "Déploiement du backend uniquement..."

        if [ ! -f "Dockerfile.php" ]; then
            error "Le fichier Dockerfile.php n'existe pas."
            exit 1
        fi

        info "Build du backend PHP..."
        docker build -t immog-php:latest -f Dockerfile.php .

        info "Mise à jour des services backend..."
        docker service update --image immog-php:latest ${STACK_NAME}_php
        docker service update --image immog-php:latest ${STACK_NAME}_queue-worker
        docker service update --image immog-php:latest ${STACK_NAME}_scheduler

        info "✓ Backend mis à jour!"
        ;;

    4)
        warning "Arrêt du stack $STACK_NAME..."
        docker stack rm $STACK_NAME
        info "✓ Stack arrêté. Les volumes de données sont préservés."
        ;;

    5)
        error "ATTENTION : Cette action va supprimer le stack ET les volumes de données!"
        read -p "Êtes-vous sûr ? Tapez 'yes' pour confirmer : " confirm

        if [ "$confirm" = "yes" ]; then
            warning "Suppression du stack..."
            docker stack rm $STACK_NAME

            sleep 5  # Attendre que les conteneurs soient arrêtés

            warning "Suppression des volumes..."
            docker volume rm ${STACK_NAME}_postgres-data ${STACK_NAME}_redis-data \
                ${STACK_NAME}_elasticsearch-data ${STACK_NAME}_minio-data \
                ${STACK_NAME}_n8n-data ${STACK_NAME}_traefik-certificates \
                ${STACK_NAME}_traefik-logs 2>/dev/null || true

            info "✓ Stack et volumes supprimés!"
        else
            info "Opération annulée."
        fi
        ;;

    6)
        echo "Quel service voulez-vous consulter ?"
        echo "1) Frontend"
        echo "2) PHP-FPM"
        echo "3) Nginx"
        echo "4) PostgreSQL"
        echo "5) Redis"
        echo "6) Elasticsearch"
        echo "7) Traefik"
        echo "8) Tous les services"
        read -p "Votre choix (1-8): " service_choice

        case $service_choice in
            1) docker service logs -f ${STACK_NAME}_frontend ;;
            2) docker service logs -f ${STACK_NAME}_php ;;
            3) docker service logs -f ${STACK_NAME}_nginx ;;
            4) docker service logs -f ${STACK_NAME}_postgres ;;
            5) docker service logs -f ${STACK_NAME}_redis ;;
            6) docker service logs -f ${STACK_NAME}_elasticsearch ;;
            7) docker service logs -f ${STACK_NAME}_traefik ;;
            8) docker stack ps $STACK_NAME ;;
            *) error "Choix invalide" ;;
        esac
        ;;

    7)
        info "Status du stack $STACK_NAME:"
        echo ""
        docker stack services $STACK_NAME
        echo ""
        info "Détails des tâches:"
        docker stack ps $STACK_NAME --no-trunc
        ;;

    8)
        echo "Quel service voulez-vous scaler ?"
        echo "1) Frontend"
        echo "2) PHP-FPM"
        echo "3) Nginx"
        read -p "Votre choix (1-3): " scale_choice
        read -p "Nombre de réplicas : " replicas

        case $scale_choice in
            1) docker service scale ${STACK_NAME}_frontend=$replicas ;;
            2) docker service scale ${STACK_NAME}_php=$replicas ;;
            3) docker service scale ${STACK_NAME}_nginx=$replicas ;;
            *) error "Choix invalide" ;;
        esac
        ;;

    9)
        info "Au revoir!"
        exit 0
        ;;

    *)
        error "Choix invalide"
        exit 1
        ;;
esac

echo ""
info "=========================================="
info "Opération terminée!"
info "=========================================="
