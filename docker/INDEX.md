# 📁 Index des fichiers Docker - ImmoGuinée

Index complet de tous les fichiers de configuration Docker du projet.

---

## 📋 Structure complète

```
docker/
├── docker-compose.yml          # ⭐ Orchestration des 18 services
├── .env                        # Variables d'environnement (ne pas commiter)
├── .gitignore                  # Fichiers à ignorer par Git
├── README.md                   # 📖 Documentation principale
├── QUICK_START.md              # 🚀 Guide de démarrage rapide
├── ARCHITECTURE.md             # 🏗️ Architecture microservices
├── INDEX.md                    # 📑 Ce fichier
│
├── nginx/                      # Serveur web
│   ├── nginx.conf              # Configuration Nginx principale
│   ├── sites/                  # Virtual hosts
│   │   ├── backend.conf        # API Laravel
│   │   ├── frontend.conf       # Next.js PWA
│   │   └── README.md           # Documentation
│   └── README.md
│
├── php/                        # PHP-FPM 8.3
│   ├── Dockerfile              # Image PHP pour Docker Compose
│   ├── php.ini                 # Configuration PHP personnalisée
│   └── README.md               # Documentation
│
├── postgres/                   # PostgreSQL 15 + PostGIS
│   ├── init/                   # Scripts d'initialisation
│   │   ├── 01-init-extensions.sql       # PostGIS, UUID, etc.
│   │   ├── 02-create-quartiers.sql      # Quartiers Conakry
│   │   ├── 03-performance-tuning.sql    # Optimisations
│   │   ├── 04-functions.sql             # Fonctions SQL custom
│   │   └── README.md                    # Documentation
│   └── README.md
│
├── varnish/                    # Cache HTTP
│   ├── default.vcl             # Configuration Varnish
│   └── README.md               # Documentation
│
├── traefik/                    # Reverse proxy + SSL
│   ├── traefik.yml             # Configuration statique
│   ├── dynamic/                # Configuration dynamique
│   │   ├── middlewares.yml     # Security, rate limiting, CORS
│   │   └── routers.yml         # Routes et services
│   ├── letsencrypt/            # Certificats SSL
│   │   ├── .gitkeep            # Garde le dossier en Git
│   │   └── acme.json           # (généré, ne pas commiter)
│   └── README.md               # Documentation
│
├── laravel-echo/               # WebSocket server
│   ├── laravel-echo-server.json # Configuration Echo
│   └── README.md               # Documentation
│
├── waha/                       # WhatsApp HTTP API
│   ├── .sessions/              # Sessions WhatsApp
│   │   └── .gitkeep            # Garde le dossier en Git
│   └── README.md
│
└── pgadmin/                    # PostgreSQL admin UI
    └── README.md
```

---

## 🎯 Fichiers par fonctionnalité

### Orchestration & Déploiement
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `docker-compose.yml` | Orchestration 18 services | ⭐⭐⭐⭐⭐ |
| `.env` | Variables d'environnement | ⭐⭐⭐⭐⭐ |
| `/Dockerfile` (racine) | Image CapRover production | ⭐⭐⭐⭐ |

### Serveur Web
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `nginx/nginx.conf` | Config Nginx principale | ⭐⭐⭐⭐⭐ |
| `nginx/sites/backend.conf` | Virtual host API Laravel | ⭐⭐⭐⭐⭐ |
| `nginx/sites/frontend.conf` | Virtual host Next.js | ⭐⭐⭐⭐ |

### PHP & Laravel
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `php/Dockerfile` | Image PHP-FPM 8.3 | ⭐⭐⭐⭐⭐ |
| `php/php.ini` | Configuration PHP | ⭐⭐⭐⭐⭐ |

### Base de données
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `postgres/init/01-init-extensions.sql` | Extensions PostgreSQL | ⭐⭐⭐⭐⭐ |
| `postgres/init/02-create-quartiers.sql` | Quartiers Conakry | ⭐⭐⭐ |
| `postgres/init/03-performance-tuning.sql` | Optimisations DB | ⭐⭐⭐⭐ |
| `postgres/init/04-functions.sql` | Fonctions SQL custom | ⭐⭐⭐⭐ |

### Cache & Performance
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `varnish/default.vcl` | Configuration Varnish | ⭐⭐⭐⭐ |

### Reverse Proxy & SSL
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `traefik/traefik.yml` | Config Traefik statique | ⭐⭐⭐⭐⭐ |
| `traefik/dynamic/middlewares.yml` | Security, rate limiting | ⭐⭐⭐⭐⭐ |
| `traefik/dynamic/routers.yml` | Routes HTTP | ⭐⭐⭐⭐⭐ |

### Temps réel
| Fichier | Description | Criticité |
|---------|-------------|-----------|
| `laravel-echo/laravel-echo-server.json` | WebSocket config | ⭐⭐⭐⭐ |

### Documentation
| Fichier | Description |
|---------|-------------|
| `README.md` | Documentation principale |
| `QUICK_START.md` | Guide démarrage rapide |
| `ARCHITECTURE.md` | Diagrammes architecture |
| `INDEX.md` | Cet index |
| `*/README.md` | Documentation par service |

---

## 📝 Fichiers de configuration par service

### Service: nginx
```
nginx/
├── nginx.conf              # Config principale (workers, gzip, rate limiting)
├── sites/backend.conf      # Laravel API (PHP-FPM, rate limits)
└── sites/frontend.conf     # Next.js PWA (static files, cache)
```

**Variables importantes**:
- `worker_connections: 2048`
- `client_max_body_size: 100M`
- `rate_limit: 60 req/min (API), 5 req/min (auth), 100 req/min (search)`

---

### Service: php
```
php/
├── Dockerfile              # PHP 8.3-fpm + extensions + Composer
└── php.ini                 # memory_limit=512M, upload_max=20M, OPcache
```

**Extensions installées**:
`pdo_pgsql`, `redis`, `imagick`, `gd`, `zip`, `intl`, `opcache`, `bcmath`, `mbstring`, `exif`, `pcntl`

---

### Service: postgres
```
postgres/
└── init/
    ├── 01-init-extensions.sql       # postgis, uuid-ossp, pg_trgm, unaccent
    ├── 02-create-quartiers.sql      # Documentation quartiers Conakry
    ├── 03-performance-tuning.sql    # work_mem, effective_cache_size, etc.
    └── 04-functions.sql             # calculate_distance, find_listings_in_radius, etc.
```

**Fonctions SQL custom**:
- `calculate_distance(lat1, lon1, lat2, lon2)` → distance en mètres
- `find_listings_in_radius(lat, lon, radius)` → annonces dans rayon
- `clean_expired_listings()` → expire annonces > 90 jours
- `increment_listing_views(uuid)` → +1 vues (atomic)
- `calculate_user_rating(uuid)` → note moyenne

---

### Service: varnish
```
varnish/
└── default.vcl             # Cache stratégies, ACL purge, grace mode
```

**Stratégie de cache**:
- Statiques: 7 jours
- API search: 5 minutes
- Authentifié: jamais
- Admin: jamais

---

### Service: traefik
```
traefik/
├── traefik.yml             # Entry points, SSL, providers, logging
└── dynamic/
    ├── middlewares.yml     # Security headers, CORS, rate limiting, circuit breaker
    └── routers.yml         # Routes (api., www., ws., minio., grafana., n8n.)
```

**Middlewares clés**:
- `security-headers`: HSTS, XSS, frame-deny
- `rate-limit-api`: 100 req/min
- `rate-limit-auth`: 10 req/min
- `cors-headers`: CORS pour API
- `admin-whitelist`: IP whitelist

**Routes configurées**:
- `api.immoguinee.gn` → backend (Laravel)
- `immoguinee.gn` → frontend (Next.js)
- `ws.immoguinee.gn` → laravel-echo (WebSocket)
- `minio.immoguinee.gn` → MinIO console (admin only)
- `grafana.immoguinee.gn` → Grafana (admin only)
- `n8n.immoguinee.gn` → n8n (admin only)

---

### Service: laravel-echo
```
laravel-echo/
└── laravel-echo-server.json # Port, auth, Redis, CORS
```

**Canaux diffusés**:
- `conversation.{id}` → NewMessageEvent
- `user.{id}` → PaymentStatusUpdated
- `contract.{id}` → ContractStatusUpdated

---

## 🔧 Commandes fréquentes par service

### Nginx
```bash
# Tester la config
docker exec immog-nginx nginx -t

# Recharger
docker exec immog-nginx nginx -s reload

# Logs
docker logs immog-nginx -f
```

### PHP
```bash
# Artisan
docker exec immog-php php artisan migrate

# Composer
docker exec immog-php composer install

# PHP info
docker exec immog-php php -i
```

### PostgreSQL
```bash
# Psql
docker exec -it immog-postgres psql -U immog_user -d immog_db

# Backup
docker exec immog-postgres pg_dump -U immog_user immog_db > backup.sql
```

### Varnish
```bash
# Stats
docker exec immog-varnish varnishstat

# Purge
curl -X PURGE http://localhost:8080/

# Logs
docker exec immog-varnish varnishlog
```

### Traefik
```bash
# Routes
curl http://localhost:8081/api/http/routers

# Dashboard
# http://localhost:8081
```

### Laravel Echo
```bash
# Logs
docker logs immog-laravel-echo -f

# Stats
curl http://localhost:6001/stats
```

---

## 📦 Volumes persistants

| Volume | Contenu | Taille estimée | Backup ? |
|--------|---------|----------------|----------|
| `postgres-data` | Base de données | 5-50GB | ✅ Oui (quotidien) |
| `redis-data` | Cache/Sessions | 100MB-1GB | ❌ Non (volatile) |
| `elasticsearch-data` | Index recherche | 1-10GB | ⚠️ Optionnel (recréable) |
| `minio-data` | Fichiers uploadés | 10-500GB | ✅ Oui (quotidien) |
| `grafana-data` | Dashboards | 100MB | ⚠️ Optionnel |
| `prometheus-data` | Métriques | 1-5GB | ❌ Non |
| `n8n-data` | Workflows | 100MB | ✅ Oui (hebdomadaire) |

---

## 🔐 Fichiers sensibles (NE PAS COMMITER)

```
docker/.env                              # Mots de passe
docker/traefik/letsencrypt/acme.json    # Certificats SSL
docker/waha/.sessions/                  # Sessions WhatsApp
docker/pgadmin/storage/                 # Config PgAdmin
```

Tous ces fichiers sont dans `.gitignore`.

---

## ✅ Checklist déploiement

### Développement local
- [ ] Copier `.env.example` → `.env`
- [ ] Modifier les mots de passe dans `.env`
- [ ] `docker-compose up -d`
- [ ] Vérifier que les 18 services sont UP
- [ ] `docker exec immog-php composer install`
- [ ] `docker exec immog-php php artisan migrate --seed`
- [ ] Tester http://localhost/api/health

### Production
- [ ] Configurer DNS (A records)
- [ ] Changer tous les mots de passe par défaut
- [ ] Configurer Let's Encrypt (email dans traefik.yml)
- [ ] Activer HTTPS dans `traefik/traefik.yml`
- [ ] Désactiver `api.insecure` dans Traefik
- [ ] Configurer IP whitelist pour services admin
- [ ] Augmenter VARNISH_SIZE si nécessaire
- [ ] Configurer les backups automatiques
- [ ] Tester le déploiement sur staging d'abord

---

## 📚 Documentation détaillée

Pour plus d'informations sur chaque service, consultez le `README.md` correspondant:

- **Vue d'ensemble**: `/docker/README.md`
- **Démarrage rapide**: `/docker/QUICK_START.md`
- **Architecture**: `/docker/ARCHITECTURE.md`
- **Nginx**: `/docker/nginx/README.md`
- **PHP**: `/docker/php/README.md`
- **PostgreSQL**: `/docker/postgres/init/README.md`
- **Varnish**: `/docker/varnish/README.md`
- **Traefik**: `/docker/traefik/README.md`
- **Laravel Echo**: `/docker/laravel-echo/README.md`

---

**Dernière mise à jour**: 30 janvier 2025
**Version Docker Compose**: 3.8
**Services**: 18
**Fichiers de config**: 20+
