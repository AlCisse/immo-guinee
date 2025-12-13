# Guide de Développement Local avec Docker - ImmoGuinée

Ce guide vous aide à démarrer l'environnement de développement local avec Docker Compose.

## 📋 Prérequis

- **Docker Desktop** : Windows, macOS, ou Linux
- **Docker Compose** : Version 3.8+
- **Git** : Pour cloner le dépôt
- **RAM** : Minimum 8 GB (16 GB recommandé)
- **Stockage** : 20 GB d'espace libre

## 🚀 Démarrage Rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-org/ImmoG.git
cd ImmoG
```

### 2. Copier les variables d'environnement

```bash
cp .env.example .env
```

### 3. Modifier le fichier `.env` pour le développement local

Éditez `.env` et ajustez ces variables pour le dev local :

```env
# Application
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_ECHO_HOST=localhost
NEXT_PUBLIC_ECHO_PORT=6001
FRONTEND_PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
```

### 4. Démarrer les services

```bash
cd docker
docker-compose up -d
```

Cela va démarrer tous les services :
- ✅ **PostgreSQL** (port 5432)
- ✅ **Redis** (port 6379)
- ✅ **Elasticsearch** (port 9200)
- ✅ **Frontend Next.js** (port 3000)
- ✅ **Backend Laravel** via Nginx (port 8000)
- ✅ **MinIO S3** (port 9000, console 9001)
- ✅ **n8n** (port 5678)
- ✅ **Grafana** (port 3001)
- ✅ **Prometheus** (port 9090)
- ✅ **PgAdmin** (port 5050)
- ✅ **Traefik Dashboard** (port 8081)

### 5. Vérifier que les services sont up

```bash
docker-compose ps
```

Tous les services devraient avoir le status `Up` ou `Up (healthy)`.

### 6. Initialiser le backend Laravel

```bash
# Entrer dans le conteneur PHP
docker-compose exec php bash

# Installer les dépendances Composer
composer install

# Générer la clé d'application
php artisan key:generate

# Exécuter les migrations
php artisan migrate

# Créer un utilisateur admin
php artisan user:create-admin

# (Optionnel) Seeder les données de test
php artisan db:seed

# Quitter le conteneur
exit
```

### 7. Accéder aux applications

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend Next.js** | http://localhost:3000 | - |
| **API Laravel** | http://localhost:8000/api | - |
| **PgAdmin** | http://localhost:5050 | admin@immog.gn / immog_pgadmin_secret |
| **MinIO Console** | http://localhost:9001 | immog_minio / immog_minio_secret |
| **Grafana** | http://localhost:3001 | admin / immog_grafana_secret |
| **Prometheus** | http://localhost:9090 | - |
| **n8n** | http://localhost:5678 | admin / immog_n8n_secret |
| **Traefik Dashboard** | http://localhost:8081 | - |

## 🔄 Workflow de Développement

### Frontend (Next.js)

Le frontend est en mode **hot reload** :

```bash
# Voir les logs
docker-compose logs -f frontend

# Redémarrer le frontend
docker-compose restart frontend

# Installer de nouvelles dépendances npm
docker-compose exec frontend npm install <package-name>

# Build pour tester en production
docker-compose exec frontend npm run build
```

**Fichiers surveillés** : Tous les fichiers dans `frontend/` sont montés en volume.
Toute modification sera détectée automatiquement et le serveur rechargera.

### Backend (Laravel)

Le backend utilise **PHP-FPM avec Nginx** :

```bash
# Voir les logs
docker-compose logs -f php nginx

# Redémarrer PHP
docker-compose restart php

# Installer de nouvelles dépendances Composer
docker-compose exec php composer require <package-name>

# Exécuter une migration
docker-compose exec php php artisan migrate

# Créer une nouvelle migration
docker-compose exec php php artisan make:migration <name>

# Créer un nouveau contrôleur
docker-compose exec php php artisan make:controller <NameController>

# Lancer les tests
docker-compose exec php php artisan test

# Lancer PHPUnit avec coverage
docker-compose exec php php artisan test --coverage
```

### Base de Données

**PostgreSQL avec PgAdmin** :

```bash
# Se connecter à PostgreSQL via CLI
docker-compose exec postgres psql -U immog_user -d immog_db

# Créer un dump de la base
docker-compose exec postgres pg_dump -U immog_user immog_db > backup.sql

# Restaurer un dump
cat backup.sql | docker-compose exec -T postgres psql -U immog_user immog_db

# Via PgAdmin : http://localhost:5050
# Ajouter un serveur :
# - Host: postgres
# - Port: 5432
# - Database: immog_db
# - Username: immog_user
# - Password: REDACTED_DB_PASSWORD
```

### Redis

```bash
# Accéder au CLI Redis
docker-compose exec redis redis-cli -a immog_redis_secret

# Voir toutes les clés
> KEYS *

# Vider le cache
> FLUSHDB

# Voir les infos
> INFO
```

### Elasticsearch

```bash
# Vérifier le status
curl http://localhost:9200/_cluster/health?pretty

# Voir tous les indices
curl http://localhost:9200/_cat/indices?v

# Rechercher dans l'index listings
curl http://localhost:9200/listings/_search?pretty

# Supprimer un index
curl -X DELETE http://localhost:9200/listings
```

## 🛠️ Commandes Utiles

### Démarrer/Arrêter les services

```bash
# Démarrer tous les services
docker-compose up -d

# Démarrer uniquement certains services
docker-compose up -d postgres redis frontend

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ perte de données !)
docker-compose down -v

# Redémarrer un service
docker-compose restart frontend

# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f frontend
```

### Build et Rebuild

```bash
# Rebuild un service après modification du Dockerfile
docker-compose build frontend

# Rebuild sans cache
docker-compose build --no-cache frontend

# Rebuild et restart
docker-compose up -d --build frontend
```

### Debugging

```bash
# Entrer dans un conteneur
docker-compose exec frontend sh
docker-compose exec php bash

# Voir l'utilisation des ressources
docker stats

# Inspecter un service
docker-compose exec frontend env

# Voir les processus
docker-compose top
```

## 🧪 Tests

### Frontend Tests

```bash
# Tests unitaires Jest
docker-compose exec frontend npm test

# Tests E2E Playwright
docker-compose exec frontend npm run test:e2e

# Coverage
docker-compose exec frontend npm run test:coverage
```

### Backend Tests

```bash
# Tests PHPUnit
docker-compose exec php php artisan test

# Tests avec coverage
docker-compose exec php php artisan test --coverage

# Tests d'une feature spécifique
docker-compose exec php php artisan test --filter=ListingTest
```

## 📦 Gestion des Dépendances

### Frontend

```bash
# Installer une dépendance
docker-compose exec frontend npm install <package>

# Installer une dépendance de dev
docker-compose exec frontend npm install -D <package>

# Mettre à jour les dépendances
docker-compose exec frontend npm update

# Vérifier les vulnérabilités
docker-compose exec frontend npm audit
```

### Backend

```bash
# Installer une dépendance
docker-compose exec php composer require <package>

# Installer une dépendance de dev
docker-compose exec php composer require --dev <package>

# Mettre à jour les dépendances
docker-compose exec php composer update

# Vérifier les vulnérabilités
docker-compose exec php composer audit
```

## 🐛 Troubleshooting

### Le frontend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs frontend

# Problème : node_modules manquants
docker-compose exec frontend npm install

# Problème : port 3000 déjà utilisé
# Changer FRONTEND_PORT dans .env
```

### Le backend retourne 502

```bash
# Vérifier que PHP-FPM est up
docker-compose ps php

# Vérifier les logs
docker-compose logs php nginx

# Redémarrer PHP et Nginx
docker-compose restart php nginx
```

### Impossible de se connecter à PostgreSQL

```bash
# Vérifier que PostgreSQL est up
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres

# Tester la connexion
docker-compose exec postgres psql -U immog_user -d immog_db
```

### Elasticsearch ne démarre pas

```bash
# Problème fréquent : mémoire insuffisante
# Solution : Augmenter la mémoire Docker Desktop (Settings > Resources > Memory > 8 GB minimum)

# Vérifier les logs
docker-compose logs elasticsearch

# Redémarrer avec plus de mémoire
docker-compose down
docker-compose up -d elasticsearch
```

### Cache problématique

```bash
# Vider le cache Redis
docker-compose exec redis redis-cli -a immog_redis_secret FLUSHDB

# Vider le cache Laravel
docker-compose exec php php artisan cache:clear
docker-compose exec php php artisan config:clear
docker-compose exec php php artisan route:clear
docker-compose exec php php artisan view:clear
```

## 🔒 Sécurité en Développement

⚠️ **IMPORTANT** : Les credentials par défaut dans `.env.example` sont pour le développement local uniquement.

**NE JAMAIS** :
- Commiter le fichier `.env` avec des vraies credentials
- Utiliser les mots de passe par défaut en production
- Exposer les ports des services sur Internet
- Désactiver HTTPS en production

## 📊 Monitoring en Développement

### Grafana

1. Accédez à http://localhost:3001
2. Login : `admin` / `immog_grafana_secret`
3. Importez les dashboards depuis `monitoring/grafana/dashboards/`

### Prometheus

- URL : http://localhost:9090
- Query examples :
  ```promql
  # CPU usage
  rate(container_cpu_usage_seconds_total[5m])

  # Memory usage
  container_memory_usage_bytes

  # HTTP requests
  traefik_entrypoint_requests_total
  ```

## 🚀 Passer en Production

Quand vous êtes prêt pour la production, suivez le guide : [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)

**Différences Dev vs Prod** :

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Orchestration** | Docker Compose | Docker Swarm |
| **Frontend** | Hot reload (npm dev) | Build optimisé (standalone) |
| **SSL/TLS** | HTTP uniquement | HTTPS avec Let's Encrypt |
| **Cache** | Désactivé | Cloudflare + Redis |
| **Logging** | Console | Fichiers + Sentry |
| **Debugging** | Activé | Désactivé |
| **Réplicas** | 1 par service | 3 frontend, 2 backend |
| **Health checks** | Optionnel | Obligatoire |

## 📚 Documentation

- [Guide de déploiement](./DEPLOYMENT_GUIDE.md)
- [Configuration Cloudflare](./CLOUDFLARE_SETUP.md)
- [Spécifications](./specs/001-immog-platform/)
- [API Documentation](http://localhost:8000/api/documentation)

## Support

Pour toute question :
- Ouvrir une issue sur GitHub
- Email : dev@immoguinee.com

---

**Bon développement ! 🎉**
