# PHP-FPM 8.3 Configuration

Configuration PHP pour l'application Laravel 11.

## Fichiers

### Dockerfile
Image PHP 8.3-fpm avec toutes les extensions requises:

**Extensions installées**:
- `pdo`, `pdo_pgsql`, `pgsql` - PostgreSQL
- `redis` - Redis cache/sessions/queues
- `imagick` - Manipulation d'images avancée
- `gd` - Manipulation d'images basique
- `zip` - Compression de fichiers
- `intl` - Internationalisation
- `opcache` - Cache de bytecode PHP
- `bcmath` - Calculs de précision
- `mbstring` - Support multi-byte strings
- `exif` - Métadonnées images
- `pcntl` - Process control (pour queue workers)

**Outils d'optimisation d'images**:
- jpegoptim
- optipng
- pngquant
- gifsicle
- webp

### php.ini
Configuration PHP personnalisée:

**Performance**:
- `memory_limit = 512M`
- `max_execution_time = 300` (5 minutes)
- `max_input_time = 300`
- `max_input_vars = 5000`

**Upload de fichiers**:
- `upload_max_filesize = 20M`
- `post_max_size = 25M`

**Sessions**:
- `session.save_handler = redis`
- `session.save_path = "tcp://redis:6379?auth=..."`
- `session.gc_maxlifetime = 86400` (24 heures)

**OPcache**:
- `opcache.enable = 1`
- `opcache.memory_consumption = 128M`
- `opcache.max_accelerated_files = 10000`
- `opcache.revalidate_freq = 2`

**Sécurité**:
- `expose_php = Off`
- `allow_url_include = Off`

**Timezone**:
- `date.timezone = Africa/Conakry`

## Utilisation

### Docker Compose (développement)
```bash
# Builder l'image
docker-compose build php

# Redémarrer le service
docker-compose restart php

# Voir les logs
docker-compose logs -f php
```

### Accéder au conteneur
```bash
# Shell
docker exec -it immog-php bash

# Commandes Artisan
docker exec immog-php php artisan migrate
docker exec immog-php php artisan queue:work
docker exec immog-php php artisan cache:clear
```

### Vérifier la configuration PHP
```bash
# Info PHP
docker exec immog-php php -v
docker exec immog-php php -i

# Extensions installées
docker exec immog-php php -m

# Vérifier une extension spécifique
docker exec immog-php php -m | grep redis
docker exec immog-php php -m | grep imagick

# Configuration actuelle
docker exec immog-php php --ini
```

## Composer

Composer 2 est pré-installé:

```bash
# Version
docker exec immog-php composer --version

# Installer les dépendances
docker exec immog-php composer install

# Mode production
docker exec immog-php composer install --no-dev --optimize-autoloader

# Mettre à jour les dépendances
docker exec immog-php composer update

# Autoload dump
docker exec immog-php composer dump-autoload -o
```

## Tests

### PHPUnit
```bash
# Lancer tous les tests
docker exec immog-php php artisan test

# Tests spécifiques
docker exec immog-php php artisan test --filter=ListingTest

# Avec coverage
docker exec immog-php php artisan test --coverage
```

### PHP CS Fixer
```bash
# Vérifier le code style
docker exec immog-php vendor/bin/php-cs-fixer fix --dry-run --diff

# Corriger automatiquement
docker exec immog-php vendor/bin/php-cs-fixer fix
```

## Optimisation

### OPcache
```bash
# Vérifier le statut OPcache
docker exec immog-php php -r "var_dump(opcache_get_status());"

# Reset OPcache
docker exec immog-php php artisan opcache:clear
```

### Performance
```bash
# Cache des configs
docker exec immog-php php artisan config:cache

# Cache des routes
docker exec immog-php php artisan route:cache

# Cache des vues
docker exec immog-php php artisan view:cache

# Tout cacher
docker exec immog-php php artisan optimize

# Tout nettoyer
docker exec immog-php php artisan optimize:clear
```

## Permissions

Les permissions doivent être correctes pour Laravel:

```bash
# Réparer les permissions
docker exec immog-php chown -R www-data:www-data /var/www/backend/storage
docker exec immog-php chown -R www-data:www-data /var/www/backend/bootstrap/cache
docker exec immog-php chmod -R 755 /var/www/backend/storage
docker exec immog-php chmod -R 755 /var/www/backend/bootstrap/cache
```

## Debugging

### Xdebug (optionnel)
Pour activer Xdebug en développement, ajoutez au Dockerfile:

```dockerfile
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

COPY xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini
```

Créez `xdebug.ini`:
```ini
[xdebug]
xdebug.mode=debug
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.start_with_request=yes
```

### Logs d'erreurs
```bash
# Voir les logs PHP
docker exec immog-php tail -f /var/log/php/error.log

# Logs Laravel
docker exec immog-php tail -f storage/logs/laravel.log
```

## Troubleshooting

### Extension manquante
```bash
# Installer une nouvelle extension
docker exec immog-php pecl install mongodb
docker exec immog-php docker-php-ext-enable mongodb
docker-compose restart php
```

### Problème de mémoire
Augmentez `memory_limit` dans `php.ini`:
```ini
memory_limit = 1G
```

Puis redémarrez:
```bash
docker-compose restart php
```

### Composer out of memory
```bash
# Désactiver la limite mémoire pour Composer
docker exec immog-php php -d memory_limit=-1 /usr/bin/composer install
```

### Redis connection failed
Vérifiez le mot de passe dans `php.ini`:
```ini
session.save_path = "tcp://redis:6379?auth=immog_redis_secret"
```

## Production

En production, utilisez le Dockerfile racine (Alpine) qui est optimisé:
- Image plus légère (~200MB vs ~500MB)
- Pas de dev dependencies
- OPcache optimisé
- Preloading activé
