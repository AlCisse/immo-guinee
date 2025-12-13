# Varnish HTTP Cache

Varnish 7.4 configuré pour accélérer les requêtes HTTP en cachant les réponses.

## Configuration

### default.vcl
Configuration Varnish Cache Language (VCL):

**Backend**: Nginx sur port 80

**Stratégie de cache**:
- Fichiers statiques: 7 jours
- API listings/search: 5 minutes (FR-094)
- Pages dynamiques: Pas de cache si authentifié
- Admin: Jamais caché

**ACL Purge**:
Seuls les IPs suivants peuvent purger le cache:
- localhost
- nginx (conteneur)

## Fonctionnement

### Requêtes mises en cache
✅ Fichiers statiques (images, CSS, JS, fonts)
✅ API `/api/listings/search` (GET uniquement, 5 min)
✅ GET et HEAD requests non authentifiées

### Requêtes NON mises en cache
❌ POST, PUT, PATCH, DELETE
❌ Requêtes avec header `Authorization`
❌ Requêtes avec cookie `laravel_session`
❌ Admin area (`/admin`, `/api/admin`)
❌ Erreurs 5xx

## Utilisation

### Accéder à Varnish
```bash
# Via HTTP (sans cache)
curl http://localhost/api/health

# Via Varnish (avec cache)
curl http://localhost:8080/api/health
```

### Vérifier si une requête est mise en cache
```bash
curl -I http://localhost:8080/api/listings/search?q=appartement

# Headers à vérifier:
# X-Cache: HIT (mis en cache)
# X-Cache: MISS (non mis en cache)
# X-Cache-Hits: 5 (nombre de hits)
```

### Purger le cache

**Purge complète** (depuis nginx ou localhost):
```bash
curl -X PURGE http://localhost:8080/
```

**Purge d'une URL spécifique**:
```bash
curl -X PURGE http://localhost:8080/api/listings/search?q=appartement
```

**Depuis Laravel** (via helper):
```php
// app/Helpers/CacheHelper.php
public static function purgeVarnish(string $url): bool
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://varnish:80" . $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PURGE");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    curl_close($ch);
    return $result !== false;
}

// Utilisation
CacheHelper::purgeVarnish('/api/listings/search');
```

## Statistiques

### Varnishstat
```bash
# Statistiques en temps réel
docker exec immog-varnish varnishstat

# Metrics spécifiques
docker exec immog-varnish varnishstat -1 | grep cache_hit
docker exec immog-varnish varnishstat -1 | grep cache_miss

# Hit ratio
docker exec immog-varnish varnishstat -1 -f MAIN.cache_hit -f MAIN.cache_miss
```

### Varnishlog
```bash
# Voir toutes les requêtes
docker exec immog-varnish varnishlog

# Filtrer par requête
docker exec immog-varnish varnishlog -q "ReqURL ~ '/api/listings'"

# Voir seulement les hits
docker exec immog-varnish varnishlog -q "VCL_call eq HIT"

# Voir seulement les miss
docker exec immog-varnish varnishlog -q "VCL_call eq MISS"
```

### Varnishtop
```bash
# URLs les plus demandées
docker exec immog-varnish varnishtop -i ReqURL

# User-agents les plus fréquents
docker exec immog-varnish varnishtop -i ReqHeader -I User-Agent
```

## Performance

### Cache hit ratio
Un bon cache hit ratio est > 80%.

```bash
# Calculer le hit ratio
docker exec immog-varnish varnishstat -1 -f MAIN.cache_hit -f MAIN.cache_miss | awk '
  /cache_hit/ {hit=$2}
  /cache_miss/ {miss=$2}
  END {
    total = hit + miss
    ratio = (hit / total) * 100
    printf "Hit ratio: %.2f%% (Hits: %d, Miss: %d)\n", ratio, hit, miss
  }
'
```

### Augmenter la taille du cache
Dans `docker-compose.yml`:
```yaml
varnish:
  environment:
    - VARNISH_SIZE=512M  # Au lieu de 256M
```

## Monitoring avec Prometheus

Varnish exporte des métriques Prometheus:

```bash
# Installer varnish_exporter
docker run -d \
  --name varnish-exporter \
  --network immog-network \
  -p 9131:9131 \
  prom/varnish-exporter \
  --varnish.instance=varnish:6081
```

Métriques disponibles:
- `varnish_main_cache_hit`
- `varnish_main_cache_miss`
- `varnish_main_client_req`
- `varnish_backend_req`

## Troubleshooting

### Cache ne fonctionne pas
```bash
# Vérifier les logs
docker logs immog-varnish

# Vérifier la config VCL
docker exec immog-varnish cat /etc/varnish/default.vcl

# Recharger la config
docker-compose restart varnish
```

### Toujours X-Cache: MISS
Vérifiez:
- Les cookies (Laravel session empêche le cache)
- Le header Authorization
- La méthode HTTP (POST n'est jamais caché)
- L'URL (admin n'est jamais caché)

```bash
# Debug d'une requête
docker exec immog-varnish varnishlog -g request -q "ReqURL eq '/api/listings/search'"
```

### Backend unhealthy
```bash
# Vérifier que Nginx répond
docker exec immog-varnish curl http://nginx:80/api/health

# Vérifier les backends
docker exec immog-varnish varnishadm backend.list
```

## Règles de cache personnalisées

Pour ajouter de nouvelles règles de cache, éditez `default.vcl`:

### Cacher une nouvelle route API
```vcl
# Dans vcl_backend_response
if (bereq.url ~ "^/api/quartiers" && bereq.method == "GET") {
    set beresp.ttl = 1h;
    set beresp.http.Cache-Control = "public, max-age=3600";
}
```

### Exclure une route du cache
```vcl
# Dans vcl_recv
if (req.url ~ "^/api/payments") {
    return (pass);
}
```

### Cacher même si cookie présent
```vcl
# Dans vcl_recv
if (req.url ~ "^/api/public") {
    unset req.http.Cookie;
}
```

## Production Checklist

- [ ] Augmenter VARNISH_SIZE selon la RAM (1-2GB recommandé)
- [ ] Restreindre ACL purge aux IPs du serveur uniquement
- [ ] Activer grace mode pour servir du stale content
- [ ] Configurer Prometheus monitoring
- [ ] Tester le hit ratio régulièrement
- [ ] Ajouter des alertes si hit ratio < 70%
