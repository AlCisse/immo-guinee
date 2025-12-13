# Traefik Reverse Proxy

Traefik v2.10 configuré comme reverse proxy avec SSL/TLS automatique via Let's Encrypt.

## Fichiers de configuration

### traefik.yml (Static Configuration)
Configuration principale de Traefik:
- **Entry Points**: web (80), websecure (443), traefik (8080)
- **Providers**: Docker + File
- **SSL**: Let's Encrypt avec TLS Challenge
- **Logging**: JSON format avec rotation
- **Metrics**: Prometheus endpoint
- **Dashboard**: Activé sur port 8080

### dynamic/middlewares.yml
Middlewares réutilisables:
- **security-headers**: Headers de sécurité (HSTS, XSS, etc.)
- **cors-headers**: CORS pour API
- **gzip-compression**: Compression Gzip
- **rate-limit-api**: 100 req/min (API générale)
- **rate-limit-auth**: 10 req/min (authentification)
- **rate-limit-search**: 200 req/min (recherche)
- **circuit-breaker**: Protection contre les pannes en cascade
- **admin-whitelist**: IP whitelist pour admin

### dynamic/routers.yml
Routes HTTP et services:
- **backend-api**: api.immoguinee.gn
- **frontend**: immoguinee.gn, www.immoguinee.gn
- **laravel-echo**: ws.immoguinee.gn (WebSocket)
- **minio-console**: minio.immoguinee.gn (admin)
- **grafana**: grafana.immoguinee.gn (admin)
- **n8n**: n8n.immoguinee.gn (admin)

### letsencrypt/acme.json
Stockage des certificats SSL Let's Encrypt.
**IMPORTANT**: Permissions doivent être 600.

## Configuration DNS requise

Pointez ces domaines vers votre serveur:

```
immoguinee.gn           A    IP_DU_SERVEUR
www.immoguinee.gn       A    IP_DU_SERVEUR
api.immoguinee.gn       A    IP_DU_SERVEUR
ws.immoguinee.gn        A    IP_DU_SERVEUR
minio.immoguinee.gn     A    IP_DU_SERVEUR
grafana.immoguinee.gn   A    IP_DU_SERVEUR
n8n.immoguinee.gn       A    IP_DU_SERVEUR
```

## Développement local

Pour tester en local sans DNS:

### /etc/hosts (Linux/Mac)
```
127.0.0.1 immoguinee.local
127.0.0.1 api.immoguinee.local
127.0.0.1 ws.immoguinee.local
```

### C:\Windows\System32\drivers\etc\hosts (Windows)
```
127.0.0.1 immoguinee.local
127.0.0.1 api.immoguinee.local
127.0.0.1 ws.immoguinee.local
```

Puis accédez à: http://immoguinee.local

## SSL/TLS Let's Encrypt

### Production
```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      caServer: "https://acme-v02.api.letsencrypt.org/directory"
```

### Staging (développement)
```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
```

**Note**: Staging évite d'atteindre les limites de rate (50 certificats/semaine).

## Dashboard Traefik

Accès au dashboard:
- **URL**: http://localhost:8081
- **Production**: Désactiver `api.insecure` et utiliser auth basic

## Commandes utiles

### Vérifier la configuration
```bash
docker exec immog-traefik traefik version
```

### Voir les routes
```bash
# Via API
curl http://localhost:8081/api/http/routers

# Via Dashboard
# Ouvrir http://localhost:8081 dans le navigateur
```

### Logs
```bash
# Logs Traefik
docker logs immog-traefik -f

# Access logs
docker exec immog-traefik cat /var/log/traefik/access.log

# Error logs
docker exec immog-traefik cat /var/log/traefik/traefik.log
```

### Forcer le renouvellement SSL
```bash
# Supprimer acme.json
rm docker/traefik/letsencrypt/acme.json

# Recréer avec bonnes permissions
touch docker/traefik/letsencrypt/acme.json
chmod 600 docker/traefik/letsencrypt/acme.json

# Redémarrer Traefik
docker-compose restart traefik
```

## Métriques Prometheus

Traefik expose des métriques sur:
```
http://traefik:8080/metrics
```

Métriques disponibles:
- `traefik_entrypoint_requests_total`
- `traefik_entrypoint_request_duration_seconds`
- `traefik_service_requests_total`
- `traefik_service_request_duration_seconds`

Prometheus est configuré pour scraper ces métriques.

## Rate Limiting

Les limites configurées:

| Endpoint | Rate Limit | Burst |
|----------|------------|-------|
| API générale | 100 req/min | 50 |
| Authentification | 10 req/min | 5 |
| Recherche | 200 req/min | 100 |

Ajustez dans `dynamic/middlewares.yml` selon vos besoins.

## Circuit Breaker

Configuré pour déclencher si:
- Taux d'erreur réseau > 30%
- Taux de 5xx > 25%

Paramètres:
- Check period: 30s
- Fallback duration: 10s
- Recovery duration: 30s

## Sécurité

### Headers appliqués automatiquement
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Referrer-Policy: strict-origin-when-cross-origin`

### IP Whitelist pour admin
Seules les IPs locales/privées peuvent accéder:
- MinIO Console
- Grafana
- n8n

Ajoutez vos IPs dans `dynamic/middlewares.yml`:
```yaml
admin-whitelist:
  ipWhiteList:
    sourceRange:
      - "1.2.3.4/32"  # Votre IP publique
```

## Troubleshooting

### Certificat SSL ne se génère pas
```bash
# Vérifier les logs
docker logs immog-traefik | grep -i acme

# Vérifier que le port 443 est ouvert
sudo netstat -tulpn | grep :443

# Vérifier les permissions acme.json
ls -la docker/traefik/letsencrypt/acme.json
# Devrait être: -rw------- (600)
```

### 502 Bad Gateway
```bash
# Vérifier que le service backend est accessible
docker exec immog-traefik ping nginx
docker exec immog-traefik curl http://nginx:80/api/health

# Vérifier les routes
curl http://localhost:8081/api/http/routers
```

### Trop de redirections
Vérifiez que vous n'avez pas de boucle de redirection:
- Traefik redirige HTTP → HTTPS
- Nginx ne doit PAS rediriger HTTPS → HTTPS

## Production Checklist

- [ ] Changer `api.insecure: false`
- [ ] Activer auth basic pour le dashboard
- [ ] Utiliser Let's Encrypt production (pas staging)
- [ ] Configurer les DNS A records
- [ ] Ajouter vos IPs à admin-whitelist
- [ ] Vérifier permissions acme.json (600)
- [ ] Configurer les alertes Prometheus
- [ ] Tester le renouvellement SSL (60 jours avant expiration)
