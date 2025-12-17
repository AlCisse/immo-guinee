# 🏗️ Architecture Docker - ImmoGuinée

Vue d'ensemble de l'architecture microservices de la plateforme ImmoGuinée.

---

## 📊 Diagramme de l'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTERNET / USERS                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   TRAEFIK (Reverse    │
                     │   Proxy + SSL/TLS)    │
                     │   Ports: 80, 443      │
                     └───────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼────────┐  ┌──────▼─────────┐  ┌────▼──────────┐
    │   VARNISH        │  │   NGINX        │  │   LARAVEL     │
    │   (HTTP Cache)   │  │   (Web Server) │  │   ECHO        │
    │   Port: 8080     │  │   Port: 80,443 │  │   Port: 6001  │
    └─────────┬────────┘  └──────┬─────────┘  └────┬──────────┘
              │                  │                  │
              │        ┌─────────▼─────────┐        │
              │        │   PHP-FPM 8.3     │        │
              │        │   (Laravel 11)    │        │
              │        │   Port: 9000      │        │
              │        └─────────┬─────────┘        │
              │                  │                  │
              │    ┌─────────────┼─────────────┐    │
              │    │             │             │    │
    ┌─────────▼────▼───┐  ┌──────▼──────┐  ┌──▼────▼─────────┐
    │   QUEUE WORKER   │  │  SCHEDULER  │  │   REDIS 7+      │
    │   (Async Jobs)   │  │  (Cron)     │  │   Port: 6379    │
    │   No public port │  │  No port    │  │   Broadcasting  │
    └──────────────────┘  └─────────────┘  └──────┬──────────┘
                                                   │
┌──────────────────────────────────────────────────┼──────────────────────┐
│                     DATA LAYER                   │                      │
│                                                  │                      │
│  ┌────────────────────┐  ┌────────────────────┐ │  ┌─────────────────┐ │
│  │   PostgreSQL 15    │  │   Elasticsearch    │ │  │   MinIO (S3)    │ │
│  │   + PostGIS        │  │   8.11.0           │ │  │   Storage       │ │
│  │   Port: 5432       │  │   Port: 9200, 9300 │ │  │   Port: 9000/1  │ │
│  └────────────────────┘  └────────────────────┘ │  └─────────────────┘ │
└──────────────────────────────────────────────────┴──────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     INTEGRATIONS & AUTOMATION                             │
│                                                                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐                    │
│  │   n8n      │  │   WAHA     │  │   External APIs  │                    │
│  │ (Workflows)│  │ (WhatsApp) │  │   (Twilio, OM,   │                    │
│  │  Port:5678 │  │ Port: 3000 │  │    MTN MoMo)     │                    │
│  └────────────┘  └────────────┘  └──────────────────┘                    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     MONITORING & ADMINISTRATION                           │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Prometheus  │  │   Grafana    │  │   PgAdmin    │                   │
│  │  (Metrics)   │  │  (Dashboard) │  │  (DB Admin)  │                   │
│  │  Port: 9090  │  │  Port: 3001  │  │  Port: 5050  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de données

### 1. Requête utilisateur (Navigation web)
```
User → Traefik (SSL) → Varnish (Cache) → Nginx → PHP-FPM → PostgreSQL
                                                          ↓
                                                      Redis (Cache)
```

### 2. Requête API (Mobile/Frontend)
```
Mobile App → Traefik (SSL) → Nginx → PHP-FPM → PostgreSQL
                                              ↓
                                          Elasticsearch (Search)
```

### 3. Upload de photos
```
User → Nginx → PHP-FPM → MinIO (S3)
                      ↓
                 Queue (Redis) → Queue Worker → Image Optimization → MinIO
```

### 4. Recherche d'annonces
```
User → Nginx → PHP-FPM → Elasticsearch (Full-text + Geo) → Redis (Cache)
                                                           ↓
                                                       Return results
```

### 5. Temps réel (Messages, notifications)
```
User → Laravel Echo (WebSocket) ← Redis (Pub/Sub) ← PHP-FPM (Broadcast)
```

### 6. Tâches planifiées
```
Scheduler (Cron) → PHP-FPM → [Expire listings, Reindex ES, Backups]
```

### 7. Paiement mobile money
```
User → PHP-FPM → Orange Money / MTN MoMo APIs
              ↓
          Queue → Send notifications (SMS, Email, WhatsApp)
              ↓
         n8n Workflow
```

---

## 🌐 Réseau Docker

Tous les services communiquent via un réseau bridge nommé `immog-network`.

### Résolution DNS interne
Les services peuvent se parler en utilisant leur nom de conteneur:

```yaml
# Exemple dans .env
DB_HOST=postgres              # Au lieu de localhost
REDIS_HOST=redis
ELASTICSEARCH_HOST=elasticsearch
```

### Ports exposés sur l'hôte
Seuls certains services exposent des ports publiquement:

| Service | Port interne | Port hôte | Public ? |
|---------|-------------|-----------|----------|
| Nginx | 80, 443 | 80, 443 | ✅ Oui |
| Traefik | 80, 443, 8080 | 80, 443, 8081 | ✅ Oui |
| PostgreSQL | 5432 | 5432 | ⚠️ Dev uniquement |
| Redis | 6379 | 6379 | ⚠️ Dev uniquement |
| Elasticsearch | 9200 | 9200 | ⚠️ Dev uniquement |
| MinIO Console | 9001 | 9001 | ⚠️ Dev uniquement |
| Grafana | 3000 | 3001 | ⚠️ Admin uniquement |
| PgAdmin | 80 | 5050 | ⚠️ Admin uniquement |
| Laravel Echo | 6001 | 6001 | ✅ Oui (WebSocket) |
| n8n | 5678 | 5678 | ⚠️ Admin uniquement |
| PHP-FPM | 9000 | - | ❌ Non (interne) |
| Queue Worker | - | - | ❌ Non (interne) |
| Scheduler | - | - | ❌ Non (interne) |

**Note Production**: En production, fermez tous les ports marqués "⚠️" sauf si vous utilisez un VPN ou une whitelist IP.

---

## 💾 Volumes persistants

Les données sont stockées dans des volumes Docker nommés:

```yaml
volumes:
  postgres-data:         # Base de données PostgreSQL
  redis-data:            # Cache Redis (optionnel, peut être volatile)
  elasticsearch-data:    # Index de recherche
  minio-data:            # Fichiers uploadés (photos, documents, PDFs)
  n8n-data:              # Workflows n8n
  grafana-data:          # Dashboards Grafana
  prometheus-data:       # Métriques historiques
```

### Backup des volumes
```bash
# Backup d'un volume (exemple: postgres)
docker run --rm \
  -v docker_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restaurer
docker run --rm \
  -v docker_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 🔐 Sécurité

### Secrets management

**Développement (Docker Compose)**:
- Utilise `.env` (non commité dans Git)

**Production (CapRover)**:
- Variables d'environnement chiffrées dans CapRover UI
- Génération automatique de passwords

**Production (Docker Swarm)**:
```bash
# Créer des secrets Docker Swarm
echo "mot_de_passe_db" | docker secret create postgres_password -
echo "mot_de_passe_redis" | docker secret create redis_password -
```

### Isolation réseau

Chaque tier est isolé:

```
┌─────────────────────────────────┐
│  Frontend Tier (Public)         │
│  - Traefik, Nginx, Varnish      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Application Tier (Private)     │
│  - PHP-FPM, Queue, Scheduler    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Data Tier (Private)            │
│  - PostgreSQL, Redis, ES, MinIO │
└─────────────────────────────────┘
```

---

## ⚡ Performance

### Caching strategy

1. **Varnish** (HTTP Cache)
   - Cache les réponses HTTP statiques
   - TTL: 1 heure par défaut
   - Purge automatique sur modification

2. **Redis** (Application Cache)
   - Cache les queries DB fréquentes
   - Cache les sessions utilisateur
   - Cache les résultats Elasticsearch

3. **OPcache** (PHP)
   - Cache le bytecode PHP compilé
   - Réduit le temps d'exécution de ~50%

### Scaling strategy

**Horizontal (plusieurs instances)**:
```bash
# Docker Compose
docker-compose up -d --scale php=3 --scale queue-worker=5

# CapRover
# Via UI: Instances = 3
```

**Services à scaler en priorité**:
1. **php** (2-3 instances) - Application principale
2. **queue-worker** (3-5 instances) - Jobs async
3. **redis** (1 master + 2 replicas) - High availability

**Services à ne PAS scaler**:
- PostgreSQL (utiliser read replicas si nécessaire)
- Elasticsearch (utiliser un cluster si nécessaire)
- Scheduler (doit être unique)

---

## 📦 Dependencies entre services

```
php
├── postgres (MUST)
├── redis (MUST)
├── elasticsearch (SHOULD)
└── minio (SHOULD)

queue-worker
├── php (image)
├── postgres (MUST)
└── redis (MUST)

scheduler
├── php (image)
├── postgres (MUST)
└── redis (MUST)

laravel-echo
└── redis (MUST)

nginx
├── php (MUST)
└── postgres (healthcheck)

varnish
└── nginx (MUST)

traefik
└── nginx (optional)

n8n
└── postgres (optional, utilise SQLite par défaut)

grafana
└── prometheus (SHOULD)
```

**Ordre de démarrage recommandé**:
1. postgres, redis, elasticsearch, minio
2. php
3. queue-worker, scheduler, laravel-echo
4. nginx
5. varnish, traefik
6. n8n, grafana, prometheus

Docker Compose gère cet ordre automatiquement via `depends_on`.

---

## 🔍 Monitoring

### Métriques collectées

**Prometheus** collecte:
- Métriques Laravel (requests, latency, errors)
- Métriques PostgreSQL (connections, queries, cache hit ratio)
- Métriques Redis (memory usage, operations/sec)
- Métriques Nginx (requests/sec, response time)
- Métriques système (CPU, RAM, disk)

**Grafana dashboards**:
1. **Application Overview** - Vue d'ensemble
2. **Database Performance** - PostgreSQL stats
3. **Cache Performance** - Redis + Varnish
4. **Queue Jobs** - Jobs traités, échecs, latency
5. **API Metrics** - Endpoints les plus appelés

### Alertes

Configurez des alertes pour:
- 🚨 CPU > 80% pendant 5 min
- 🚨 RAM > 90% pendant 5 min
- 🚨 Disk > 85%
- 🚨 PostgreSQL connections > 80%
- 🚨 Queue jobs failed > 10/min
- 🚨 API error rate > 5%

---

## 📚 Ressources

### Consommation estimée (développement)

| Service | CPU | RAM | Disk |
|---------|-----|-----|------|
| PostgreSQL | 0.5 core | 512MB | 5GB |
| Redis | 0.1 core | 256MB | 100MB |
| Elasticsearch | 1 core | 2GB | 10GB |
| PHP-FPM (x1) | 0.3 core | 256MB | - |
| Queue Worker | 0.2 core | 128MB | - |
| Nginx | 0.1 core | 64MB | - |
| MinIO | 0.1 core | 128MB | 10GB |
| Autres services | 0.5 core | 1GB | 2GB |
| **TOTAL** | **~3 cores** | **~4.5GB** | **~30GB** |

### Consommation estimée (production)

| Ressource | Minimum | Recommandé | Optimal |
|-----------|---------|------------|---------|
| CPU | 4 cores | 8 cores | 16 cores |
| RAM | 8GB | 16GB | 32GB |
| Disk (SSD) | 50GB | 100GB | 500GB |
| Bande passante | 100Mbps | 1Gbps | 10Gbps |

---

## 🎯 Prochaines étapes

1. ✅ Architecture documentée
2. ✅ Services configurés
3. ⏳ Tests de charge (Apache Bench, K6)
4. ⏳ Optimisation des performances
5. ⏳ Configuration haute disponibilité
6. ⏳ Disaster recovery plan

---

**Version**: 1.0
**Dernière mise à jour**: 30 janvier 2025
**Architecture**: Microservices avec Docker Compose / CapRover / Docker Swarm
