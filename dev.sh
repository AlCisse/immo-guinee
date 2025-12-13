#!/bin/bash

# ImmoGuinée - Script de développement local
# Facilite les opérations courantes en développement

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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
    error "Docker n'est pas installé."
    exit 1
fi

# Menu
echo "======================================"
echo "  ImmoGuinée - Dev Tools"
echo "======================================"
echo ""
echo "1)  🚀 Démarrer tous les services"
echo "2)  🛑 Arrêter tous les services"
echo "3)  🔄 Redémarrer tous les services"
echo "4)  🏗️  Rebuild et redémarrer"
echo "5)  📊 Afficher les logs"
echo "6)  📈 Voir le status des services"
echo "7)  🧹 Nettoyer (⚠️  supprime les volumes)"
echo "8)  🔧 Backend : Migrations"
echo "9)  🔧 Backend : Créer admin"
echo "10) 🔧 Backend : Cache clear"
echo "11) 🔧 Backend : Tests"
echo "12) 🎨 Frontend : Installer deps"
echo "13) 🎨 Frontend : Build"
echo "14) 🎨 Frontend : Tests"
echo "15) 💾 Backup PostgreSQL"
echo "16) 🗄️  Accéder à PostgreSQL CLI"
echo "17) 📦 Accéder à Redis CLI"
echo "18) 🔍 Vérifier Elasticsearch"
echo "19) 📱 Ouvrir les URLs"
echo "20) 🚪 Quitter"
echo ""
read -p "Votre choix (1-20): " choice

cd docker

case $choice in
    1)
        info "Démarrage de tous les services..."
        docker-compose up -d
        info "✓ Tous les services sont démarrés!"
        echo ""
        info "Frontend: http://localhost:3000"
        info "Backend API: http://localhost:8000/api"
        info "PgAdmin: http://localhost:5050"
        info "Grafana: http://localhost:3001"
        ;;

    2)
        warning "Arrêt de tous les services..."
        docker-compose down
        info "✓ Tous les services sont arrêtés!"
        ;;

    3)
        info "Redémarrage de tous les services..."
        docker-compose restart
        info "✓ Tous les services sont redémarrés!"
        ;;

    4)
        info "Rebuild et redémarrage..."
        docker-compose up -d --build
        info "✓ Rebuild terminé!"
        ;;

    5)
        echo "Quel service ?"
        echo "1) Tous"
        echo "2) Frontend"
        echo "3) Backend (PHP + Nginx)"
        echo "4) PostgreSQL"
        echo "5) Redis"
        echo "6) Elasticsearch"
        read -p "Choix: " log_choice

        case $log_choice in
            1) docker-compose logs -f ;;
            2) docker-compose logs -f frontend ;;
            3) docker-compose logs -f php nginx ;;
            4) docker-compose logs -f postgres ;;
            5) docker-compose logs -f redis ;;
            6) docker-compose logs -f elasticsearch ;;
            *) error "Choix invalide" ;;
        esac
        ;;

    6)
        info "Status des services:"
        docker-compose ps
        ;;

    7)
        error "⚠️  ATTENTION: Cette action va supprimer tous les volumes (données perdues)!"
        read -p "Tapez 'yes' pour confirmer: " confirm
        if [ "$confirm" = "yes" ]; then
            docker-compose down -v
            info "✓ Nettoyage terminé!"
        else
            info "Opération annulée."
        fi
        ;;

    8)
        info "Exécution des migrations..."
        docker-compose exec php php artisan migrate
        info "✓ Migrations terminées!"
        ;;

    9)
        info "Création d'un utilisateur admin..."
        docker-compose exec php php artisan user:create-admin
        ;;

    10)
        info "Nettoyage du cache Laravel..."
        docker-compose exec php php artisan cache:clear
        docker-compose exec php php artisan config:clear
        docker-compose exec php php artisan route:clear
        docker-compose exec php php artisan view:clear
        info "✓ Cache nettoyé!"
        ;;

    11)
        info "Lancement des tests backend..."
        docker-compose exec php php artisan test
        ;;

    12)
        info "Installation des dépendances npm..."
        docker-compose exec frontend npm install
        info "✓ Dépendances installées!"
        ;;

    13)
        info "Build du frontend..."
        docker-compose exec frontend npm run build
        info "✓ Build terminé!"
        ;;

    14)
        info "Lancement des tests frontend..."
        docker-compose exec frontend npm test
        ;;

    15)
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        info "Création du backup: $BACKUP_FILE"
        docker-compose exec -T postgres pg_dump -U immog_user immog_db > "../backups/$BACKUP_FILE"
        info "✓ Backup créé: backups/$BACKUP_FILE"
        ;;

    16)
        info "Connexion à PostgreSQL..."
        docker-compose exec postgres psql -U immog_user -d immog_db
        ;;

    17)
        info "Connexion à Redis..."
        docker-compose exec redis redis-cli -a immog_redis_secret
        ;;

    18)
        info "Vérification d'Elasticsearch..."
        curl -s http://localhost:9200/_cluster/health?pretty
        echo ""
        curl -s http://localhost:9200/_cat/indices?v
        ;;

    19)
        info "Ouverture des URLs dans le navigateur..."

        # Détection de l'OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            open http://localhost:3000
            open http://localhost:3001
            open http://localhost:5050
        elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
            # Windows
            start http://localhost:3000
            start http://localhost:3001
            start http://localhost:5050
        else
            # Linux
            xdg-open http://localhost:3000 2>/dev/null || info "Frontend: http://localhost:3000"
            xdg-open http://localhost:3001 2>/dev/null || info "Grafana: http://localhost:3001"
            xdg-open http://localhost:5050 2>/dev/null || info "PgAdmin: http://localhost:5050"
        fi
        ;;

    20)
        info "Au revoir!"
        exit 0
        ;;

    *)
        error "Choix invalide"
        exit 1
        ;;
esac

echo ""
info "======================================"
info "Opération terminée!"
info "======================================"
