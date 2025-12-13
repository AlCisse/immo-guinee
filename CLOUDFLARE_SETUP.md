# Configuration Cloudflare pour ImmoGuinée

Ce guide explique comment configurer Cloudflare pour optimiser les performances et la sécurité de la plateforme ImmoGuinée.

## 1. Configuration DNS

### A. Enregistrements DNS
Créez les enregistrements DNS suivants dans Cloudflare :

```
Type    Name                  Content              Proxy Status    TTL
A       @                     [SERVER_IP]          Proxied         Auto
A       www                   [SERVER_IP]          Proxied         Auto
A       api                   [SERVER_IP]          Proxied         Auto
A       traefik               [SERVER_IP]          Proxied         Auto
CNAME   minio                 @                    Proxied         Auto
CNAME   n8n                   @                    Proxied         Auto
```

### B. Activation du Proxy Cloudflare
- ✅ Activez le proxy Cloudflare (nuage orange) pour tous les enregistrements
- Cela active automatiquement le CDN, le cache, et les protections DDoS

## 2. Configuration SSL/TLS

### A. Mode SSL/TLS
1. Accédez à **SSL/TLS** > **Overview**
2. Sélectionnez le mode : **Full (strict)** ou **Full**
   - **Full (strict)** : Recommandé si vous utilisez Let's Encrypt avec Traefik
   - **Full** : Si vous avez un certificat auto-signé

### B. Certificat Origin
1. Allez dans **SSL/TLS** > **Origin Server**
2. Créez un certificat Origin Cloudflare (durée : 15 ans)
3. Installez ce certificat sur votre serveur Traefik (optionnel mais recommandé)

### C. Toujours utiliser HTTPS
1. **SSL/TLS** > **Edge Certificates**
2. Activez **Always Use HTTPS**
3. Activez **Automatic HTTPS Rewrites**

## 3. Configuration du Cache

### A. Règles de Cache (Page Rules)

Créez les règles de page suivantes dans l'ordre :

#### Règle 1 : Assets statiques (priorité : 1)
```
URL : *immoguinee.com/_next/static/*
Settings :
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

#### Règle 2 : Images (priorité : 2)
```
URL : *immoguinee.com/_next/image*
Settings :
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Règle 3 : API - Bypass cache (priorité : 3)
```
URL : *immoguinee.com/api/*
Settings :
  - Cache Level: Bypass
```

#### Règle 4 : Pages HTML (priorité : 4)
```
URL : *immoguinee.com/*
Settings :
  - Cache Level: Standard
  - Edge Cache TTL: 2 hours
  - Browser Cache TTL: 4 hours
```

### B. Configuration du Cache (Caching)
1. Accédez à **Caching** > **Configuration**
2. **Caching Level** : Standard
3. **Browser Cache TTL** : Respect Existing Headers

### C. Tiered Cache (Gratuit sur tous les plans)
1. Activez **Tiered Cache** pour améliorer le hit ratio
2. Cela réduit les requêtes vers votre serveur origin

## 4. Optimisation des Performances

### A. Auto Minify
1. **Speed** > **Optimization**
2. Activez **Auto Minify** pour :
   - ✅ JavaScript
   - ✅ CSS
   - ✅ HTML

### B. Brotli Compression
1. Dans **Speed** > **Optimization**
2. Activez **Brotli** (meilleure compression que gzip)

### C. Early Hints
1. Activez **Early Hints** pour pré-charger les ressources critiques
2. Améliore le Time to First Byte (TTFB)

### D. HTTP/3 (QUIC)
1. **Network** > **HTTP/3 (with QUIC)**
2. Activez HTTP/3 pour de meilleures performances réseau

### E. Rocket Loader (Optionnel)
⚠️ **À tester** : Peut causer des problèmes avec React/Next.js
- Désactivé par défaut pour les applications React

## 5. Règles de Transformation (Transform Rules)

### A. Security Headers
Créez une règle de transformation pour ajouter des headers de sécurité :

```
Rule name: Security Headers
When incoming requests match: All incoming requests

Then:
  Set static headers:
    - X-Frame-Options: DENY
    - X-Content-Type-Options: nosniff
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

### B. Cache Headers pour Assets
```
Rule name: Cache Static Assets
When incoming requests match:
  URI Path matches regex: /_next/static/.*

Then:
  Set static headers:
    - Cache-Control: public, max-age=31536000, immutable
```

## 6. Web Application Firewall (WAF)

### A. Managed Rules (Gratuit)
1. **Security** > **WAF**
2. Activez **Free Managed Ruleset**
3. Mode : **High** (bloque les menaces connues)

### B. Rate Limiting (Gratuit jusqu'à 10,000 req/min)
Créez des règles pour protéger contre les abus :

#### API Rate Limit
```
Rule name: API Rate Limit
When incoming requests match:
  URI Path starts with /api/

Then:
  Block for 1 minute when rate exceeds:
    - 100 requests per 1 minute
```

#### Login Rate Limit
```
Rule name: Login Protection
When incoming requests match:
  URI Path is /api/auth/login
  AND Method is POST

Then:
  Block for 15 minutes when rate exceeds:
    - 5 requests per 1 minute
```

## 7. Cloudflare Workers (Optionnel - Plan payant)

Pour une mise en cache avancée, créez un Worker :

```javascript
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Cache statique Next.js
  if (url.pathname.startsWith('/_next/static/')) {
    const cache = caches.default
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const response = await fetch(request)
    const newResponse = new Response(response.body, response)

    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    event.waitUntil(cache.put(request, newResponse.clone()))

    return newResponse
  }

  // API - Pas de cache
  if (url.pathname.startsWith('/api/')) {
    return fetch(request, {
      cf: {
        cacheTtl: 0,
        cacheEverything: false
      }
    })
  }

  // Pages HTML - Cache court
  return fetch(request, {
    cf: {
      cacheTtl: 7200, // 2 heures
      cacheEverything: true
    }
  })
}
```

## 8. Analytics et Monitoring

### A. Analytics
1. Activez **Web Analytics** pour suivre les performances
2. Consultez :
   - Bandwidth saved (économies de bande passante)
   - Cache hit ratio (taux de succès du cache)
   - Threats blocked (menaces bloquées)

### B. Speed Insights
1. Activez **Speed** > **Insights**
2. Suivez Core Web Vitals :
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

## 9. Configuration recommandée pour la Guinée

### A. Network
1. Activez **Argo Smart Routing** (Plan payant) pour améliorer la latence depuis l'Afrique
2. **Load Balancing** pour distribuer le traffic entre plusieurs serveurs (Optionnel)

### B. Image Optimization
1. Activez **Polish** (Plan Pro+) pour optimiser automatiquement les images
   - Lossy compression recommandée
   - WebP automatic conversion

## 10. Vérification de la Configuration

### A. Test du Cache
```bash
# Vérifier les headers de cache
curl -I https://immoguinee.com/_next/static/css/app.css
# Devrait retourner : cf-cache-status: HIT (après le 2e appel)

# Vérifier l'API bypass
curl -I https://immoguinee.com/api/listings
# Devrait retourner : cf-cache-status: BYPASS ou DYNAMIC
```

### B. Test SSL
```bash
# Vérifier le certificat SSL
openssl s_client -connect immoguinee.com:443 -servername immoguinee.com
```

### C. Test Performance
1. Utilisez **Google PageSpeed Insights** : https://pagespeed.web.dev/
2. Cible : Score > 90 pour Mobile et Desktop
3. Utilisez **WebPageTest** pour tester depuis différents pays africains

## 11. Purge du Cache

### Purge Manuelle
1. **Caching** > **Configuration**
2. **Purge Cache** :
   - **Purge Everything** : Vide tout le cache (à utiliser avec précaution)
   - **Custom Purge** : Purge des URLs spécifiques

### Purge Automatique
Configurez votre CI/CD pour purger le cache après chaque déploiement :

```bash
# Purge tout le cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [API_TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge des fichiers spécifiques
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [API_TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://immoguinee.com/_next/static/*"]}'
```

## 12. Budget et Coûts

### Plan Gratuit (Free)
- ✅ CDN global
- ✅ DDoS protection illimitée
- ✅ SSL/TLS gratuit
- ✅ 100,000 requêtes Workers/jour (optionnel)
- ✅ Caching de base
- ✅ WAF basique

### Plan Pro ($20/mois)
- ✅ Tout du plan gratuit
- ✅ Polish (optimisation images)
- ✅ Mobile Redirect
- ✅ Plus de Page Rules (20 vs 3)

### Plan Business ($200/mois)
- ✅ Tout du plan Pro
- ✅ Argo Smart Routing (réduit latence de 30%)
- ✅ WAF avancé
- ✅ Load Balancing

**Recommandation** : Commencez avec le **plan gratuit**, passez au **Pro** si besoin d'optimisation images avancée.

## 13. Checklist de Déploiement

- [ ] DNS configuré avec proxy activé
- [ ] SSL/TLS en mode Full (strict)
- [ ] Always Use HTTPS activé
- [ ] Page Rules créées (cache assets, API bypass)
- [ ] Auto Minify activé (JS, CSS, HTML)
- [ ] Brotli compression activé
- [ ] HTTP/3 activé
- [ ] Security headers configurés
- [ ] WAF activé
- [ ] Rate limiting configuré
- [ ] Analytics activé
- [ ] Test de cache effectué
- [ ] Test de performance effectué (PageSpeed > 90)

## Support

Pour toute question sur Cloudflare :
- Documentation : https://developers.cloudflare.com/
- Community : https://community.cloudflare.com/
- Support : https://support.cloudflare.com/ (Plans payants uniquement)
