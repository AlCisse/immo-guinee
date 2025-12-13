# Guide de Deploiement ImmoGuinee - Production

Ce guide couvre le deploiement complet de la plateforme ImmoGuinee avec Docker Swarm, Cloudflare SSL, et haute disponibilite.

---

## Table des matieres

1. [Architecture Production](#architecture-production)
2. [Pre-requis Serveur](#pre-requis-serveur)
3. [Configuration DNS Cloudflare](#configuration-dns-cloudflare)
4. [Installation Docker Swarm](#installation-docker-swarm)
5. [Deploiement des Services](#deploiement-des-services)
6. [Configuration Post-Deploiement](#configuration-post-deploiement)
7. [Monitoring et Maintenance](#monitoring-et-maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Production

```
                                    Internet
                                        |
                                   Cloudflare
                                   (SSL + CDN)
                                        |
                              +---------+---------+
                              |    Load Balancer  |
                              |     (Traefik)     |
                              +---------+---------+
                                        |
        +---------------+---------------+---------------+
        |               |               |               |
   +----+----+     +----+----+     +----+----+     +----+----+
   | Frontend|     | Frontend|     |  Nginx  |     |  Nginx  |
   | Replica1|     | Replica2|     | Replica1|     | Replica2|
   +---------+     +---------+     +---------+     +---------+
                                        |
                              +---------+---------+
                              |      PHP-FPM      |
                              |    (2 replicas)   |
                              +---------+---------+
                                        |
        +---------------+---------------+---------------+
        |               |               |               |
   +----+----+     +----+----+     +----+----+     +----+----+
   |PostgreSQL|    |  Redis  |     |  MinIO  |     |  n8n    |
   | (Master) |    | (Cache) |     |(Storage)|     |(Workflow|
   +---------+     +---------+     +---------+     +---------+
```

### Services et Replicas

| Service | Replicas | Port Interne | Description |
|---------|----------|--------------|-------------|
| traefik | 1 | 80, 443, 8080 | Reverse proxy + SSL |
| frontend | 2 | 3000 | Next.js application |
| nginx | 2 | 80 | Serveur web Laravel |
| php | 2 | 9000 | PHP-FPM Laravel |
| queue-worker | 3 | - | Laravel Queue |
| scheduler | 1 | - | Laravel Scheduler |
| postgres | 1 | 5432 | Base de donnees |
| redis | 1 | 6379 | Cache + Sessions |
| minio | 1 | 9000, 9001 | Object Storage |
| n8n | 1 | 5678 | Workflow Automation |
| waha | 1 | 3000 | WhatsApp API |
| laravel-echo | 1 | 6001 | WebSocket Server |
| prometheus | 1 | 9090 | Metrics |
| grafana | 1 | 3000 | Dashboards |

---

## Pre-requis Serveur

### Specifications Minimales

| Ressource | Minimum | Recommande |
|-----------|---------|------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Stockage | 50 GB SSD | 100 GB NVMe |
| Bande passante | 1 Gbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Hebergeurs Recommandes

| Fournisseur | Plan | Prix/mois | Lien |
|-------------|------|-----------|------|
| Hetzner Cloud | CPX31 | ~15 EUR | hetzner.com |
| DigitalOcean | Premium 4vCPU | ~48 USD | digitalocean.com |
| Contabo | VPS M | ~12 EUR | contabo.com |
| OVH | VPS Essential | ~20 EUR | ovhcloud.com |

---

## Configuration DNS Cloudflare

### Etape 1: Creer un compte Cloudflare

1. Aller sur https://cloudflare.com
2. Creer un compte gratuit
3. Ajouter votre domaine (ex: `immoguinee.gn`)
4. Mettre a jour les nameservers chez votre registrar

### Etape 2: Configurer les enregistrements DNS

**IMPORTANT:** Remplacez `VOTRE_IP_SERVEUR` par l'IP de votre serveur.

#### Enregistrements DNS a creer:

| Type | Nom | Contenu | Proxy | TTL |
|------|-----|---------|-------|-----|
| A | `@` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `www` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `api` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `storage` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `admin` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `grafana` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `n8n` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `minio` | `VOTRE_IP_SERVEUR` | Oui (orange) | Auto |
| A | `traefik` | `VOTRE_IP_SERVEUR` | Non (gris) | Auto |
| A | `pgadmin` | `VOTRE_IP_SERVEUR` | Non (gris) | Auto |
| A | `ws` | `VOTRE_IP_SERVEUR` | Non (gris) | Auto |
| CNAME | `waha` | `@` | Non (gris) | Auto |

#### Resume des sous-domaines:

```
immoguinee.gn          -> Application principale (frontend)
www.immoguinee.gn      -> Redirection vers immoguinee.gn
api.immoguinee.gn      -> Backend API Laravel
storage.immoguinee.gn  -> MinIO (images/fichiers publics)
admin.immoguinee.gn    -> Panel Admin (si separe)
grafana.immoguinee.gn  -> Monitoring Grafana
n8n.immoguinee.gn      -> Workflow Automation
minio.immoguinee.gn    -> MinIO Console (admin)
traefik.immoguinee.gn  -> Traefik Dashboard
pgadmin.immoguinee.gn  -> PostgreSQL Admin
ws.immoguinee.gn       -> WebSocket (Laravel Echo)
waha.immoguinee.gn     -> WhatsApp API Dashboard
```

### Etape 3: Configuration SSL Cloudflare

1. Aller dans **SSL/TLS** > **Overview**
2. Selectionner **Full (strict)**

3. Aller dans **SSL/TLS** > **Edge Certificates**
   - Always Use HTTPS: **ON**
   - Minimum TLS Version: **TLS 1.2**
   - TLS 1.3: **ON**
   - Automatic HTTPS Rewrites: **ON**

4. Aller dans **Speed** > **Optimization**
   - Auto Minify: **JS, CSS, HTML**
   - Brotli: **ON**
   - Early Hints: **ON**
   - Rocket Loader: **OFF** (peut casser React)

5. Aller dans **Caching** > **Configuration**
   - Caching Level: **Standard**
   - Browser Cache TTL: **4 hours**

6. Aller dans **Security** > **Settings**
   - Security Level: **Medium**
   - Challenge Passage: **30 minutes**
   - Browser Integrity Check: **ON**

### Etape 4: Page Rules (Optionnel)

Creer ces regles de page:

```
# Cache des images
URL: *immoguinee.gn/storage/*
Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 month

# Bypass cache pour API
URL: *immoguinee.gn/api/*
Settings: Cache Level = Bypass

# Bypass cache pour admin
URL: *admin.immoguinee.gn/*
Settings: Security Level = High, Cache Level = Bypass
```

---

## Installation Docker Swarm

### Etape 1: Preparer le serveur

```bash
# Connexion SSH
ssh root@VOTRE_IP_SERVEUR

# Mise a jour systeme
apt update && apt upgrade -y

# Installer les dependances
apt install -y curl git htop nano ufw fail2ban

# Configurer le firewall
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 2377/tcp    # Docker Swarm
ufw allow 7946/tcp    # Docker Swarm
ufw allow 7946/udp    # Docker Swarm
ufw allow 4789/udp    # Docker Overlay
ufw --force enable

# Installer Docker
curl -fsSL https://get.docker.com | sh

# Ajouter l'utilisateur au groupe docker
usermod -aG docker $USER
```

### Etape 2: Initialiser Docker Swarm

```bash
# Initialiser Swarm
docker swarm init --advertise-addr VOTRE_IP_SERVEUR

# Verifier
docker node ls
```

### Etape 3: Creer les reseaux et volumes

```bash
# Creer le reseau overlay
docker network create --driver overlay --attachable immog-network

# Creer les volumes
docker volume create immog-postgres-data
docker volume create immog-redis-data
docker volume create immog-minio-data
docker volume create immog-n8n-data
docker volume create immog-grafana-data
docker volume create immog-prometheus-data
docker volume create immog-letsencrypt
```

### Etape 4: Creer les secrets Docker

```bash
# Generer des mots de passe securises
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MINIO_PASSWORD=$(openssl rand -base64 32)
APP_KEY=$(openssl rand -base64 32)

# Creer les secrets
echo "$DB_PASSWORD" | docker secret create db_password -
echo "$REDIS_PASSWORD" | docker secret create redis_password -
echo "$MINIO_PASSWORD" | docker secret create minio_password -
echo "base64:$APP_KEY" | docker secret create app_key -

# Afficher les mots de passe (sauvegarder!)
echo "DB_PASSWORD: $DB_PASSWORD"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
echo "MINIO_PASSWORD: $MINIO_PASSWORD"
echo "APP_KEY: base64:$APP_KEY"
```

### Etape 5: Cloner le projet

```bash
# Creer le repertoire
mkdir -p /opt/immoguinee
cd /opt/immoguinee

# Cloner le repo
git clone https://github.com/VOTRE_USERNAME/immoguinee.git .

# Configurer l'environnement
cp docker/.env.production.example docker/.env
nano docker/.env
```

---

## Deploiement des Services

### Etape 1: Configurer le fichier .env

Editer `/opt/immoguinee/docker/.env`:

```env
# =================================================
# ImmoGuinee - Production Environment
# =================================================

# Domain
DOMAIN=immoguinee.gn
ACME_EMAIL=admin@immoguinee.gn

# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://immoguinee.gn
APP_KEY=base64:VOTRE_APP_KEY_ICI

# API
NEXT_PUBLIC_API_URL=https://api.immoguinee.gn

# Database
DB_DATABASE=immog_prod
DB_USERNAME=immog_user
DB_PASSWORD=VOTRE_DB_PASSWORD_ICI

# Redis
REDIS_PASSWORD=VOTRE_REDIS_PASSWORD_ICI

# MinIO
MINIO_ROOT_USER=immog_admin
MINIO_ROOT_PASSWORD=VOTRE_MINIO_PASSWORD_ICI
MINIO_ENDPOINT=https://storage.immoguinee.gn

# N8N
N8N_HOST=n8n.immoguinee.gn
N8N_USER=admin
N8N_PASSWORD=VOTRE_N8N_PASSWORD_ICI

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=VOTRE_GRAFANA_PASSWORD_ICI

# Laravel Echo
LARAVEL_ECHO_HOST=ws.immoguinee.gn
```

### Etape 2: Deployer la stack

```bash
cd /opt/immoguinee/docker

# Deployer
docker stack deploy -c docker-compose.swarm.yml immog

# Verifier le deploiement
docker stack services immog
docker stack ps immog
```

### Etape 3: Verifier les services

```bash
# Attendre que tous les services soient prets (~2-3 minutes)
watch docker stack ps immog

# Verifier les logs
docker service logs immog_traefik -f
docker service logs immog_frontend -f
docker service logs immog_php -f
```

---

## Configuration Post-Deploiement

### 1. Executer les migrations

```bash
# Trouver le conteneur PHP
PHP_CONTAINER=$(docker ps -q -f name=immog_php)

# Migrations
docker exec $PHP_CONTAINER php artisan migrate --force

# Seeders (donnees initiales)
docker exec $PHP_CONTAINER php artisan db:seed --force

# Generer les cles Passport
docker exec $PHP_CONTAINER php artisan passport:install --force
```

### 2. Configurer MinIO

```bash
# Installer MinIO Client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
mv mc /usr/local/bin/

# Configurer l'alias
mc alias set immog https://storage.immoguinee.gn immog_admin VOTRE_MINIO_PASSWORD

# Creer les buckets
mc mb immog/listings
mc mb immog/documents
mc mb immog/avatars
mc mb immog/contracts

# Configurer l'acces public pour les images
mc anonymous set download immog/listings
mc anonymous set download immog/avatars
```

### 3. Creer l'admin initial

```bash
docker exec -it $PHP_CONTAINER php artisan tinker

# Dans tinker:
$admin = new \App\Models\User();
$admin->nom = 'Admin';
$admin->prenom = 'ImmoGuinee';
$admin->email = 'admin@immoguinee.gn';
$admin->telephone = '+224620000000';
$admin->password = bcrypt('VotreMotDePasseSecurise123!');
$admin->role = 'admin';
$admin->email_verified_at = now();
$admin->save();
exit
```

### 4. Tester les endpoints

```bash
# Test frontend
curl -I https://immoguinee.gn

# Test API
curl https://api.immoguinee.gn/health

# Test MinIO
curl -I https://storage.immoguinee.gn/listings/
```

---

## Monitoring et Maintenance

### Grafana Dashboards

Acceder a https://grafana.immoguinee.gn

Dashboards disponibles:
- **Overview**: Vue globale du systeme
- **Laravel**: Metriques PHP/Laravel
- **PostgreSQL**: Performance base de donnees
- **Redis**: Cache et sessions
- **Traefik**: Trafic et latence

### Commandes de maintenance

```bash
# Voir l'etat des services
docker stack services immog

# Scaler un service
docker service scale immog_php=3
docker service scale immog_queue-worker=5

# Mettre a jour un service
docker service update --image immoguinee/frontend:latest immog_frontend

# Voir les logs
docker service logs immog_php -f --tail 100

# Redemarrer un service
docker service update --force immog_php
```

### Backup automatique

Creer `/opt/immoguinee/scripts/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups

# Backup PostgreSQL
docker exec $(docker ps -q -f name=immog_postgres) \
  pg_dump -U immog_user immog_prod > $BACKUP_DIR/db_$DATE.sql

# Compresser
gzip $BACKUP_DIR/db_$DATE.sql

# Backup MinIO vers S3/autre stockage
mc mirror immog/listings $BACKUP_DIR/minio/listings/

# Supprimer les backups > 7 jours
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

Ajouter au crontab:
```bash
crontab -e
# Ajouter:
0 2 * * * /opt/immoguinee/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Mise a jour de l'application

```bash
cd /opt/immoguinee

# Tirer les derniers changements
git pull origin main

# Reconstruire et deployer
docker stack deploy -c docker/docker-compose.swarm.yml immog

# Executer les migrations
docker exec $(docker ps -q -f name=immog_php) php artisan migrate --force

# Vider les caches
docker exec $(docker ps -q -f name=immog_php) php artisan config:cache
docker exec $(docker ps -q -f name=immog_php) php artisan route:cache
docker exec $(docker ps -q -f name=immog_php) php artisan view:cache
```

---

## Troubleshooting

### Service ne demarre pas

```bash
# Voir les erreurs
docker service ps immog_SERVICE_NAME --no-trunc

# Voir les logs
docker service logs immog_SERVICE_NAME

# Inspecter le service
docker service inspect immog_SERVICE_NAME
```

### Probleme de connexion base de donnees

```bash
# Tester la connexion
docker exec -it $(docker ps -q -f name=immog_php) php artisan tinker
>>> DB::connection()->getPdo();
```

### Certificat SSL invalide

```bash
# Verifier les certificats Traefik
docker exec $(docker ps -q -f name=immog_traefik) cat /letsencrypt/acme.json

# Forcer le renouvellement
docker service update --force immog_traefik
```

### Espace disque plein

```bash
# Nettoyer Docker
docker system prune -af --volumes

# Verifier l'espace
df -h
```

### Redis connection refused

```bash
# Verifier Redis
docker exec $(docker ps -q -f name=immog_redis) redis-cli -a VOTRE_PASSWORD ping
```

---

## Checklist Pre-Production

- [ ] Domaine configure chez le registrar
- [ ] DNS Cloudflare configures
- [ ] SSL mode "Full (strict)" active
- [ ] Serveur provisionne avec Docker
- [ ] Docker Swarm initialise
- [ ] Secrets crees
- [ ] Variables d'environnement configurees
- [ ] Stack deployee
- [ ] Migrations executees
- [ ] Admin cree
- [ ] MinIO buckets crees
- [ ] Tests des endpoints OK
- [ ] Backup automatique configure
- [ ] Monitoring Grafana accessible
- [ ] Webhook WhatsApp configure (optionnel)
- [ ] Paiements Orange Money/MTN configures (optionnel)

---

## Contacts et Support

- **Documentation**: https://docs.immoguinee.gn
- **Email Support**: support@immoguinee.gn
- **WhatsApp**: +224 XXX XXX XXX

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-12-13 | Version initiale Docker Swarm |
