# 🐳 Configuration Docker - ImmoGuinée

## Vue d'ensemble

La plateforme ImmoGuinée utilise Docker pour orchestrer 18 services microservices. Cette documentation explique la structure Docker et comment utiliser les différents fichiers de configuration.

---

## 📂 Structure des Dockerfiles

### 1. `/Dockerfile` (Root)
**Usage**: Déploiement **CapRover** (production)

```dockerfile
FROM php:8.3-fpm-alpine
```

**Caractéristiques**:
- Base Alpine Linux (légère, ~40MB)
- Extensions PHP: pdo_pgsql, redis, imagick, gd, zip, intl, opcache
- Composer en production (`--no-dev --optimize-autoloader`)
- Outils d'optimisation d'images: jpegoptim, optipng, pngquant, gifsicle, webp
- Copie de la configuration PHP personnalisée depuis `docker/php/php.ini`

**Optimisations**:
- Layer caching avec copie séparée de `composer.json` avant le code
- Multi-stage build potentiel
- Permissions correctes pour `www-data`

### 2. `/docker/php/Dockerfile`
**Usage**: **Docker Compose** local (développement)

```dockerfile
FROM php:8.3-fpm
```

**Caractéristiques**:
- Base Debian (plus d'outils de debug)
- Mêmes extensions PHP que la version CapRover
- Composer en mode développement (avec dev dependencies)
- Outils de développement supplémentaires

**Différences clés**:
- Image plus volumineuse mais plus complète pour le développement
- Dépendances de développement incluses (PHPUnit, debugger, etc.)
- Pas d'optimisation aggressive

---

## 🚀 Les 18 Services Docker

### Backend & API (Laravel 11)
| Service | Description | Port(s) |
|---------|-------------|---------|
| **php** | Application Laravel principale (PHP-FPM 8.3) | 9000 |
| **queue-worker** | Traitement async des jobs (emails, photos) | - |
| **scheduler** | Tâches planifiées (cron Laravel) | - |

### Base de données & Cache
| Service | Description | Port(s) |
|---------|-------------|---------|
| **postgres** | PostgreSQL 15 + PostGIS (géospatial) | 5432 |
| **redis** | Redis 7+ (cache, sessions, queues, broadcasting) | 6379 |
| **elasticsearch** | Elasticsearch 8.11 (moteur de recherche) | 9200, 9300 |

### Stockage & Fichiers
| Service | Description | Port(s) |
|---------|-------------|---------|
| **minio** | Stockage S3-compatible (photos, documents) | 9000, 9001 |

### Web & Proxy
| Service | Description | Port(s) |
|---------|-------------|---------|
| **nginx** | Serveur web (reverse proxy vers PHP-FPM) | 80, 443 |
| **varnish** | Cache HTTP (accélération) | 8080 |
| **traefik** | Reverse proxy + SSL automatique (Let's Encrypt) | 80, 443, 8081 |

### Temps réel & Communication
| Service | Description | Port(s) |
|---------|-------------|---------|
| **laravel-echo** | WebSocket server (Socket.IO + Redis) | 6001 |
| **waha** | API WhatsApp self-hosted | 3000 |

### Automatisation
| Service | Description | Port(s) |
|---------|-------------|---------|
| **n8n** | Workflow automation (notifications, intégrations) | 5678 |

### Monitoring & Admin
| Service | Description | Port(s) |
|---------|-------------|---------|
| **prometheus** | Collecte de métriques | 9090 |
| **grafana** | Visualisation et dashboards | 3001 |
| **pgadmin** | Interface de gestion PostgreSQL | 5050 |

### Intelligence Artificielle
| Service | Description | Port(s) |
|---------|-------------|---------|
| **ollama** | LLM local pour recommandations (nécessite GPU) | 11434 |

---

## 🎯 Quelle configuration utiliser ?

### Développement Local
```bash
cd docker
docker-compose up -d
```

**Utilise**:
- `/docker/php/Dockerfile` (Debian, dev dependencies)
- `docker-compose.yml` (tous les 18 services)
- Variables d'environnement depuis `.env`

### Production avec CapRover
```bash
caprover deploy
```

**Utilise**:
- `/Dockerfile` (Alpine, production optimisée)
- `captain-definition` (configuration CapRover)
- `.caprover/config.json` (settings de l'app)

**Ou via One-Click App**:
- `.caprover/one-click-apps/immoguinee-full-stack.json`
- Déploie automatiquement les 8 services CapRover

---

## 📦 Services CapRover (One-Click App)

Le template One-Click App déploie ces 8 services:

1. **immoguinee-postgres** - PostgreSQL 15 + PostGIS
2. **immoguinee-redis** - Redis 7 Alpine
3. **immoguinee-elasticsearch** - Elasticsearch 8.11
4. **immoguinee-minio** - MinIO (S3-compatible)
5. **immoguinee** - Application Laravel principale
6. **immoguinee-queue-worker** - Worker pour les jobs
7. **immoguinee-scheduler** - Tâches planifiées
8. **immoguinee-laravel-echo** - WebSocket server
9. **immoguinee-grafana** - Monitoring (optionnel)

**Avantages**:
- Déploiement en un clic
- Auto-configuration des variables d'environnement
- Génération automatique des mots de passe
- Networking automatique entre services
- SSL/TLS automatique via CapRover

---

## 🔧 Commandes utiles

### Démarrage
```bash
# Tous les services
docker-compose up -d

# Service spécifique
docker-compose up -d php redis postgres
```

### Logs
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f php
docker-compose logs --tail=100 queue-worker
```

### Shell dans les conteneurs
```bash
# PHP/Laravel
docker exec -it immog-php bash
docker exec immog-php php artisan migrate

# PostgreSQL
docker exec -it immog-postgres psql -U immog_user -d immog_db

# Redis
docker exec -it immog-redis redis-cli -a immog_redis_secret
```

### Rebuild
```bash
# Rebuild tous les services
docker-compose build --no-cache

# Rebuild service spécifique
docker-compose build --no-cache php
docker-compose up -d php
```

### Nettoyage
```bash
# Arrêter et supprimer les conteneurs
docker-compose down

# Supprimer aussi les volumes (⚠️ DONNÉES PERDUES)
docker-compose down -v

# Nettoyer les images inutilisées
docker system prune -a
```

---

## 🌐 Variables d'environnement

### Essentielles pour tous les déploiements

```env
# Application
APP_NAME=ImmoGuinée
APP_ENV=production
APP_DEBUG=false
APP_URL=https://immoguinee.gn

# Base de données
DB_CONNECTION=pgsql
DB_HOST=postgres                    # Docker Compose
DB_HOST=srv-captain--immoguinee-postgres  # CapRover
DB_DATABASE=immog_db
DB_USERNAME=immog_user
DB_PASSWORD=CHANGEME

# Redis
REDIS_HOST=redis                    # Docker Compose
REDIS_HOST=srv-captain--immoguinee-redis  # CapRover
REDIS_PASSWORD=CHANGEME

# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch    # Docker Compose
ELASTICSEARCH_HOST=srv-captain--immoguinee-elasticsearch  # CapRover

# MinIO/S3
AWS_ENDPOINT=http://minio:9000      # Docker Compose
AWS_ENDPOINT=http://srv-captain--immoguinee-minio:9000  # CapRover
AWS_ACCESS_KEY_ID=immog_minio
AWS_SECRET_ACCESS_KEY=CHANGEME
```

---

## 🏥 Health Checks

Les services suivants ont des health checks configurés:

### PostgreSQL
```bash
docker exec immog-postgres pg_isready -U immog_user
# Retour attendu: immog-postgres:5432 - accepting connections
```

### Redis
```bash
docker exec immog-redis redis-cli -a immog_redis_secret ping
# Retour attendu: PONG
```

### Elasticsearch
```bash
curl http://localhost:9200/_cluster/health
# Retour attendu: {"status":"green" ou "yellow"}
```

### MinIO
```bash
curl http://localhost:9000/minio/health/live
# Retour attendu: 200 OK
```

---

## 🔍 Résolution de problèmes

### Le conteneur PHP ne démarre pas
```bash
# Vérifier les logs
docker-compose logs php

# Problème fréquent: permissions
docker exec immog-php chown -R www-data:www-data /var/www/backend/storage
docker exec immog-php chmod -R 755 /var/www/backend/storage
```

### PostgreSQL refuse les connexions
```bash
# Vérifier que le service tourne
docker-compose ps postgres

# Tester depuis PHP
docker exec immog-php php artisan tinker
>>> DB::connection()->getPdo();
```

### Redis connection failed
```bash
# Vérifier Redis
docker exec immog-redis redis-cli -a immog_redis_secret ping

# Vider le cache
docker exec immog-php php artisan cache:clear
docker exec immog-php php artisan config:clear
```

### Elasticsearch ne démarre pas (mémoire insuffisante)
```bash
# Linux: augmenter vm.max_map_count
sudo sysctl -w vm.max_map_count=262144

# Windows/Mac: augmenter la RAM Docker Desktop
# Settings > Resources > Memory: minimum 4GB
```

### Queue jobs ne sont pas traités
```bash
# Vérifier le worker
docker-compose logs queue-worker

# Redémarrer le worker
docker-compose restart queue-worker

# Voir les jobs échoués
docker exec immog-php php artisan queue:failed
```

---

## 📚 Documentation complémentaire

- **`docker/README.md`** - Guide complet des services et commandes
- **`DEPLOYMENT.md`** - Guide de déploiement (Docker Compose, CapRover, Docker Swarm)
- **`.env.example`** - Template de variables d'environnement
- **`captain-definition`** - Configuration CapRover
- **`.caprover/one-click-apps/immoguinee-full-stack.json`** - Template One-Click App

---

## 🎉 Résumé des corrections Docker

### Problèmes résolus
1. ✅ Clarification des 2 Dockerfiles (root vs docker/php)
2. ✅ Ajout des services manquants (queue-worker, scheduler)
3. ✅ Configuration complète CapRover (captain-definition, config.json, one-click-app)
4. ✅ Health checks pour tous les services critiques
5. ✅ Documentation complète (docker/README.md, DEPLOYMENT.md)

### Fichiers créés/modifiés
- `/Dockerfile` - CapRover (Alpine, production)
- `/docker/php/Dockerfile` - Docker Compose (Debian, dev)
- `/docker/docker-compose.yml` - 18 services orchestrés
- `/captain-definition` - Configuration CapRover
- `/.caprover/config.json` - Settings CapRover app
- `/.caprover/one-click-apps/immoguinee-full-stack.json` - Template One-Click
- `/DEPLOYMENT.md` - Guide de déploiement complet
- `/docker/README.md` - Documentation des services
- `/DOCKER_SETUP.md` - Ce fichier (vue d'ensemble)

### Prochaines étapes
1. Tester le déploiement Docker Compose localement
2. Configurer les variables d'environnement (`.env`)
3. Lancer les migrations et seeders
4. Tester le déploiement CapRover sur un serveur staging
5. Configurer les APIs externes (Twilio, Orange Money, MTN MoMo)

---

## 💡 Conseils

### Pour le développement local
- Utilisez `docker-compose up -d` pour tous les services
- Accédez aux logs avec `docker-compose logs -f`
- Utilisez `docker exec` pour les commandes Artisan
- Gardez les volumes pour conserver les données entre redémarrages

### Pour la production (CapRover)
- Changez TOUS les mots de passe par défaut
- Activez HTTPS via CapRover (automatique avec Let's Encrypt)
- Scalez les services critiques (queue-worker x3-5, php x2-3)
- Configurez les backups automatiques (PostgreSQL, MinIO)
- Surveillez avec Grafana + Prometheus

### Pour la sécurité
- Ne commitez JAMAIS le fichier `.env` avec les vrais mots de passe
- Utilisez des mots de passe forts (32+ caractères)
- Limitez l'accès aux services d'admin (PgAdmin, Grafana) par IP
- Activez le firewall sur le serveur de production
- Chiffrez les backups (AES-256)

---

**Documentation mise à jour**: 30 janvier 2025
**Version Laravel**: 11.x
**Version PHP**: 8.3-fpm
**Version Docker Compose**: 3.8
