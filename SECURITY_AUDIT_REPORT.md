# Rapport d'Audit de Sécurité - ImmoGuinée

**Date:** 24 Décembre 2025
**Version:** 1.0
**Auditeur:** Claude Security Analysis
**Niveau de Confidentialité:** CONFIDENTIEL

---

## Résumé Exécutif

Cette analyse de sécurité couvre l'application ImmoGuinée, une plateforme immobilière complète comprenant:
- **Backend:** Laravel 11 (PHP 8.3) avec Laravel Passport OAuth2
- **Frontend:** Next.js 16 avec React 19
- **Mobile:** React Native (Expo 54)
- **Infrastructure:** Docker Swarm avec Traefik, PostgreSQL 15, Redis 7

### Score Global de Sécurité: **B+ (75/100)**

| Catégorie | Score | Évaluation |
|-----------|-------|------------|
| Authentification | 85/100 | Bonne |
| Autorisation (RBAC) | 80/100 | Bonne |
| Protection XSS | 70/100 | Moyenne |
| Protection SQL Injection | 90/100 | Très bonne |
| Gestion des fichiers | 95/100 | Excellente |
| Configuration Infrastructure | 75/100 | Moyenne |
| Gestion des secrets | 65/100 | À améliorer |
| Headers de sécurité | 80/100 | Bonne |

---

## 1. Points Positifs (Forces de Sécurité)

### 1.1 Authentification Robuste
- **OAuth2 via Laravel Passport** avec tokens d'accès (24h) et refresh tokens (30j)
- **2FA TOTP** pour les administrateurs avec stockage en cache Redis
- **OTP via WhatsApp** pour la vérification téléphonique avec rate limiting (3 tentatives max, blocage 30min)
- **Révocation automatique des tokens** lors de la réinitialisation du mot de passe

### 1.2 Excellente Sécurité des Uploads de Fichiers
Le fichier `FileSecurityHelper.php` implémente une sécurité de niveau entreprise:
- Validation MIME réelle via `finfo` (pas le MIME client)
- Vérification des magic bytes pour chaque type de fichier
- Liste noire exhaustive des extensions dangereuses (PHP, executables, scripts)
- Scan antivirus ClamAV intégré via socket réseau
- Scan PDF pour détecter JavaScript embarqué, XFA, Launch actions
- Génération de noms de fichiers sécurisés via UUID (jamais de noms utilisateur)

### 1.3 Protection contre les Injections SQL
- Utilisation systématique du Query Builder Laravel avec requêtes préparées
- Les quelques `whereRaw()` utilisent des placeholders paramétrés:
  ```php
  $query->whereRaw('unaccent(LOWER(quartier)) LIKE unaccent(LOWER(?))', ['%' . $quartiers[0] . '%']);
  ```

### 1.4 Headers de Sécurité Bien Configurés
Backend (`SecurityHeaders.php`) et Frontend (`middleware.ts`):
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictive

### 1.5 Validation des Webhooks de Paiement
Les webhooks Orange Money et MTN MoMo vérifient la signature HMAC-SHA256:
```php
return hash_equals($computedSignature, $signature);
```

### 1.6 Séparation des Rôles
- RBAC via Spatie Permission avec rôles: admin, moderator, agent, particulier
- Routes admin protégées par triple middleware: `auth:api`, `ensure.role:admin`, `2fa`
- Vérification d'appartenance pour toutes les ressources (contrats, paiements)

---

## 2. Vulnérabilités Identifiées

### 2.1 CRITIQUE - Stockage du Token JWT dans localStorage

**Fichier:** `frontend/lib/auth/AuthContext.tsx:154`
```typescript
localStorage.setItem('access_token', token);
localStorage.setItem('user', JSON.stringify(user));
```

**Risque:** Les tokens stockés dans `localStorage` sont vulnérables aux attaques XSS. Un script malveillant peut voler le token et usurper l'identité de l'utilisateur.

**Recommandation:** Utiliser des cookies HttpOnly avec attributs `Secure`, `SameSite=Strict`:
```typescript
// Côté serveur: définir le token dans un cookie HttpOnly
Set-Cookie: access_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/
```

**Gravité:** CRITIQUE
**Effort de correction:** Moyen (2-3 jours)

---

### 2.2 HAUTE - CSP avec 'unsafe-inline' et 'unsafe-eval'

**Fichier:** `backend/app/Http/Middleware/SecurityHeaders.php:35-36`
```php
"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " .
"style-src 'self' 'unsafe-inline'; " .
```

**Risque:** `unsafe-inline` et `unsafe-eval` annulent partiellement la protection XSS de la CSP, permettant l'exécution de scripts inline injectés.

**Recommandation:**
1. Utiliser des nonces CSP pour les scripts légitimes
2. Migrer les styles inline vers des feuilles de style externes
3. CSP stricte: `script-src 'self' 'nonce-xxx'`

**Gravité:** HAUTE
**Effort de correction:** Élevé (5-7 jours)

---

### 2.3 MOYENNE - Exécution de commandes système (exec)

**Fichier:** `backend/app/Http/Controllers/Api/MessagingController.php:123`
```php
$convertCommand = sprintf(
    '%s -i %s -vn -acodec libmp3lame -ab 128k -ar 44100 -y %s 2>&1',
    escapeshellarg($ffmpegPath),
    escapeshellarg($tempPath),
    escapeshellarg($mp3TempPath)
);
exec($convertCommand, $output, $returnCode);
```

**Analyse:** L'utilisation de `escapeshellarg()` est correcte et protège contre l'injection de commandes. Cependant, l'exécution de commandes système reste un risque potentiel.

**Recommandation:**
1. Valider que les chemins de fichiers ne contiennent pas de caractères spéciaux avant `escapeshellarg()`
2. Utiliser une queue asynchrone avec timeout pour les conversions
3. Sandboxer FFmpeg via un conteneur dédié

**Gravité:** MOYENNE (atténuée par escapeshellarg)
**Effort de correction:** Faible

---

### 2.4 MOYENNE - OTP exposé en mode debug

**Fichier:** `backend/app/Http/Controllers/Api/AuthController.php:286-288`
```php
if (config('app.debug') && isset($otpResult['otp'])) {
    $responseData['dev_otp'] = $otpResult['otp'];
}
```

**Risque:** Si `APP_DEBUG=true` en production (erreur de configuration), l'OTP est exposé dans la réponse API.

**Recommandation:** Ajouter une vérification supplémentaire:
```php
if (config('app.debug') && config('app.env') === 'local' && isset($otpResult['otp'])) {
```

**Gravité:** MOYENNE
**Effort de correction:** Faible (15 min)

---

### 2.5 MOYENNE - CORS trop permissif en développement

**Fichier:** `backend/config/cors.php:22-28`
```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:3000'),
    env('APP_URL', 'http://localhost'),
    'http://localhost:8888',
    'http://localhost:3005',
    'http://localhost:3006',
],
```

**Risque:** Les origines `localhost:*` codées en dur peuvent rester en production.

**Recommandation:** Utiliser uniquement des variables d'environnement:
```php
'allowed_origins' => array_filter([
    env('FRONTEND_URL'),
    env('APP_URL'),
]),
```

**Gravité:** MOYENNE
**Effort de correction:** Faible

---

### 2.6 BASSE - dangerouslySetInnerHTML dans StructuredData

**Fichier:** `frontend/components/seo/StructuredData.tsx:40`
```tsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
```

**Analyse:** L'utilisation est sécurisée car `JSON.stringify()` échappe automatiquement les caractères spéciaux HTML. Le contenu `structuredData` est contrôlé par le serveur, pas par l'utilisateur.

**Recommandation:** Documenter pourquoi c'est sécurisé dans un commentaire.

**Gravité:** BASSE (faux positif potentiel)

---

### 2.7 INFO - 2FA non obligatoire pour les administrateurs

**Fichier:** `backend/app/Http/Middleware/TwoFactorAuthentication.php:31-34`
```php
if (empty($user->two_factor_secret) || empty($user->two_factor_confirmed_at)) {
    // 2FA not configured - allow access
    return $next($request);
}
```

**Risque:** Les admins peuvent accéder au panel admin sans 2FA configuré.

**Recommandation:** Forcer la configuration 2FA lors de la première connexion admin:
```php
if (empty($user->two_factor_secret)) {
    return response()->json([
        'requires_2fa_setup' => true,
        'redirect' => '/admin/2fa/setup'
    ], 403);
}
```

**Gravité:** BASSE
**Effort de correction:** Moyen

---

## 3. Analyse de l'Infrastructure Docker

### 3.1 Points Positifs
- TLS/SSL via Let's Encrypt avec Traefik
- Redirection HTTP → HTTPS automatique
- Trusted IPs Cloudflare configurés pour les headers X-Forwarded-For
- Redis avec mot de passe obligatoire
- Réseau overlay isolé (`immog-network`)
- Health checks sur tous les services critiques
- Limites de ressources (mémoire) définies

### 3.2 Points à Améliorer

#### Secret Traefik en clair
**Fichier:** `docker-compose.prod.yml:83`
```yaml
- "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$xyz$$hashedpassword"
```
**Recommandation:** Utiliser Docker Secrets pour le mot de passe.

#### Variables d'environnement sensibles
Les mots de passe sont passés via variables d'environnement au lieu de Docker Secrets:
```yaml
environment:
  - DB_PASSWORD=${DB_PASSWORD}
  - REDIS_PASSWORD=${REDIS_PASSWORD}
```
**Recommandation:** Migrer vers `/run/secrets/` pour tous les secrets.

#### Docker Socket exposé
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```
**Risque:** Permet à Traefik de contrôler Docker. Utiliser en lecture seule (`:ro`) est une bonne pratique déjà appliquée.

---

## 4. Gestion des Secrets

### 4.1 Fichiers .env.example
Les fichiers `.env.example` contiennent des valeurs placeholder appropriées, pas de secrets réels.

### 4.2 Docker Secrets (Partiellement implémenté)
Le projet supporte Docker Secrets pour Passport:
```php
$getKey = function (string $secretPath, string $envVar): ?string {
    if (file_exists($secretPath)) {
        return trim(file_get_contents($secretPath));
    }
    return env($envVar);
};
```

**Recommandation:** Étendre cette approche à tous les secrets:
- `DB_PASSWORD`
- `REDIS_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `WAHA_API_KEY`
- `ORANGE_MONEY_API_KEY`
- `MTN_MOMO_API_KEY`

---

## 5. Conformité OWASP Top 10 (2021)

| Catégorie OWASP | Statut | Détails |
|-----------------|--------|---------|
| A01 - Broken Access Control | ✅ OK | RBAC implémenté, vérification d'appartenance |
| A02 - Cryptographic Failures | ✅ OK | bcrypt pour passwords, TLS en transit |
| A03 - Injection | ✅ OK | Query Builder, `escapeshellarg()` |
| A04 - Insecure Design | ⚠️ Partiel | 2FA optionnel pour admins |
| A05 - Security Misconfiguration | ⚠️ Partiel | CSP permissive, CORS localhost |
| A06 - Vulnerable Components | ℹ️ À vérifier | Auditer npm/composer dependencies |
| A07 - Auth Failures | ✅ OK | Rate limiting OTP, tokens révoqués |
| A08 - Software Integrity Failures | ⚠️ Partiel | Webhook signatures OK, CDN sans SRI |
| A09 - Logging & Monitoring | ✅ OK | Prometheus, Grafana, audit logs |
| A10 - SSRF | ✅ OK | Pas de fetch d'URL utilisateur identifié |

---

## 6. Recommandations Prioritaires

### Immédiat (Sprint actuel)
1. **Migrer tokens vers cookies HttpOnly** - Impact: Critique
2. **Forcer `APP_ENV !== 'local'` pour exposer OTP** - 15 min
3. **Supprimer localhost des CORS en production** - 10 min

### Court terme (1-2 semaines)
4. **Renforcer CSP** - Supprimer `unsafe-inline`/`unsafe-eval`
5. **Rendre 2FA obligatoire** pour les admins
6. **Migrer secrets vers Docker Secrets**

### Moyen terme (1-2 mois)
7. **Audit des dépendances** - `npm audit`, `composer audit`
8. **Tests de pénétration** par une équipe externe
9. **Implémentation SRI** pour les scripts CDN

---

## 7. Tests de Sécurité Recommandés

```bash
# Backend - Laravel
composer audit
php artisan security:check

# Frontend - npm
npm audit
npx snyk test

# Docker
docker scan immoguinee/php:latest
docker scan immoguinee/frontend:latest

# OWASP ZAP
zap-cli quick-scan https://immoguinee.com

# SSL/TLS
testssl.sh https://immoguinee.com
```

---

## 8. Conclusion

L'application ImmoGuinée présente une **architecture de sécurité globalement solide** avec des contrôles appropriés pour l'authentification, l'autorisation et la protection des données. Les points les plus critiques à adresser sont:

1. **Le stockage des tokens dans localStorage** (vulnérabilité XSS)
2. **La CSP permissive** qui réduit l'efficacité de la protection XSS
3. **La gestion des secrets** qui devrait utiliser Docker Secrets

Ces améliorations permettraient d'atteindre un score de **A (90/100)**.

---

**Document généré automatiquement - Pour usage interne uniquement**
