# Guide de Déploiement ImmoGuinée - Docker Swarm + Cloudflare

Ce guide vous accompagne dans le déploiement complet de la plateforme ImmoGuinée en production avec Docker Swarm et Cloudflare.

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Architecture](#architecture)
3. [Préparation du Serveur](#préparation-du-serveur)
4. [Configuration Cloudflare](#configuration-cloudflare)
5. [Déploiement Docker Swarm](#déploiement-docker-swarm)
6. [Monitoring](#monitoring)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prérequis

### Serveur Production
- **OS**: Ubuntu 22.04 LTS (recommandé) ou Debian 11+
- **RAM**: Minimum 8 GB (16 GB recommandé)
- **CPU**: 4 cores minimum (8 cores recommandé)
- **Stockage**: 100 GB SSD minimum (NVMe recommandé)
- **Réseau**: IPv4 publique, bande passante 100 Mbps+

### Services Externes
- Compte Cloudflare (gratuit ou payant)
- Nom de domaine: `immoguinee.com`
- Email pour Let's Encrypt
- SMTP (Gmail, SendGrid, etc.) pour les alertes

### Connaissances Requises
- Administration Linux de base
- Docker et Docker Swarm
- Nginx/Traefik
- DNS et SSL/TLS

---

## 2. Architecture

### Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE CDN                         │
│  (Cache, WAF, DDoS Protection, SSL/TLS, Compression)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRAEFIK (Load Balancer)                  │
│  - Let's Encrypt SSL/TLS                                    │
│  - HTTP to HTTPS redirect                                   │
│  - Health checks                                            │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Next.js (x3)   │  │  Nginx + PHP    │  │   MinIO S3      │
│  Frontend       │  │  Laravel API    │  │   Storage       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                    ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PostgreSQL     │  │     Redis       │  │ Elasticsearch   │
│  + PostGIS      │  │    Cache        │  │     Search      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Services Docker Swarm

| Service | Réplicas | Port | Description |
|---------|----------|------|-------------|
| **frontend** | 3 | 3000 | Next.js 16 App |
| **nginx** | 2 | 80 | Reverse proxy pour PHP |
| **php** | 2 | 9000 | Laravel 12 + PHP 8.3 |
| **postgres** | 1 | 5432 | PostgreSQL 15 + PostGIS |
| **redis** | 1 | 6379 | Cache et queues |
| **elasticsearch** | 1 | 9200 | Search engine |
| **traefik** | 1 | 80/443 | Load balancer + SSL |
| **minio** | 1 | 9000/9001 | S3-compatible storage |
| **n8n** | 1 | 5678 | Workflow automation |

---

## 3. Préparation du Serveur

### 3.1 Connexion SSH

```bash
ssh root@YOUR_SERVER_IP
```

### 3.2 Mise à jour du système

```bash
apt update && apt upgrade -y
apt install -y curl git vim htop ufw
```

### 3.3 Configuration du pare-feu

```bash
# Autoriser SSH
ufw allow 22/tcp

# Autoriser HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer le pare-feu
ufw enable
```

### 3.4 Installation de Docker

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Démarrer Docker
systemctl enable docker
systemctl start docker

# Vérifier l'installation
docker --version
```

### 3.5 Initialisation de Docker Swarm

```bash
# Initialiser Swarm
docker swarm init --advertise-addr YOUR_SERVER_IP

# Vérifier le statut
docker node ls
```

### 3.6 Cloner le dépôt

```bash
cd /opt
git clone https://github.com/votre-org/ImmoG.git immog
cd immog
```

---

## 4. Configuration Cloudflare

### 4.1 Ajouter le domaine

1. Connectez-vous à [Cloudflare](https://dash.cloudflare.com/)
2. Cliquez sur **Add a Site**
3. Entrez `immoguinee.com`
4. Choisissez le plan (Free recommandé pour commencer)
5. Copiez les nameservers Cloudflare

### 4.2 Mettre à jour les nameservers

Chez votre registrar de domaine, remplacez les nameservers par ceux de Cloudflare :

```
ns1.cloudflare.com
ns2.cloudflare.com
```

⏱️ Temps de propagation : 2-48 heures (généralement < 2h)

### 4.3 Configuration DNS

Allez dans **DNS** > **Records** et ajoutez :

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | @ | YOUR_SERVER_IP | ✅ Proxied | Auto |
| A | www | YOUR_SERVER_IP | ✅ Proxied | Auto |
| A | api | YOUR_SERVER_IP | ✅ Proxied | Auto |
| A | traefik | YOUR_SERVER_IP | ✅ Proxied | Auto |
| A | grafana | YOUR_SERVER_IP | ✅ Proxied | Auto |
| A | prometheus | YOUR_SERVER_IP | ✅ Proxied | Auto |

### 4.4 SSL/TLS

1. **SSL/TLS** > **Overview**
2. Mode: **Full (strict)**
3. **Edge Certificates**:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ TLS 1.3

### 4.5 Configuration du Cache

Suivez le guide détaillé dans [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md)

**Règles essentielles** :

```
1. *immoguinee.com/_next/static/* → Cache Everything, 1 year
2. *immoguinee.com/_next/image* → Cache Everything, 1 month
3. *immoguinee.com/api/* → Bypass
4. *immoguinee.com/* → Standard, 2 hours
```

---

## 5. Déploiement Docker Swarm

### 5.1 Configuration des variables d'environnement

Créez le fichier `.env` à la racine :

```bash
cp .env.example .env
vim .env
```

Configurez les variables :

```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://immoguinee.com

# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=immog_db
DB_USERNAME=immog_user
DB_PASSWORD=CHANGEZ_CE_MOT_DE_PASSE

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=CHANGEZ_CE_MOT_DE_PASSE
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# MinIO S3
MINIO_ROOT_USER=immog_minio
MINIO_ROOT_PASSWORD=CHANGEZ_CE_MOT_DE_PASSE
MINIO_ENDPOINT=https://minio.immoguinee.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.immoguinee.com
NEXT_PUBLIC_ECHO_HOST=immoguinee.com
NEXT_PUBLIC_ECHO_PORT=6001

# Email (pour Let's Encrypt et alertes)
LETSENCRYPT_EMAIL=admin@immoguinee.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@immoguinee.com
SMTP_PASSWORD=votre_app_password
```

### 5.2 Rendre le script de déploiement exécutable

```bash
chmod +x deploy-swarm.sh
```

### 5.3 Déploiement initial

```bash
./deploy-swarm.sh
# Choisir option 1: Déployer/Mettre à jour le stack complet
```

Le script va :
1. ✅ Build les images Docker (Frontend Next.js, Backend PHP)
2. ✅ Déployer tous les services sur Docker Swarm
3. ✅ Configurer Traefik avec Let's Encrypt
4. ✅ Démarrer PostgreSQL, Redis, Elasticsearch
5. ✅ Lancer les replicas du frontend (3x) et backend (2x)

### 5.4 Vérifier le déploiement

```bash
# Status des services
docker stack services immog

# Logs du frontend
docker service logs -f immog_frontend

# Logs du backend
docker service logs -f immog_php

# Logs de Traefik
docker service logs -f immog_traefik
```

### 5.5 Attendre la génération des certificats SSL

Traefik va automatiquement générer les certificats Let's Encrypt. Attendez 1-2 minutes.

```bash
# Vérifier les certificats
docker exec $(docker ps -q -f name=immog_traefik) ls /letsencrypt
```

### 5.6 Initialiser la base de données

```bash
# Se connecter au conteneur PHP
docker exec -it $(docker ps -q -f name=immog_php | head -1) bash

# Exécuter les migrations
php artisan migrate --force

# Créer un utilisateur admin
php artisan user:create-admin

# Seeder (données de test)
php artisan db:seed --force

# Quitter
exit
```

---

## 6. Monitoring

### 6.1 Déployer le stack de monitoring

```bash
docker stack deploy -c docker-compose.monitoring.yml immog-monitoring
```

Services déployés :
- ✅ **Prometheus** : `https://prometheus.immoguinee.com`
- ✅ **Grafana** : `https://grafana.immoguinee.com`
- ✅ **Alertmanager** : `https://alerts.immoguinee.com`

### 6.2 Accéder à Grafana

1. Ouvrez `https://grafana.immoguinee.com`
2. Login : `admin` / `immog_grafana_secret`
3. Changez le mot de passe !

### 6.3 Dashboards pré-configurés

Importez les dashboards suivants depuis Grafana :

| Dashboard | ID | Description |
|-----------|----|--------------|
| Docker Swarm | 609 | Métriques Swarm |
| Node Exporter | 1860 | Métriques serveur |
| PostgreSQL | 9628 | Métriques PostgreSQL |
| Redis | 763 | Métriques Redis |
| Traefik | 4475 | Métriques Traefik |

---

## 7. Maintenance

### 7.1 Mise à jour de l'application

#### Mise à jour du frontend

```bash
cd /opt/immog
git pull origin main
./deploy-swarm.sh
# Choisir option 2: Déployer uniquement le frontend
```

#### Mise à jour du backend

```bash
cd /opt/immog
git pull origin main
./deploy-swarm.sh
# Choisir option 3: Déployer uniquement le backend
```

### 7.2 Scaling des services

```bash
./deploy-swarm.sh
# Choisir option 8: Scaler les services

# Ou manuellement :
docker service scale immog_frontend=5
docker service scale immog_php=3
docker service scale immog_nginx=3
```

### 7.3 Backup automatique

Créez un cron job pour sauvegarder PostgreSQL :

```bash
crontab -e
```

Ajoutez :

```cron
# Backup PostgreSQL tous les jours à 2h du matin
0 2 * * * docker exec $(docker ps -q -f name=immog_postgres) pg_dumpall -U immog_user | gzip > /opt/backups/immog_$(date +\%Y\%m\%d).sql.gz

# Nettoyage des backups > 30 jours
0 3 * * * find /opt/backups -name "immog_*.sql.gz" -mtime +30 -delete
```

### 7.4 Purge du cache Cloudflare

Après chaque déploiement :

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 8. Troubleshooting

### 8.1 Le site ne charge pas

```bash
# Vérifier le statut des services
docker stack ps immog

# Vérifier les logs Traefik
docker service logs immog_traefik

# Vérifier DNS Cloudflare
dig immoguinee.com
```

### 8.2 Erreur 502 Bad Gateway

```bash
# Vérifier que le frontend est up
docker service ps immog_frontend

# Vérifier les health checks
docker service inspect immog_frontend --pretty

# Redémarrer le service
docker service update --force immog_frontend
```

### 8.3 Certificat SSL non généré

```bash
# Vérifier les logs Traefik
docker service logs immog_traefik | grep acme

# S'assurer que le port 80 est accessible
curl -I http://immoguinee.com/.well-known/acme-challenge/test
```

### 8.4 Base de données ne démarre pas

```bash
# Vérifier les logs PostgreSQL
docker service logs immog_postgres

# Vérifier l'espace disque
df -h

# Vérifier les volumes
docker volume ls | grep postgres
```

### 8.5 Performance lente

```bash
# Vérifier l'utilisation des ressources
docker stats

# Vérifier le cache Cloudflare
curl -I https://immoguinee.com
# Chercher : cf-cache-status: HIT

# Vérifier le cache Redis
docker exec -it $(docker ps -q -f name=immog_redis) redis-cli -a immog_redis_secret
> INFO stats
```

---

## 9. Checklist de Production

- [ ] Serveur configuré avec firewall
- [ ] Docker Swarm initialisé
- [ ] DNS Cloudflare configuré
- [ ] SSL/TLS Full (strict) activé
- [ ] Cache Cloudflare configuré (Page Rules)
- [ ] Stack principal déployé (`immog`)
- [ ] Certificats Let's Encrypt générés
- [ ] Base de données initialisée et migrée
- [ ] Stack monitoring déployé
- [ ] Grafana accessible et sécurisé
- [ ] Backup automatique configuré
- [ ] Tests de performance effectués (PageSpeed > 90)
- [ ] Tests de charge effectués
- [ ] Documentation à jour
- [ ] Mots de passe changés dans `.env`
- [ ] Monitoring actif (Prometheus + Grafana)
- [ ] Alertes configurées (Alertmanager)

---

## 10. Performance Cibles

| Métrique | Cible | Outil |
|----------|-------|-------|
| **PageSpeed Score** | > 90 | Google PageSpeed Insights |
| **Time to First Byte (TTFB)** | < 200ms | WebPageTest |
| **Largest Contentful Paint (LCP)** | < 2.5s | Chrome DevTools |
| **First Input Delay (FID)** | < 100ms | Chrome DevTools |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Chrome DevTools |
| **Cache Hit Ratio** | > 80% | Cloudflare Analytics |
| **API Response Time** | < 100ms (p95) | Prometheus |
| **Database Query Time** | < 10ms (p95) | PostgreSQL logs |
| **Uptime** | > 99.9% | Monitoring |

---

## Support

- **Documentation** : `/docs`
- **Issues** : GitHub Issues
- **Email** : admin@immoguinee.com

---

**🎉 Félicitations ! Votre plateforme ImmoGuinée est déployée en production !**
