# Plan de Mise à Jour des Dépendances - ImmoGuinée

**Date:** 2025-12-19
**Statut:** Production Critique
**Auteur:** Claude Code

---

## 1. INVENTAIRE ACTUEL

### 1.1 Infrastructure Docker

| Service | Image Actuelle | Version | Type |
|---------|---------------|---------|------|
| PostgreSQL | `postgis/postgis:15-3.4` | 15.x + PostGIS 3.4 | Database |
| Redis | `redis:7-alpine` | 7.x | Cache |
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch:8.11.0` | 8.11.0 | Search |
| Nginx | `nginx:alpine` | latest | Reverse Proxy |
| Traefik | `traefik:latest` | latest | Load Balancer |
| Varnish | `varnish:7.4` | 7.4 | Cache HTTP |
| MinIO | `minio/minio:latest` | latest | Object Storage |
| n8n | `n8nio/n8n:latest` | latest | Automation |
| Grafana | `grafana/grafana:latest` | latest | Monitoring |
| Prometheus | `prom/prometheus:latest` | latest | Metrics |
| Alertmanager | `prom/alertmanager:latest` | latest | Alerting |
| pgAdmin | `dpage/pgadmin4:latest` | latest | DB Admin |
| cAdvisor | `gcr.io/cadvisor/cadvisor:v0.51.0` | 0.51.0 | Container Metrics |
| WAHA | `devlikeapro/waha:latest` | latest | WhatsApp API |
| Laravel Echo | `oanhnn/laravel-echo-server:latest` | latest | WebSockets |

### 1.2 Backend (PHP/Laravel)

| Package | Version Actuelle | Type |
|---------|-----------------|------|
| PHP | 8.3 | Runtime |
| Laravel Framework | ^12.40 | Framework |
| Laravel Passport | ^12.0 | Auth |
| Laravel Sanctum | ^4.0 | Auth |
| Laravel Horizon | ^5.24 | Queue |
| Laravel Scout | ^10.8 | Search |
| Laravel Telescope | ^5.0 | Debug |
| Intervention Image | ^3.5 | Image |
| Spatie Permission | ^6.4 | RBAC |
| DomPDF | ^3.0 | PDF |
| AWS SDK | ^3.368 | S3 |
| PHPUnit | ^11.0 | Test |

### 1.3 Frontend (Node.js/Next.js)

| Package | Version Actuelle | Type |
|---------|-----------------|------|
| Node.js | >=20.0.0 | Runtime |
| Next.js | ^15.1.0 | Framework |
| React | ^18.3.0 | UI |
| TypeScript | ^5.4.0 | Language |
| TailwindCSS | ^3.4.1 | CSS |
| React Query | ^5.28.0 | Data |
| Framer Motion | ^11.18.2 | Animation |
| Axios | ^1.6.7 | HTTP |
| Zod | ^3.22.4 | Validation |

---

## 2. VERSIONS STABLES RECOMMANDÉES (Décembre 2025)

### 2.1 Infrastructure Docker

| Service | Version Recommandée | Breaking Changes | Risque |
|---------|-------------------|------------------|--------|
| PostgreSQL | `postgis/postgis:16-3.5` | Migration PG15→16 requise | MOYEN |
| Redis | `redis:7.4-alpine` | Aucun | FAIBLE |
| Elasticsearch | `8.17.0` | Config xpack changée | MOYEN |
| Nginx | `nginx:1.27-alpine` | Aucun | FAIBLE |
| Traefik | `traefik:v3.3` | Config v2→v3 | MOYEN |
| Varnish | `varnish:7.6` | VCL syntax | FAIBLE |
| MinIO | Pin version `RELEASE.2024-12-13` | API stable | FAIBLE |
| Grafana | `grafana/grafana:11.4.0` | Plugins compat | FAIBLE |
| Prometheus | `prom/prometheus:v3.1.0` | Config format | MOYEN |
| cAdvisor | `v0.51.0` | Déjà stable | AUCUN |

### 2.2 Backend PHP/Laravel

| Package | Version Recommandée | Breaking Changes | Risque |
|---------|-------------------|------------------|--------|
| PHP | 8.3.15 | Déjà sur 8.3 | AUCUN |
| Laravel | 12.x (latest) | Déjà compatible | FAIBLE |
| Passport | ^12.4 | Aucun | FAIBLE |
| Sanctum | ^4.0 | Déjà à jour | AUCUN |
| Horizon | ^5.30 | Aucun | FAIBLE |
| Scout | ^10.12 | Aucun | FAIBLE |
| Intervention | ^3.10 | Aucun | FAIBLE |
| PHPUnit | ^11.5 | Assert methods | FAIBLE |

### 2.3 Frontend Node.js/Next.js

| Package | Version Recommandée | Breaking Changes | Risque |
|---------|-------------------|------------------|--------|
| Node.js | 22.x LTS | API changes | MOYEN |
| Next.js | 15.1.x | **NE PAS passer à 16** | AUCUN |
| React | 18.3.x | Stable | AUCUN |
| TypeScript | 5.7.x | Strict checks | FAIBLE |
| TailwindCSS | 3.4.x | Stable | AUCUN |
| React Query | 5.62.x | Aucun | FAIBLE |
| Axios | 1.7.x | Aucun | FAIBLE |

---

## 3. PLAN DE MIGRATION PAR PHASES

### PHASE 1: Bases de données (Risque: MOYEN)

**Durée estimée:** 2-4 heures
**Fenêtre de maintenance:** Requise

#### 3.1.1 PostgreSQL 15 → 16

```yaml
# docker-compose.yml - AVANT
postgres:
  image: postgis/postgis:15-3.4

# docker-compose.yml - APRÈS
postgres:
  image: postgis/postgis:16-3.5
```

**Procédure:**
1. Backup complet de la base
2. Arrêt des services applicatifs
3. `pg_dump` de toutes les bases
4. Mise à jour de l'image
5. `pg_restore` des données
6. Tests de connectivité

**Tests à exécuter:**
- [ ] Connexion depuis PHP
- [ ] Requêtes spatiales PostGIS
- [ ] Performance des index
- [ ] Migrations Laravel

#### 3.1.2 Redis (Mise à jour mineure)

```yaml
# AVANT
redis:
  image: redis:7-alpine

# APRÈS
redis:
  image: redis:7.4-alpine
```

**Risque:** FAIBLE - Rétrocompatible

---

### PHASE 2: Services applicatifs (Risque: FAIBLE)

#### 3.2.1 PHP - Mise à jour Composer

```json
// composer.json - Mises à jour
{
  "require": {
    "laravel/framework": "^12.40",
    "laravel/horizon": "^5.30",
    "laravel/passport": "^12.4",
    "laravel/scout": "^10.12",
    "intervention/image": "^3.10"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.5"
  }
}
```

**Commandes:**
```bash
composer update --with-all-dependencies
php artisan migrate
php artisan test
```

#### 3.2.2 Frontend - Mise à jour npm

```json
// package.json - Mises à jour
{
  "dependencies": {
    "next": "^15.1.0",  // GARDER - Ne pas passer à 16!
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0"
  }
}
```

**Commandes:**
```bash
npm update
npm audit fix
npm run build
npm run type-check
```

---

### PHASE 3: Infrastructure (Risque: MOYEN)

#### 3.3.1 Elasticsearch 8.11 → 8.17

```yaml
# AVANT
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# APRÈS
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.17.0
```

**Breaking changes:**
- Vérifier la compatibilité des mappings
- Reindexation peut être nécessaire

#### 3.3.2 Traefik (Garder v3.x)

```yaml
# AVANT
traefik:
  image: traefik:latest

# APRÈS - Pin version explicite
traefik:
  image: traefik:v3.3
```

#### 3.3.3 Monitoring Stack

```yaml
# Versions pinnées recommandées
prometheus:
  image: prom/prometheus:v3.1.0

grafana:
  image: grafana/grafana:11.4.0

alertmanager:
  image: prom/alertmanager:v0.28.0
```

---

## 4. ÉLÉMENTS À NE PAS METTRE À JOUR

| Package | Version Actuelle | Raison |
|---------|-----------------|--------|
| Next.js | 15.1.x | **16.x a des bugs critiques avec Turbopack** |
| React | 18.3.x | React 19 pas encore stable pour production |
| pusher-js | 8.4.0-rc2 | **ATTENTION: RC en production - surveiller** |
| laravel-echo-server | latest | Image maintenue mais ancienne |

---

## 5. DÉPENDANCES PROBLÉMATIQUES

### 5.1 pusher-js (RC en production)

```json
// ACTUEL - RISQUE
"pusher-js": "^8.4.0-rc2"

// RECOMMANDÉ - Downgrade vers stable
"pusher-js": "^8.3.0"
```

### 5.2 laravel-echo-server (Image obsolète)

L'image `oanhnn/laravel-echo-server` n'est plus maintenue activement.

**Alternative recommandée:** Soketi
```yaml
laravel-echo:
  image: quay.io/soketi/soketi:1.6-16-debian
```

---

## 6. FICHIERS À MODIFIER

### 6.1 docker-compose.yml

```yaml
# Changements recommandés
services:
  postgres:
    image: postgis/postgis:16-3.5  # 15-3.4 → 16-3.5

  redis:
    image: redis:7.4-alpine  # 7-alpine → 7.4-alpine

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.17.0  # 8.11.0 → 8.17.0

  traefik:
    image: traefik:v3.3  # latest → v3.3

  varnish:
    image: varnish:7.6  # 7.4 → 7.6

  grafana:
    image: grafana/grafana:11.4.0  # latest → 11.4.0

  prometheus:
    image: prom/prometheus:v3.1.0  # latest → v3.1.0
```

### 6.2 frontend/package.json

```json
{
  "dependencies": {
    "pusher-js": "^8.3.0",  // Downgrade RC → stable
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@typescript-eslint/eslint-plugin": "^8.18.0"
  }
}
```

### 6.3 backend/composer.json

```json
{
  "require": {
    "laravel/horizon": "^5.30",
    "laravel/scout": "^10.12"
  }
}
```

---

## 7. CHECKLIST DE VALIDATION

### Avant la mise à jour
- [ ] Backup complet PostgreSQL
- [ ] Backup volumes Docker
- [ ] Tag Git de la version actuelle
- [ ] Tests automatisés passent
- [ ] Fenêtre de maintenance planifiée

### Après chaque phase
- [ ] Services démarrent correctement
- [ ] Healthchecks passent
- [ ] Logs sans erreurs critiques
- [ ] Tests API passent
- [ ] Tests E2E frontend passent

### Validation finale
- [ ] Performance comparable ou meilleure
- [ ] Aucune régression fonctionnelle
- [ ] Monitoring opérationnel
- [ ] Documentation mise à jour

---

## 8. ROLLBACK PLAN

### En cas d'échec

```bash
# 1. Arrêter les services
docker-compose down

# 2. Restaurer les images précédentes
git checkout <previous-tag> -- docker-compose.yml

# 3. Restaurer la base de données
./scripts/restore-postgres.sh <backup-file>

# 4. Redémarrer
docker-compose up -d
```

---

## 9. RÉSUMÉ DES RISQUES

| Niveau | Composants |
|--------|------------|
| **CRITIQUE** | Next.js 16 (NE PAS METTRE À JOUR) |
| **ÉLEVÉ** | PostgreSQL 15→16 (migration données) |
| **MOYEN** | Elasticsearch, Traefik |
| **FAIBLE** | Autres packages |

---

## 10. ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Jour 1 - Préparation**
   - Backups complets
   - Tests de la procédure de rollback

2. **Jour 2 - Frontend & Backend packages**
   - npm update (sans Next.js 16!)
   - composer update
   - Tests

3. **Jour 3 - Services Docker mineurs**
   - Redis, Nginx, Varnish
   - Tests

4. **Jour 4 - Elasticsearch** (fenêtre maintenance)
   - Migration + reindexation
   - Tests search

5. **Jour 5 - PostgreSQL** (fenêtre maintenance longue)
   - pg_dump → upgrade → pg_restore
   - Tests complets

6. **Jour 6 - Monitoring**
   - Grafana, Prometheus
   - Vérification dashboards

7. **Jour 7 - Validation finale**
   - Tests de charge
   - Documentation
