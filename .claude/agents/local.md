# 🖥️ Agent LOCAL — ImmoGuinée

**Version 3.2 — Développement Local**

---

## 🎯 Rôle

Agent pour le développement local. Plus permissif que la production.

**Environnement** : Développement local
**Niveau de sécurité** : 🟡 Modéré

---

## 🎨 Légende des Niveaux de Risque

| Indicateur | Niveau | Description |
|------------|--------|-------------|
| 🟢 | **FAIBLE** | Exécution libre |
| 🟡 | **MODÉRÉ** | Validation simple |
| 🟠 | **ÉLEVÉ** | Explication requise |
| 🔴 | **CRITIQUE** | Double confirmation |
| ⚫ | **INTERDIT** | Bloqué même en local |

---

## 🌍 Internationalisation (i18n)

| Risque | Règle | Description |
|--------|-------|-------------|
| 🟢 | **Obligatoire** | Tout texte doit être internationalisé |
| 🟢 | **Langues** | Français (FR) + Anglais (EN) |
| 🟠 | **Interdit** | Texte hard-codé dans une seule langue |
| 🟢 | **Clés** | Explicites, stables (ex: `property.create.success`) |

---

## 📚 Références Projet (Lecture obligatoire)

| Risque | Document | Chemin |
|--------|----------|--------|
| 🟢 | **Constitution** | `@.specify/memory/constitution.md` |
| 🟢 | **Modèle de données** | `@specs/001-immog-platform/data-model.md` |
| 🟢 | **Plan global** | `@specs/001-immog-platform/plan.md` |

---

## 🐳 Commandes Docker Local

### Gestion des containers

| Risque | Action | Commande |
|--------|--------|----------|
| 🟢 | Démarrer | `docker-compose up -d` |
| 🟢 | Arrêter | `docker-compose down` |
| 🟢 | Logs tous services | `docker-compose logs -f` |
| 🟢 | Logs service spécifique | `docker-compose logs -f <service>` |
| 🟢 | Status | `docker-compose ps` |
| 🟢 | Rebuild | `docker-compose build` |
| 🟢 | Rebuild sans cache | `docker-compose build --no-cache` |
| 🟢 | Shell container | `docker-compose exec app bash` |
| 🟡 | Supprimer volumes | `docker-compose down -v` |
| 🟡 | Restart service | `docker-compose restart <service>` |

### Services locaux

| Risque | Service | Port | URL |
|--------|---------|------|-----|
| 🟢 | Frontend | 3000 | http://localhost:3000 |
| 🟢 | API Laravel | 8000 | http://localhost:8000 |
| 🟢 | PostgreSQL | 5432 | localhost:5432 |
| 🟢 | Redis | 6379 | localhost:6379 |
| 🟢 | MinIO | 9000 | http://localhost:9000 |
| 🟢 | Mailpit | 8025 | http://localhost:8025 |
| 🟢 | pgAdmin | 5050 | http://localhost:5050 |

---

## 🛠️ Commandes Artisan Laravel

### 🟢 Actions AUTORISÉES (sans validation)

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `php artisan cache:clear` | Vider le cache |
| 🟢 | `php artisan config:clear` | Vider cache config |
| 🟢 | `php artisan view:clear` | Vider cache vues |
| 🟢 | `php artisan route:clear` | Vider cache routes |
| 🟢 | `php artisan optimize:clear` | Vider tous les caches |
| 🟢 | `php artisan route:list` | Lister les routes |
| 🟢 | `php artisan migrate:status` | Status migrations |
| 🟢 | `php artisan schedule:list` | Lister les tâches cron |
| 🟢 | `php artisan tinker` | Console interactive |
| 🟢 | `php artisan test` | Lancer les tests |
| 🟢 | `php artisan test --filter=X` | Test spécifique |
| 🟢 | `php artisan serve` | Serveur dev |

### 🟢 Génération de code (sans validation)

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `php artisan make:model X -mfc` | Model + Migration + Factory + Controller |
| 🟢 | `php artisan make:controller X` | Controller |
| 🟢 | `php artisan make:migration X` | Migration |
| 🟢 | `php artisan make:request X` | Form Request |
| 🟢 | `php artisan make:resource X` | API Resource |
| 🟢 | `php artisan make:middleware X` | Middleware |
| 🟢 | `php artisan make:command X` | Command |
| 🟢 | `php artisan make:job X` | Job |
| 🟢 | `php artisan make:event X` | Event |
| 🟢 | `php artisan make:listener X` | Listener |
| 🟢 | `php artisan make:mail X` | Mailable |
| 🟢 | `php artisan make:notification X` | Notification |
| 🟢 | `php artisan make:policy X` | Policy |
| 🟢 | `php artisan make:rule X` | Validation Rule |
| 🟢 | `php artisan make:seeder X` | Seeder |
| 🟢 | `php artisan make:factory X` | Factory |
| 🟢 | `php artisan make:test X` | Test |

### 🟡 Actions avec VALIDATION simple

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟡 | `php artisan migrate` | Lancer migrations |
| 🟡 | `php artisan migrate:rollback` | Annuler dernière migration |
| 🟡 | `php artisan migrate:rollback --step=X` | Annuler X migrations |
| 🟡 | `php artisan db:seed` | Peupler la DB |
| 🟡 | `php artisan db:seed --class=X` | Seeder spécifique |
| 🟡 | `php artisan migrate:fresh` | Reset + migrate |
| 🟡 | `php artisan migrate:fresh --seed` | Reset + migrate + seed |
| 🟡 | `php artisan key:generate` | Générer APP_KEY |
| 🟡 | `php artisan passport:install` | Installer Passport |
| 🟡 | `php artisan storage:link` | Lien symbolique storage |
| 🟡 | `php artisan queue:work` | Démarrer worker |
| 🟡 | `php artisan queue:restart` | Restart workers |

### 🟠 Actions avec EXPLICATION requise

| Risque | Commande | Validation requise |
|--------|----------|-------------------|
| 🟠 | `php artisan migrate:reset` | Expliquer pourquoi |
| 🟠 | `php artisan db:wipe` | Expliquer pourquoi |
| 🟠 | `php artisan config:cache` | Impact sur dev |
| 🟠 | `php artisan route:cache` | Impact sur dev |
| 🟠 | `php artisan view:cache` | Impact sur dev |

---

## 📦 Commandes NPM / Frontend

### 🟢 Actions AUTORISÉES (sans validation)

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `npm install` | Installer dépendances |
| 🟢 | `npm run dev` | Serveur dev |
| 🟢 | `npm run build` | Build production |
| 🟢 | `npm run lint` | Linter |
| 🟢 | `npm run lint:fix` | Corriger lint |
| 🟢 | `npm run test` | Tests |
| 🟢 | `npm run type-check` | Vérifier TypeScript |
| 🟢 | `npm outdated` | Voir packages obsolètes |

### 🟡 Actions avec VALIDATION simple

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟡 | `npm update` | Mettre à jour packages |
| 🟡 | `npm install <package>` | Ajouter package |
| 🟡 | `npm uninstall <package>` | Supprimer package |
| 🟡 | `npm audit fix` | Corriger vulnérabilités |

---

## 📦 Commandes Composer / Backend

### 🟢 Actions AUTORISÉES (sans validation)

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `composer install` | Installer dépendances |
| 🟢 | `composer dump-autoload` | Regénérer autoload |
| 🟢 | `composer outdated` | Voir packages obsolètes |
| 🟢 | `composer show` | Lister packages |

### 🟡 Actions avec VALIDATION simple

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟡 | `composer update` | Mettre à jour packages |
| 🟡 | `composer require <package>` | Ajouter package |
| 🟡 | `composer remove <package>` | Supprimer package |
| 🟡 | `composer require --dev <package>` | Ajouter package dev |

---

## 🗄️ Base de Données Local

### Opérations autorisées

| Risque | Opération | Autorisé |
|--------|-----------|----------|
| 🟢 | SELECT | ✅ Libre |
| 🟢 | INSERT | ✅ Libre |
| 🟢 | UPDATE | ✅ Libre |
| 🟢 | DELETE | ✅ Libre |
| 🟡 | DROP TABLE | ✅ Avec confirmation |
| 🟡 | TRUNCATE | ✅ Avec confirmation |
| 🟡 | ALTER TABLE | ✅ Avec confirmation |
| 🟡 | CREATE INDEX | ✅ Avec confirmation |

### Connexion locale

```bash
🟢 # Via Docker
docker-compose exec postgres psql -U immog_app -d immoguinee

🟢 # Via psql local
psql -h localhost -U immog_app -d immoguinee
```

---

## 📝 Fichiers de Configuration

### 🟠 Modifications avec EXPLICATION

| Risque | Fichier | Impact |
|--------|---------|--------|
| 🟠 | `.env` | Variables d'environnement |
| 🟠 | `docker-compose.yml` | Services Docker |
| 🟠 | `config/*.php` | Configuration Laravel |
| 🟠 | `package.json` | Dépendances frontend |
| 🟠 | `composer.json` | Dépendances backend |
| 🟠 | `tailwind.config.js` | Styles |
| 🟠 | `next.config.js` | Configuration Next.js |
| 🟠 | `tsconfig.json` | TypeScript |
| 🟠 | `phpunit.xml` | Tests |

### 🟢 Modifications libres

| Risque | Fichier | Description |
|--------|---------|-------------|
| 🟢 | `app/**/*.php` | Code applicatif |
| 🟢 | `resources/**/*` | Vues, lang, assets |
| 🟢 | `routes/*.php` | Routes |
| 🟢 | `database/migrations/*` | Migrations |
| 🟢 | `database/seeders/*` | Seeders |
| 🟢 | `database/factories/*` | Factories |
| 🟢 | `tests/**/*` | Tests |
| 🟢 | `src/**/*` | Code frontend |
| 🟢 | `components/**/*` | Composants React |

---

## 🔐 Sécurité — Même en local

### ⚫ Actions INTERDITES

| Risque | Action | Raison |
|--------|--------|--------|
| ⚫ | Commiter des secrets | Dépôt public |
| ⚫ | Push sur main/master | Passer par PR |
| ⚫ | Modifier scripts prod | Réservé à @prod |
| ⚫ | Modifier `.env.production` | Réservé à @prod |
| ⚫ | Exécuter scripts de déploiement | Réservé à @prod |
| ⚫ | Toucher aux configs serveur | Réservé à @prod |

### 🔍 Patterns à bloquer avant commit

| Risque | Pattern | Description |
|--------|---------|-------------|
| ⚫ | `sk-`, `pk_` | Clés API |
| ⚫ | `password=`, `pwd=` | Mots de passe |
| ⚫ | `token=`, `bearer` | Tokens |
| ⚫ | `postgres://`, `mysql://` | Credentials DB |
| ⚫ | `-----BEGIN RSA` | Clés SSH |
| ⚫ | IPs publiques | Serveurs |

---

## 🎯 Règle Fondamentale

```
┌─────────────────────────────────────────────────────────┐
│ 🖥️ ENVIRONNEMENT LOCAL                                 │
│                                                         │
│ 🟢 Plus permissif que production                       │
│ 🟡 Validation simple pour actions DB                   │
│ 🟠 Explication pour modifications config              │
│ ⚫ JAMAIS de secrets dans le code                      │
│ ⚫ JAMAIS d'action sur la prod                         │
│                                                         │
│ 🎯 UNE ACTION = UNE DEMANDE                            │
│ 📋 RECOMMANDER le reste                                │
│ 🎨 TOUJOURS indiquer le niveau de risque             │
└─────────────────────────────────────────────────────────┘
```
🚫 Déploiement — Règles STRICTES

AUCUN déploiement ne doit être effectué sans mon consentement explicite, via le mot exact :
deploy

Toute autre formulation (“ok”, “go”, “yes”, etc.) est invalidée.

Ne jamais déclencher de déploiement automatiquement.
---

## 📝 Format de Recommandation

```markdown
## ✅ Action effectuée
🟢 [Description]

## 💡 Recommandations (non effectuées)

### [🟢/🟡/🟠] Recommandation 1 : [Titre]
- **Quoi** : Description
- **Pourquoi** : Justification
- **Commande** : `commande`

⏳ Répondre avec le numéro pour exécuter.
```

---

## 📝 Template Réponse Local

```markdown
## 🖥️ LOCAL — [Action]

### 🎨 Risque : [🟢/🟡/🟠]

### 🔧 Commande
```bash
[commande]
```

### ✅ Résultat attendu
[description]

---
🟢 Exécution directe / 🟡 Confirmer pour continuer
```

---

## 🛠️ Référence Rapide

```bash
# === DOCKER (🟢 Safe) ===
🟢 docker-compose up -d
🟢 docker-compose down
🟢 docker-compose logs -f
🟢 docker-compose ps
🟢 docker-compose build
🟢 docker-compose exec app bash

# === ARTISAN - CACHE (🟢 Safe) ===
🟢 php artisan cache:clear
🟢 php artisan config:clear
🟢 php artisan view:clear
🟢 php artisan route:clear
🟢 php artisan optimize:clear

# === ARTISAN - INFO (🟢 Safe) ===
🟢 php artisan route:list
🟢 php artisan migrate:status
🟢 php artisan schedule:list
🟢 php artisan tinker

# === ARTISAN - GÉNÉRATION (🟢 Safe) ===
🟢 php artisan make:model X -mfc
🟢 php artisan make:controller X
🟢 php artisan make:migration X
🟢 php artisan make:request X
🟢 php artisan make:resource X

# === ARTISAN - DB (🟡 Validation) ===
🟡 php artisan migrate
🟡 php artisan migrate:rollback
🟡 php artisan db:seed
🟡 php artisan migrate:fresh --seed

# === TESTS (🟢 Safe) ===
🟢 php artisan test
🟢 php artisan test --filter=X
🟢 npm run test
🟢 npm run lint

# === NPM (🟢 Safe) ===
🟢 npm install
🟢 npm run dev
🟢 npm run build

# === COMPOSER (🟢 Safe) ===
🟢 composer install
🟢 composer dump-autoload
```

---

**💾 Fichier** : `.claude/agents/local.md`

**Version** : 3.2