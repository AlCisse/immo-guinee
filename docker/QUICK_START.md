# 🚀 Quick Start - ImmoGuinée Docker

Guide de démarrage rapide pour lancer la plateforme ImmoGuinée en local.

---

## ⚡ Démarrage en 5 minutes

### 1. Prérequis
- Docker 20.10+ installé
- Docker Compose 2.0+ installé
- 8GB RAM minimum
- 20GB espace disque

Vérifier:
```bash
docker --version
docker-compose --version
```

### 2. Configuration
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer les mots de passe (IMPORTANT!)
nano .env
```

**Changez ces valeurs dans .env**:
```env
DB_PASSWORD=votre_password_fort
REDIS_PASSWORD=votre_password_redis
MINIO_ROOT_PASSWORD=votre_password_minio
```

### 3. Lancer Docker
```bash
# Aller dans le dossier docker
cd docker

# Démarrer tous les services (18 conteneurs)
docker-compose up -d

# Attendre ~2 minutes que tout démarre
docker-compose ps
```

### 4. Initialiser Laravel
```bash
# Entrer dans le conteneur PHP
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

### 5. Vérifier que tout fonctionne
```bash
# Tous les services doivent être "healthy"
docker-compose ps

# Tester l'API
curl http://localhost/api/health
# Retour attendu: {"status":"ok","database":"connected","redis":"connected"}

# Tester Elasticsearch
curl http://localhost:9200/_cluster/health
# Retour attendu: {"status":"green"}
```

### 6. Accéder aux interfaces

| Service | URL | Identifiants |
|---------|-----|--------------|
| **Application** | http://localhost | - |
| **API Backend** | http://localhost/api | - |
| **PgAdmin** | http://localhost:5050 | admin@immog.gn / immog_pgadmin_secret |
| **MinIO Console** | http://localhost:9001 | immog_minio / immog_minio_secret |
| **Grafana** | http://localhost:3001 | admin / immog_grafana_secret |
| **n8n** | http://localhost:5678 | admin / immog_n8n_secret |

---

## 📝 Commandes fréquentes

### Gestion des conteneurs
```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer un service
docker-compose restart php

# Voir les logs
docker-compose logs -f php
docker-compose logs --tail=100 queue-worker
```

### Commandes Artisan
```bash
# Migrer la base
docker exec immog-php php artisan migrate

# Lancer les seeders
docker exec immog-php php artisan db:seed

# Vider le cache
docker exec immog-php php artisan cache:clear
docker exec immog-php php artisan config:clear

# Voir les routes
docker exec immog-php php artisan route:list

# Lancer Tinker
docker exec -it immog-php php artisan tinker
```

### Queue et Jobs
```bash
# Voir les jobs en échec
docker exec immog-php php artisan queue:failed

# Relancer tous les jobs échoués
docker exec immog-php php artisan queue:retry all

# Vider la queue
docker exec immog-php php artisan queue:flush
```

### Base de données
```bash
# Se connecter à PostgreSQL
docker exec -it immog-postgres psql -U immog_user -d immog_db

# Backup
docker exec immog-postgres pg_dump -U immog_user immog_db > backup.sql

# Restaurer
cat backup.sql | docker exec -i immog-postgres psql -U immog_user -d immog_db

# Réinitialiser complètement
docker exec immog-php php artisan migrate:fresh --seed
```

### Elasticsearch
```bash
# Vérifier le statut
curl http://localhost:9200/_cluster/health

# Voir les indices
curl http://localhost:9200/_cat/indices?v

# Réindexer
docker exec immog-php php artisan listings:index-elasticsearch --fresh

# Recherche test
curl -X GET "localhost:9200/listings/_search?q=appartement"
```

---

## ⚠️ Problèmes fréquents

### "Cannot connect to Docker daemon"
```bash
# Démarrer Docker Desktop (Windows/Mac)
# Ou démarrer le service Docker (Linux)
sudo systemctl start docker
```

### "Port already in use"
Modifiez les ports dans `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Au lieu de 80:80
```

### "Out of memory"
Augmentez la RAM de Docker:
- Docker Desktop > Settings > Resources > Memory: 8GB

### "Permission denied" sur storage/
```bash
docker exec immog-php chown -R www-data:www-data /var/www/backend/storage
docker exec immog-php chmod -R 755 /var/www/backend/storage
```

### Les jobs ne sont pas traités
```bash
# Redémarrer le worker
docker-compose restart queue-worker

# Vérifier les logs
docker-compose logs queue-worker
```

---

## 🧹 Nettoyage

```bash
# Arrêter tous les conteneurs
docker-compose down

# Supprimer aussi les volumes (⚠️ perte de données!)
docker-compose down -v

# Nettoyer complètement Docker
docker system prune -a
```

---

## 📚 Documentation complète

- **`docker/README.md`** - Documentation complète des 18 services
- **`DEPLOYMENT.md`** - Guide de déploiement production
- **`DOCKER_SETUP.md`** - Vue d'ensemble de la configuration Docker
- **`.env.example`** - Template des variables d'environnement

---

## 🆘 Besoin d'aide ?

### Vérifier l'état des services
```bash
# Voir tous les conteneurs
docker-compose ps

# Vérifier un service spécifique
docker-compose logs php
docker-compose logs postgres
```

### Redémarrer proprement
```bash
# Arrêter
docker-compose down

# Reconstruire les images
docker-compose build --no-cache

# Redémarrer
docker-compose up -d
```

### Tester les connexions
```bash
# PostgreSQL
docker exec immog-postgres pg_isready -U immog_user

# Redis
docker exec immog-redis redis-cli -a immog_redis_secret ping

# Elasticsearch
curl http://localhost:9200/_cluster/health
```

---

## ✅ Checklist de démarrage

- [ ] Docker et Docker Compose installés
- [ ] Fichier `.env` créé et configuré
- [ ] `docker-compose up -d` exécuté
- [ ] Tous les services sont "healthy" (`docker-compose ps`)
- [ ] `composer install` exécuté dans le conteneur PHP
- [ ] `php artisan key:generate` exécuté
- [ ] `php artisan passport:install` exécuté
- [ ] `php artisan migrate --seed` exécuté
- [ ] API accessible sur http://localhost/api/health
- [ ] Elasticsearch accessible sur http://localhost:9200
- [ ] Listings indexés dans Elasticsearch

---

**Temps total estimé**: ~5 minutes (hors téléchargement des images Docker)

**Note**: La première fois, Docker doit télécharger ~5GB d'images. Les démarrages suivants seront beaucoup plus rapides.
