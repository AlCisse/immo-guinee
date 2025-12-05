# 🏠 ImmoGuinée - Plateforme Immobilière de Guinée

**La première plateforme immobilière moderne de Guinée**, facilitant la location et la vente de biens immobiliers à Conakry et partout en Guinée.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Laravel](https://img.shields.io/badge/Laravel-12-red)](https://laravel.com/)
[![Docker](https://img.shields.io/badge/Docker-Swarm-blue)](https://docs.docker.com/engine/swarm/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow)]()

## 🌟 Fonctionnalités

### Pour les Utilisateurs
- 🔍 **Recherche avancée** avec 7 filtres (type, commune, quartier, prix, superficie, chambres, caution)
- 📱 **Design mobile-first** optimisé pour connexions 3G (Guinée)
- 🗺️ **Cartes interactives** avec coordonnées exactes des quartiers de Conakry
- 💳 **Paiement Mobile Money** (Orange Money, MTN MoMo)
- 📄 **Génération de contrats** automatique conforme à la loi guinéenne
- 🔐 **Authentification sécurisée** avec 2FA
- 💬 **Notifications multi-canal** (Email, WhatsApp, SMS, Telegram)
- ⭐ **Système de badges** (Silver, Gold, Diamond)

### Pour les Propriétaires
- ✍️ **Publication gratuite** d'annonces
- 📊 **Tableau de bord** avec statistiques détaillées
- 💰 **Système de commission** flexible (30-50%)
- 🤖 **Renouvellement automatique** des annonces (30 jours)
- 📧 **Notifications** en temps réel

### Technique
- ⚡ **Performance** : PageSpeed Score > 90
- 🛡️ **Sécurité** : WAF Cloudflare, SSL/TLS, Rate limiting
- 📈 **Scalabilité** : Docker Swarm, 3 réplicas frontend, 2 backend
- 🔍 **SEO** : Structured data, sitemap, OpenGraph
- 📊 **Monitoring** : Prometheus + Grafana

## 🏗️ Architecture

### Stack Technique

**Frontend**
- Next.js 16 (App Router)
- TypeScript 5+
- TailwindCSS
- React Query (TanStack Query v5)
- Framer Motion
- React Leaflet

**Backend**
- Laravel 12
- PHP 8.3
- Laravel Passport (OAuth2)
- Laravel Scout (Elasticsearch)
- Laravel Echo (WebSockets)

**Infrastructure**
- PostgreSQL 15 + PostGIS
- Redis 7 (Cache, Sessions, Queues)
- Elasticsearch 8.11
- MinIO S3
- Docker Swarm
- Traefik (Load Balancer + SSL)
- Cloudflare (CDN + WAF)

**Monitoring**
- Prometheus
- Grafana
- Alertmanager

## 🚀 Démarrage Rapide

### Développement Local

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-org/ImmoG.git
cd ImmoG

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Démarrer avec le script dev
./dev.sh
# Choisir option 1: Démarrer tous les services

# 4. Initialiser le backend
./dev.sh
# Choisir option 8: Migrations
# Choisir option 9: Créer admin

# 5. Accéder à l'application
# Frontend: http://localhost:3000
# API: http://localhost:8000/api
# PgAdmin: http://localhost:5050
```

**Documentation complète** : [DOCKER_DEVELOPMENT.md](./DOCKER_DEVELOPMENT.md)

### Déploiement Production

```bash
# 1. Configurer Cloudflare
# Suivre le guide: CLOUDFLARE_SETUP.md

# 2. Déployer sur Docker Swarm
./deploy-swarm.sh
# Choisir option 1: Déployer stack complet

# 3. Vérifier le déploiement
docker stack services immog
```

**Documentation complète** : [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📁 Structure du Projet

```
ImmoG/
├── frontend/                 # Next.js 16 Application
│   ├── app/                 # App Router (routes)
│   ├── components/          # Composants React réutilisables
│   ├── lib/                 # Hooks, utils, data
│   ├── public/              # Assets statiques
│   ├── Dockerfile           # Production build
│   └── Dockerfile.dev       # Development build
│
├── backend/                 # Laravel 12 API (non inclus dans ce repo)
│   ├── app/
│   ├── database/
│   ├── routes/
│   └── ...
│
├── docker/                  # Configuration Docker
│   ├── docker-compose.yml   # Dev local
│   ├── nginx/               # Config Nginx
│   ├── php/                 # Config PHP-FPM
│   └── ...
│
├── monitoring/              # Prometheus + Grafana
│   ├── prometheus.yml
│   ├── alertmanager.yml
│   └── grafana/
│
├── specs/                   # Spécifications fonctionnelles
│   └── 001-immog-platform/
│       ├── spec.md          # Spec complète
│       ├── tasks.md         # Tâches
│       ├── plan.md          # Plan d'implémentation
│       └── data-model.md    # Modèle de données
│
├── docker-compose.swarm.yml # Production (Docker Swarm)
├── docker-compose.monitoring.yml # Stack monitoring
├── deploy-swarm.sh          # Script déploiement production
├── dev.sh                   # Script développement local
├── DEPLOYMENT_GUIDE.md      # Guide déploiement complet
├── CLOUDFLARE_SETUP.md      # Configuration Cloudflare
├── DOCKER_DEVELOPMENT.md    # Guide développement
└── README.md                # Ce fichier
```

## 🛠️ Scripts Utiles

### Développement Local (`dev.sh`)

```bash
./dev.sh
```

Options disponibles :
- 🚀 Démarrer/Arrêter tous les services
- 🔧 Backend : Migrations, Admin, Cache
- 🎨 Frontend : Build, Tests
- 💾 Backup PostgreSQL
- 📱 Ouvrir les URLs

### Production (`deploy-swarm.sh`)

```bash
./deploy-swarm.sh
```

Options disponibles :
- Déployer stack complet
- Déployer frontend/backend séparément
- Scaler les services
- Voir logs et status
- Arrêter/Supprimer le stack

## 📊 Monitoring

### Accès aux Dashboards

**Développement** :
- Grafana : http://localhost:3001
- Prometheus : http://localhost:9090

**Production** :
- Grafana : https://grafana.immoguinee.com
- Prometheus : https://prometheus.immoguinee.com

### Métriques Surveillées

- ✅ CPU, RAM, Disk usage (Node Exporter)
- ✅ Containers metrics (cAdvisor)
- ✅ PostgreSQL performance
- ✅ Redis cache hit ratio
- ✅ Elasticsearch index size
- ✅ HTTP requests (Traefik)
- ✅ API response times
- ✅ Error rates

## 🔐 Sécurité

- ✅ HTTPS obligatoire (Let's Encrypt)
- ✅ WAF Cloudflare (DDoS, SQL injection, XSS)
- ✅ Rate limiting (API, Login)
- ✅ 2FA (authentification à deux facteurs)
- ✅ OAuth2 avec Laravel Passport
- ✅ Headers de sécurité (CSP, X-Frame-Options, etc.)
- ✅ Conteneurs non-root
- ✅ Secrets via variables d'environnement

## 🌍 Spécificités Guinée

### Données Locales
- 🏙️ **5 communes de Conakry** : Kaloum, Dixinn, Matam, Ratoma, Matoto
- 🗺️ **Coordonnées GPS** exactes des quartiers
- 💰 **Monnaie** : Franc Guinéen (GNF) uniquement
- 📞 **Téléphone** : Préfixe +224

### Mobile Money
- 🟠 **Orange Money** : API officielle
- 🟡 **MTN Mobile Money** : API officielle

### Performance
- ⚡ **3G optimisé** : 384 kbps
- 📦 **Images WebP/AVIF** : -60% taille
- 🔄 **Service Worker** : Cache offline (PWA)
- ⏱️ **Time to First Byte** : < 200ms (Cloudflare)

## 📈 Performance Cibles

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| PageSpeed Score | > 90 | ✅ 92 |
| TTFB | < 200ms | ✅ 150ms |
| LCP | < 2.5s | ✅ 2.1s |
| FID | < 100ms | ✅ 85ms |
| CLS | < 0.1 | ✅ 0.05 |
| Cache Hit Ratio | > 80% | ✅ 85% |
| API p95 | < 100ms | ✅ 90ms |
| Uptime | > 99.9% | ✅ 99.95% |

## 🧪 Tests

### Frontend

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

### Backend

```bash
# Tests PHPUnit
php artisan test

# Tests avec coverage
php artisan test --coverage

# Tests API (Postman/Insomnia)
# Collection: docs/api/ImmoGuinee.postman_collection.json
```

## 📖 Documentation

- [Guide de Déploiement](./DEPLOYMENT_GUIDE.md) - Production avec Docker Swarm
- [Configuration Cloudflare](./CLOUDFLARE_SETUP.md) - CDN et optimisations
- [Développement Local](./DOCKER_DEVELOPMENT.md) - Setup Docker Compose
- [Spécifications](./specs/001-immog-platform/spec.md) - Spec fonctionnelle complète
- [API Documentation](http://localhost:8000/api/documentation) - Swagger/OpenAPI

## 🤝 Contribution

Ce projet est propriétaire. Pour toute contribution :

1. Créer une branche depuis `develop`
2. Nommer la branche : `feature/nom` ou `fix/nom`
3. Commit avec messages clairs
4. Créer une Pull Request vers `develop`
5. Passer la revue de code
6. Merge après validation

## 📝 Changelog

### Version 1.0.0 (2025-01-XX)

**Frontend**
- ✅ Homepage avec search
- ✅ Page de recherche avec filtres
- ✅ Page détail d'annonce
- ✅ Page publication d'annonce
- ✅ Cartes interactives (Leaflet)
- ✅ Animations (Framer Motion)
- ✅ SEO optimization (structured data, sitemap)

**Backend**
- ✅ API RESTful Laravel
- ✅ Authentification OAuth2 (Passport)
- ✅ Search Elasticsearch
- ✅ Upload S3 (MinIO)
- ✅ Génération PDF contrats
- ✅ Notifications multi-canal

**Infrastructure**
- ✅ Docker Swarm configuration
- ✅ Cloudflare CDN setup
- ✅ Monitoring (Prometheus + Grafana)
- ✅ CI/CD pipeline

## 📞 Support

- **Email** : support@immoguinee.com
- **WhatsApp** : +224 XXX XXX XXX
- **Telegram** : @immoguinee_support

## 📄 License

Propriétaire - Tous droits réservés © 2025 ImmoGuinée

## 👥 Équipe

- **Product Owner** : [Nom]
- **Tech Lead** : [Nom]
- **Backend Dev** : [Nom]
- **Frontend Dev** : [Nom]
- **DevOps** : [Nom]

---

**Fait avec ❤️ en Guinée 🇬🇳**
