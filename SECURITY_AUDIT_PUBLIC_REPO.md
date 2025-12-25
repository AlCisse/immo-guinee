# AUDIT DE SECURITE - DEPOT PUBLIC

## ALERTE CRITIQUE: CE DEPOT EST PUBLIC

**Date:** 25 Décembre 2025
**Version:** 1.0
**Classification:** URGENT - ACTION IMMEDIATE REQUISE
**Score de Risque:** CRITIQUE (25/100)

---

## RESUME EXECUTIF

Ce rapport identifie des **vulnérabilités CRITIQUES** liées au fait que le dépôt GitHub est **PUBLIC**. Des informations sensibles sont exposées et accessibles à tout attaquant.

### ACTIONS IMMEDIATES REQUISES

1. **RENDRE LE DEPOT PRIVE** ou supprimer les fichiers sensibles
2. **CHANGER IMMEDIATEMENT** tous les mots de passe exposés en production
3. **REGENERER** toutes les clés API exposées
4. **AUDITER** les accès récents aux systèmes de production

---

## 1. SECRETS HARDCODES - NIVEAU CRITIQUE

### 1.1 Mot de passe admin de production

**Fichier:** `backend/reset_admin.php`

```php
// CRITIQUE: Credentials admin de PRODUCTION exposés!
$phone = '224664043115';
$password = 'ImmoG@2024!Secure';
```

| Information | Valeur | Risque |
|-------------|--------|--------|
| Téléphone admin | `224664043115` | CRITIQUE |
| Mot de passe | `ImmoG@2024!Secure` | CRITIQUE |
| Email | `admin@immoguinee.com` | HAUTE |

**Impact:** Un attaquant peut se connecter à l'interface admin avec ces credentials.

**Action immédiate:**
- Supprimer ce fichier du dépôt
- Changer le mot de passe admin en production
- Vérifier les logs d'accès admin

---

### 1.2 Clé API WAHA par défaut

**Fichier:** `scripts/deploy-swarm.sh` (lignes 345-346)

```bash
# CRITIQUE: Clé API WAHA hardcodée
if [ -z "$WAHA_API_KEY" ]; then
    WAHA_API_KEY="d2b21ca5925c5781888cd110f5a4cef4"
fi
```

**Impact:** Un attaquant peut envoyer des messages WhatsApp au nom de l'entreprise.

**Action immédiate:**
- Régénérer la clé API WAHA
- Supprimer la valeur par défaut du script

---

### 1.3 Credentials de base de données par défaut

**Fichier:** `scripts/deploy-swarm.sh` (lignes 397-412)

```bash
# CRITIQUE: Credentials DB hardcodés dans le script de déploiement
docker service update \
    --env-add DB_USERNAME="immog_user" \
    --env-add DB_PASSWORD="immog_secret" \
```

**Fichier:** `backend/.env.example` (lignes 27-28)

```
DB_USERNAME=immog_user
DB_PASSWORD=immog_secret
```

**Impact:** Si ces credentials sont utilisés en production, la base de données est compromise.

---

### 1.4 Credentials de services par défaut

**Fichier:** `backend/.env.example`

| Service | Username | Password | Ligne |
|---------|----------|----------|-------|
| Redis | - | `immog_redis_secret` | 47 |
| MinIO | `immog_minio` | `immog_minio_secret` | 67-68 |

**Fichier:** `docker/docker-compose.yml` (ligne 419)

| Service | Password |
|---------|----------|
| N8N | `immog_n8n_secret` |

---

### 1.5 Credentials des seeders (tests)

**Fichier:** `backend/database/seeders/DatabaseSeeder.php`

```php
// Ligne 119: Admin password
'mot_de_passe' => Hash::make('admin123'),
// Téléphone: 224620000000

// Ligne 157: Moderator password
'mot_de_passe' => Hash::make('moderator123'),
// Téléphone: 224620000001

// Lignes 195-252: User passwords
'mot_de_passe' => Hash::make('password'),
```

**Impact:** Si le seeder a été exécuté en production, ces comptes existent avec ces passwords.

---

## 2. INFORMATIONS D'INFRASTRUCTURE EXPOSEES

### 2.1 Domaines et sous-domaines

Les fichiers de configuration révèlent la structure complète:

| Sous-domaine | Service | Fichier |
|--------------|---------|---------|
| `immoguinee.com` | Frontend + API | traefik configs |
| `monitoring.immoguinee.com` | Grafana | traefik configs |
| `pgadmin.immoguinee.com` | PgAdmin | traefik configs |
| `traefik.immoguinee.com` | Dashboard Traefik | traefik configs |
| `alertmanager.immoguinee.com` | Alertmanager | alertmanager.yml |
| `waha.immoguinee.com` | WhatsApp API | traefik configs |

### 2.2 Emails internes exposés

| Email | Usage |
|-------|-------|
| `admin@immoguinee.com` | Admin principal |
| `dev@immoguinee.com` | Équipe dev (alertes) |
| `alerts@immoguinee.com` | Expéditeur alertes |
| `moderator@immoguinee.com` | Modérateur |

### 2.3 Structure réseau interne

**Fichier:** `docker/docker-compose.yml`

```yaml
networks:
  public-network:    # Services publics
  backend-network:   # Services internes (internal: true)
  infra-network:     # Monitoring (internal: true)
```

Services internes exposés:
- PostgreSQL sur port 5432
- Redis sur port 6379
- Elasticsearch sur port 9200
- MinIO sur port 9000
- WAHA sur port 3000

---

## 3. NUMEROS DE TELEPHONE EXPOSES

### 3.1 Numéros admin/test

| Numéro | Usage | Fichier |
|--------|-------|---------|
| `224664043115` | Admin production | reset_admin.php |
| `224620000000` | Admin seeder | DatabaseSeeder.php |
| `224620000001` | Moderator seeder | DatabaseSeeder.php |
| `224621111111` | Test user | DatabaseSeeder.php |
| `+224620000001` | Test e2e | contract-signature.spec.ts |
| `+224620000002` | Test e2e | contract-signature.spec.ts |

**Impact:** Ces numéros peuvent être ciblés pour du phishing ou social engineering.

---

## 4. FICHIERS A SUPPRIMER IMMEDIATEMENT

### Priorité CRITIQUE (à supprimer MAINTENANT)

| Fichier | Raison |
|---------|--------|
| `backend/reset_admin.php` | Contient password admin production |
| `backend/test_login.php` | Script de test avec credentials |

### Priorité HAUTE (à nettoyer)

| Fichier | Action |
|---------|--------|
| `scripts/deploy-swarm.sh` | Supprimer credentials hardcodés (lignes 345-346, 397-412) |
| `backend/.env.example` | Remplacer par des placeholders `<YOUR_PASSWORD>` |
| `docker/docker-compose.yml` | Supprimer password N8N par défaut |
| `monitoring/alertmanager.yml` | Supprimer/masquer SMTP password |
| `backend/database/seeders/DatabaseSeeder.php` | Changer les passwords par défaut |

---

## 5. VERIFICATION DE L'HISTORIQUE GIT

### 5.1 Fichiers potentiellement supprimés mais toujours dans l'historique

L'historique Git conserve TOUS les fichiers jamais commités, même supprimés.

**Commande de vérification:**
```bash
git log --all --full-history -- "*.env" "*password*" "*secret*"
```

**Recommandation:** Si des secrets ont été commités puis supprimés, l'historique doit être réécrit avec `git filter-branch` ou `BFG Repo-Cleaner`.

---

## 6. CONFIGURATION SMTP EXPOSEE

**Fichier:** `monitoring/alertmanager.yml`

```yaml
smtp_smarthost: 'smtp.gmail.com:587'
smtp_from: 'alerts@immoguinee.com'
smtp_auth_username: 'alerts@immoguinee.com'
smtp_auth_password: 'your-app-password'  # Placeholder mais révèle le setup
```

---

## 7. ENDPOINTS API DECOUVERTS

Un attaquant peut maintenant cibler ces endpoints:

### Authentification
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/otp/verify`
- `POST /api/auth/forgot-password`

### Admin (avec credentials exposés)
- `GET /api/admin/dashboard-stats`
- `GET /api/admin/users`
- `POST /api/admin/users/{id}`
- `DELETE /api/admin/listings/{id}`

### Webhooks (sans auth)
- `POST /api/webhooks/orange-money`
- `POST /api/webhooks/mtn-momo`
- `POST /api/webhooks/waha`

---

## 8. PLAN DE REMEDIATION D'URGENCE

### Phase 1: IMMEDIATE (Dans l'heure)

- [ ] Changer le mot de passe admin en production
- [ ] Régénérer la clé API WAHA
- [ ] Changer tous les mots de passe de base de données
- [ ] Vérifier les logs d'accès des 30 derniers jours

### Phase 2: COURT TERME (24h)

- [ ] Supprimer `backend/reset_admin.php`
- [ ] Supprimer `backend/test_login.php`
- [ ] Nettoyer `scripts/deploy-swarm.sh`
- [ ] Mettre à jour `.env.example` avec placeholders
- [ ] Changer les passwords des seeders

### Phase 3: MOYEN TERME (1 semaine)

- [ ] Rendre le dépôt privé OU
- [ ] Utiliser git-filter-branch pour nettoyer l'historique
- [ ] Mettre en place des pre-commit hooks pour détecter les secrets
- [ ] Implémenter un gestionnaire de secrets (Vault, AWS Secrets Manager)
- [ ] Ajouter `.gitleaks.toml` pour scanning automatique

---

## 9. OUTILS DE DETECTION RECOMMANDES

### Installation immédiate

```bash
# Gitleaks - Détection de secrets
brew install gitleaks
gitleaks detect --source . --verbose

# TruffleHog - Scan historique Git
pip install truffleHog
trufflehog git file://./

# Git-secrets (AWS)
brew install git-secrets
git secrets --install
git secrets --scan
```

### Configuration pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## 10. FICHIER .gitignore RECOMMANDE

Ajouter ces patterns pour éviter les futures fuites:

```gitignore
# Secrets
*.env
!*.env.example
secrets/
.secrets/
**/secrets/**

# Credentials
*password*
*secret*
*credential*
*.pem
*.key
oauth-private.key
oauth-public.key

# Scripts dangereux
reset_admin.php
test_login.php
**/test_*.php

# Backups
*.sql
*.sql.gz
*.backup
```

---

## 11. CONCLUSION

### Niveau de risque actuel: CRITIQUE

Ce dépôt public expose:
- **1 mot de passe admin de production**
- **6+ mots de passe par défaut**
- **1 clé API WhatsApp**
- **8+ numéros de téléphone**
- **Structure complète de l'infrastructure**
- **Tous les endpoints API**

### Score de sécurité: 25/100 (F)

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| Protection des secrets | 10/100 | Credentials exposés |
| Sécurité du code | 85/100 | Bonne qualité |
| Configuration | 40/100 | Placeholders insuffisants |
| Historique Git | 20/100 | Non nettoyé |
| Documentation | 30/100 | Trop d'infos sensibles |

### Recommandation finale

**RENDRE LE DEPOT PRIVE IMMEDIATEMENT** ou effectuer un nettoyage complet de l'historique Git avant de continuer à l'utiliser publiquement.

---

**Document généré le 25 Décembre 2025**
**Classification: URGENT - CONFIDENTIEL**

---

## ANNEXE: Liste des fichiers à auditer

```
backend/reset_admin.php                 # CRITIQUE - Supprimer
backend/test_login.php                  # HAUTE - Supprimer
scripts/deploy-swarm.sh                 # HAUTE - Nettoyer lignes 345-346, 397-412
backend/.env.example                    # HAUTE - Placeholders
docker/docker-compose.yml               # MOYENNE - Ligne 419
backend/database/seeders/DatabaseSeeder.php  # MOYENNE - Passwords
monitoring/alertmanager.yml             # BASSE - SMTP
monitoring/alertmanager/alertmanager.yml     # BASSE - SMTP
frontend/e2e/*.spec.ts                  # INFO - Phone numbers
```
