# Nginx Virtual Hosts

Ce dossier contient les configurations des virtual hosts pour Nginx.

## Fichiers

### backend.conf
Configuration pour l'API Laravel:
- **Server name**: api.immoguinee.local, localhost
- **Root**: /var/www/backend/public
- **PHP-FPM**: Proxy vers php:9000
- **Rate limiting**:
  - Auth endpoints: 5 req/min
  - Search endpoints: 100 req/min
  - General API: 60 req/min
- **Features**:
  - Headers de sécurité
  - Cache des assets statiques (1 an)
  - WebSocket proxy pour Laravel Echo
  - Health check endpoint

### frontend.conf
Configuration pour le frontend Next.js PWA:
- **Server name**: immoguinee.local, www.immoguinee.local, localhost
- **Root**: /var/www/frontend/.next
- **Features**:
  - Support PWA (Service Worker, manifest.json)
  - Cache optimisé pour _next/static (1 an)
  - Headers de sécurité PWA
  - Proxy vers Next.js server (commenté par défaut)

## Utilisation

Ces fichiers sont automatiquement inclus par nginx.conf via:
```nginx
include /etc/nginx/conf.d/*.conf;
```

## Modification

Pour ajouter un nouveau site:
1. Créer un nouveau fichier `monsite.conf`
2. Redémarrer Nginx: `docker-compose restart nginx`

## Test de configuration

```bash
# Tester la syntaxe
docker exec immog-nginx nginx -t

# Recharger sans downtime
docker exec immog-nginx nginx -s reload
```

## Variables disponibles

Les rate limiting zones définies dans nginx.conf:
- `auth_limit`: 5 req/min pour authentification
- `api_limit`: 60 req/min pour API générale
- `search_limit`: 100 req/min pour recherche
