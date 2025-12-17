# Configuration Docker - ImmoGuinée

Ce dossier contient toute la configuration Docker pour le déploiement local de la plateforme ImmoGuinée.

## Structure des fichiers

```
docker/
├── docker-compose.yml          # Orchestration des 18 services
├── php/
│   ├── Dockerfile             # Image PHP 8.3-fpm pour développement local
│   └── php.ini                # Configuration PHP personnalisée
├── nginx/
│   ├── nginx.conf             # Configuration Nginx principale
│   └── sites/                 # Virtual hosts
├── postgres/
│   └── init/                  # Scripts d'initialisation PostgreSQL
├── varnish/
│   └── default.vcl            # Configuration Varnish Cache
├── laravel-echo/
│   └── laravel-echo-server.json  # Configuration WebSocket
├── traefik/
│   └── letsencrypt/           # Certificats SSL
└── README.md                  # Ce fichier
```

## Dockerfiles disponibles

### 1. `/Dockerfile` (racine du projet)
- **Usage**: Déploiement CapRover (production)
- **Base**: `php:8.3-fpm-alpine` (léger, optimisé)
- **Mode**: Production (`composer install --no-dev`)
- **Optimisations**: Layer caching, multi-stage build

### 2. `/docker/php/Dockerfile`
- **Usage**: Docker Compose (développement local)
- **Base**: `php:8.3-fpm` (Debian, plus d'outils)
- **Mode**: Development (`composer install` avec dev dependencies)
- **Outils**: Debugger, profiler, outils de développement

## Services Docker Compose

Le `docker-compose.yml` orchestre 18 services:

### Services Backend (Laravel 11)
- **php**: Application Laravel principale (PHP 8.3-fpm)
- **queue-worker**: Traitement asynchrone des jobs (emails, photos)
- **scheduler**: Tâches planifiées (expiration annonces, indexation)

### Base de données & Cache
- **postgres**: PostgreSQL 15 + PostGIS (données géospatiales)
- **redis**: Redis 7+ (cache, sessions, queues, broadcasting)
- **elasticsearch**: Elasticsearch 8.11 (moteur de recherche)

### Stockage & Fichiers
- **minio**: Stockage S3-compatible (photos, documents, avatars)

### Web & Proxy
- **nginx**: Serveur web (Laravel + Next.js)
- **varnish**: Cache HTTP (accélération)
- **traefik**: Reverse proxy + SSL automatique

### Temps réel & Communication
- **laravel-echo**: WebSocket server (Socket.IO)
- **waha**: API WhatsApp self-hosted

### Automatisation
- **n8n**: Workflow automation (notifications, intégrations)

### Monitoring
- **prometheus**: Collecte de métriques
- **grafana**: Visualisation et dashboards
- **pgadmin**: Interface PostgreSQL

## Démarrage rapide

### 1. Prérequis
```bash
# Vérifier Docker et Docker Compose
docker --version          # >= 20.10
docker-compose --version  # >= 2.0
```

### 2. Configuration environnement
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer les variables importantes
nano .env
```

Variables critiques à configurer:
```env
APP_NAME=ImmoGuinée
APP_URL=http://localhost
DB_PASSWORD=votre_mot_de_passe_securise
REDIS_PASSWORD=votre_mot_de_passe_redis
MINIO_ROOT_PASSWORD=votre_mot_de_passe_minio
```

### 3. Lancer les services
```bash
cd docker
docker-compose up -d
```

### 4. Installation initiale Laravel
```bash
# Accéder au conteneur PHP
docker exec -it immog-php bash

# Installer les dépendances
composer install

# Générer la clé d'application
php artisan key:generate

# Installer Passport (OAuth2)
php artisan passport:install

# Migrer la base de données avec données de test
php artisan migrate --seed

# Indexer Elasticsearch
php artisan listings:index-elasticsearch --fresh

# Sortir du conteneur
exit
```

### 5. Vérifier les services

Tous les services devraient être "healthy":
```bash
docker-compose ps
```

## Accès aux services

| Service | URL | Identifiants par défaut |
|---------|-----|------------------------|
| Application | http://localhost | - |
| API Backend | http://localhost/api | - |
| API Docs | http://localhost/api/documentation | - |
| PgAdmin | http://localhost:5050 | admin@immog.gn / immog_pgadmin_secret |
| MinIO Console | http://localhost:9001 | immog_minio / immog_minio_secret |
| Grafana | http://localhost:3001 | admin / immog_grafana_secret |
| n8n | http://localhost:5678 | admin / immog_n8n_secret |
| Elasticsearch | http://localhost:9200 | - |
| Prometheus | http://localhost:9090 | - |
| Traefik Dashboard | http://localhost:8081 | - |
| Laravel Echo | ws://localhost:6001 | - |

## Commandes utiles

### Gestion des conteneurs
```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Redémarrer un service spécifique
docker-compose restart php

# Voir les logs en temps réel
docker-compose logs -f php

# Voir les logs d'un service
docker-compose logs queue-worker

# Statistiques des conteneurs
docker stats
```

### Accès aux conteneurs
```bash
# Shell dans le conteneur PHP
docker exec -it immog-php bash

# Shell dans PostgreSQL
docker exec -it immog-postgres psql -U immog_user -d immog_db

# Shell dans Redis
docker exec -it immog-redis redis-cli -a immog_redis_secret

# Shell dans Elasticsearch
docker exec -it immog-elasticsearch bash
```

### Artisan depuis l'hôte
```bash
# Exécuter des commandes Artisan sans entrer dans le conteneur
docker exec immog-php php artisan migrate
docker exec immog-php php artisan queue:work
docker exec immog-php php artisan cache:clear
docker exec immog-php php artisan config:cache
```

### Base de données
```bash
# Backup PostgreSQL
docker exec immog-postgres pg_dump -U immog_user immog_db > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
cat backup_20250101.sql | docker exec -i immog-postgres psql -U immog_user -d immog_db

# Réinitialiser complètement la base
docker exec immog-php php artisan migrate:fresh --seed
```

### Queue et Jobs
```bash
# Voir les jobs en échec
docker exec immog-php php artisan queue:failed

# Relancer un job échoué
docker exec immog-php php artisan queue:retry <job-id>

# Relancer tous les jobs échoués
docker exec immog-php php artisan queue:retry all

# Vider la queue
docker exec immog-php php artisan queue:flush
```

### Elasticsearch
```bash
# Vérifier le statut du cluster
curl http://localhost:9200/_cluster/health

# Voir tous les indices
curl http://localhost:9200/_cat/indices?v

# Réindexer les annonces
docker exec immog-php php artisan listings:index-elasticsearch --fresh

# Recherche test
curl -X GET "localhost:9200/listings/_search?q=appartement"
```

### MinIO
```bash
# Installer mc (MinIO Client)
docker run --rm -it --entrypoint=/bin/sh minio/mc

# Configurer l'alias
mc alias set minio http://localhost:9000 immog_minio immog_minio_secret

# Lister les buckets
mc ls minio

# Créer un bucket
mc mb minio/immog-test

# Upload un fichier
mc cp test.jpg minio/immog-listings/
```

## Résolution de problèmes

### Le conteneur PHP ne démarre pas
```bash
# Vérifier les logs
docker-compose logs php

# Reconstruire l'image
docker-compose build --no-cache php
docker-compose up -d php
```

### PostgreSQL refuse les connexions
```bash
# Vérifier que le service est UP
docker-compose ps postgres

# Tester la connexion
docker exec immog-php php artisan tinker
>>> DB::connection()->getPdo();

# Réinitialiser PostgreSQL
docker-compose down
docker volume rm docker_postgres-data
docker-compose up -d postgres
```

### Redis connection failed
```bash
# Vérifier Redis
docker exec immog-redis redis-cli -a immog_redis_secret ping
# Devrait retourner "PONG"

# Vérifier la configuration Laravel
docker exec immog-php php artisan tinker
>>> Redis::ping();
```

### Elasticsearch ne démarre pas (mémoire insuffisante)
```bash
# Augmenter la mémoire virtuelle (Linux)
sudo sysctl -w vm.max_map_count=262144

# Rendre permanent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Windows/Mac: Augmenter la mémoire Docker Desktop
# Settings > Resources > Memory: 4GB minimum
```

### Problèmes de permissions
```bash
# Réparer les permissions Laravel
docker exec immog-php chown -R www-data:www-data /var/www/backend/storage
docker exec immog-php chown -R www-data:www-data /var/www/backend/bootstrap/cache
docker exec immog-php chmod -R 755 /var/www/backend/storage
```

### Varnish ne cache pas
```bash
# Vérifier les stats Varnish
docker exec immog-varnish varnishstat

# Voir les requêtes en temps réel
docker exec immog-varnish varnishlog

# Purger le cache
curl -X PURGE http://localhost:8080/
```

## Variables d'environnement importantes

### Application
```env
APP_NAME=ImmoGuinée
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost
```

### Base de données
```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=immog_db
DB_USERNAME=immog_user
DB_PASSWORD=votre_password
```

### Redis
```env
REDIS_HOST=redis
REDIS_PASSWORD=votre_password
REDIS_PORT=6379
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

### Elasticsearch
```env
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
SCOUT_DRIVER=elasticsearch
```

### MinIO (S3)
```env
AWS_ACCESS_KEY_ID=immog_minio
AWS_SECRET_ACCESS_KEY=votre_password
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=immog-listings
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_ENDPOINT=http://minio:9000
```

### Broadcasting (Laravel Echo)
```env
BROADCAST_DRIVER=redis
LARAVEL_ECHO_SERVER_AUTH_HOST=http://nginx
LARAVEL_ECHO_SERVER_HOST=laravel-echo
LARAVEL_ECHO_SERVER_PORT=6001
```

## Architecture réseau

Tous les services communiquent via le réseau `immog-network` (bridge driver).

Les services internes ne sont pas exposés directement:
- PostgreSQL, Redis, Elasticsearch → accessibles uniquement via le réseau Docker
- PHP-FPM → communique avec Nginx via socket réseau

Les services exposés sur l'hôte:
- Nginx (80, 443) → Application web
- Traefik (80, 443, 8081) → Proxy + Dashboard
- Services de monitoring et admin (ports > 3000)

## Volumes persistants

Les données sont stockées dans des volumes Docker nommés:

```yaml
volumes:
  postgres-data:        # Base de données
  redis-data:           # Cache et queues
  elasticsearch-data:   # Index de recherche
  minio-data:           # Fichiers uploadés
  n8n-data:             # Workflows n8n
  grafana-data:         # Dashboards Grafana
  prometheus-data:      # Métriques
```

Backup des volumes:
```bash
# Backup d'un volume
docker run --rm -v docker_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restaurer un volume
docker run --rm -v docker_postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Performance et optimisation

### PHP-FPM
- OPcache activé (voir `docker/php/php.ini`)
- Memory limit: 512M
- Max execution time: 300s

### Redis
- Persistence AOF activée
- Password protection
- Max memory: selon la RAM disponible

### PostgreSQL
- Shared buffers: 256MB
- Effective cache size: 1GB
- Max connections: 100

### Varnish
- Cache size: 256MB
- Purge automatique via Nginx

## Monitoring

### Prometheus cibles
- Laravel metrics (via package)
- PostgreSQL exporter
- Redis exporter
- Nginx exporter

### Grafana dashboards
Importez les dashboards depuis `monitoring/grafana/dashboards/`:
- Laravel Application Metrics
- PostgreSQL Database Stats
- Redis Performance
- Nginx Traffic

## Sécurité

### Recommandations production
1. Changer TOUS les mots de passe par défaut
2. Désactiver les interfaces d'admin non nécessaires
3. Utiliser des secrets Docker Swarm au lieu de .env
4. Activer le firewall et n'exposer que les ports nécessaires
5. Configurer SSL/TLS avec Let's Encrypt via Traefik
6. Limiter les connexions PostgreSQL et Redis par IP

### Secrets à générer
```bash
# Générer un mot de passe sécurisé
openssl rand -base64 32
```

## Support

Pour plus d'informations, consultez:
- `DEPLOYMENT.md` - Guide de déploiement complet
- `README.md` - Documentation générale du projet
- `.env.example` - Liste complète des variables d'environnement

En cas de problème, ouvrez une issue sur le repository du projet.
