# 🏠 ImmoGuinée — Instructions Claude Code

**Version** : 3.2
**Projet** : Plateforme Immobilière Guinée

---

## 🤖 Agents Disponibles

| Agent | Commande | Fichier | Sécurité |
|-------|----------|---------|----------|
| 🖥️ **Local** | `@local` | `.claude/agents/local.md` | 🟡 Modérée |
| 🚀 **Production** | `@prod` | `.claude/agents/production.md` | 🔴 Maximum |

---

## 🎨 Légende des Risques

| Indicateur | Niveau | Action requise |
|------------|--------|----------------|
| 🟢 | **FAIBLE** | Exécution libre |
| 🟡 | **MODÉRÉ** | Validation simple |
| 🟠 | **ÉLEVÉ** | Explication requise |
| 🔴 | **CRITIQUE** | `deploy` + confirmation |
| ⚫ | **INTERDIT** | Bloqué |

---

## 📚 Références Projet (Obligatoire)

| Document | Chemin |
|----------|--------|
| 🟢 Constitution | `@.specify/memory/constitution.md` |
| 🟢 Modèle de données | `@specs/001-immog-platform/data-model.md` |
| 🟢 Plan global | `@specs/001-immog-platform/plan.md` |

---

## 🌍 Internationalisation (i18n)

| Risque | Règle |
|--------|-------|
| 🟢 | Langues : Français (FR) + Anglais (EN) |
| 🟠 | Aucun texte hard-codé |
| 🟢 | Clés explicites : `property.create.success` |

---

## 🔐 Sécurité — TOLÉRANCE ZÉRO
````
⚫ DÉPÔT PUBLIC → Zéro tolérance sur les fuites

❌ JAMAIS dans le code/logs/commits :
   • Clés API (sk-, pk_, api_key=)
   • Tokens (token=, bearer, jwt)
   • Passwords (password=, pwd=)
   • Credentials DB (postgres://, mysql://)
   • Clés SSH (-----BEGIN RSA)
   • IPs serveur publiques
````

---

## 🎯 Règle Fondamentale
````
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🔴 STABILITÉ + SÉCURITÉ + CONFIDENTIALITÉ            │
│              >                                          │
│   🟢 RAPIDITÉ + COMMODITÉ                              │
│                                                         │
│   ─────────────────────────────────────────────────    │
│                                                         │
│   🎯 UNE ACTION = UNE DEMANDE                          │
│   📋 RECOMMANDER le reste                              │
│   ⏳ ATTENDRE validation                               │
│   🎨 TOUJOURS indiquer le niveau de risque            │
│                                                         │
└─────────────────────────────────────────────────────────┘
````

---

## 🖥️ Agent LOCAL — Résumé

**Fichier** : `.claude/agents/local.md`
**Sécurité** : 🟡 Modérée

### 🟢 Autorisé sans validation
````bash
🟢 docker-compose up -d / down / logs
🟢 php artisan cache:clear / config:clear / view:clear
🟢 php artisan make:model / make:controller / make:migration
🟢 php artisan route:list / migrate:status / tinker / test
🟢 npm install / npm run dev / npm run build
🟢 composer install / dump-autoload
````

### 🟡 Validation simple
````bash
🟡 php artisan migrate
🟡 php artisan migrate:rollback
🟡 php artisan db:seed
🟡 php artisan migrate:fresh --seed
````

### ⚫ Interdit même en local
````bash
⚫ Commiter des secrets
⚫ Push sur main/master direct
⚫ Modifier scripts/configs prod
⚫ Exécuter ./scripts/deploy-swarm.sh
````

---

## 🚀 Agent PRODUCTION — Résumé

**Fichier** : `.claude/agents/production.md`
**Sécurité** : 🔴 Maximum
**Serveur** : `ubuntu@vps-f9ab3c93:~/immoguinee`

### 🔒 Règle déploiement
````
🔴 AUCUN déploiement sans le mot exact : deploy

   ⚫ "ok", "go", "yes" → INVALIDE
   ✅ "deploy" uniquement → AUTORISÉ
````

### 🟢 Lecture seule (sans validation)
````bash
🟢 ./scripts/deploy-swarm.sh status
🟢 ./scripts/deploy-swarm.sh logs <service>
🟢 curl -I https://immoguinee.com/api/health
````

### 🟠 Avec validation `deploy`
````bash
🟠 ./scripts/deploy-swarm.sh update-frontend
🟠 ./scripts/deploy-swarm.sh update-backend
🟠 ./scripts/deploy-swarm.sh update-all
🟠 ./scripts/deploy-swarm.sh rollback <service>
🟠 ./scripts/deploy-swarm.sh artisan migrate
````

### 🔴 Critique (double confirmation)
````bash
🔴 ./scripts/deploy-swarm.sh full
🔴 ./scripts/deploy-swarm.sh fix-db
🔴 ./scripts/cloudflare-firewall.sh
````

### ⚫ Interdit en production
````bash
⚫ migrate:fresh / migrate:reset / db:wipe
⚫ DROP DATABASE / DELETE sans WHERE
⚫ Supprimer volumes Docker
⚫ Modifier .env / nginx.conf / SSL
⚫ Scale services single-instance (postgres, redis, traefik...)
````

---

## 🐳 Services Production

### Scalables 🟢

| Service | Replicas | Commande scale |
|---------|----------|----------------|
| `frontend` | 1-5 | `scale frontend <n>` |
| `php` | 1-5 | `scale php <n>` |
| `queue-worker` | 1-10 | `scale queue-worker <n>` |
| `nginx` | 1-3 | `scale nginx <n>` |

### Single-instance ⚫

| Service | Raison |
|---------|--------|
| `traefik` | Port binding unique |
| `postgres` | Single-master DB |
| `redis` | Config single-node |
| `minio` | Stockage fichiers |
| `n8n` | Single-instance requis |
| `waha` | Session WhatsApp unique |
| `scheduler` | Cron unique |

---

## 📝 Format de Réponse Standard
````markdown
## [🖥️ LOCAL / 🚀 PROD] — [Action]

### 🎨 Risque : [🟢/🟡/🟠/🔴]

### 📊 Impact (si prod)
| Élément | Risque |
|---------|--------|

### 🔧 Commande
```bash
[indicateur risque] commande
```

### 🔄 Rollback (si applicable)
```bash
commande rollback
```

---
[🟢 Exécution / 🟡 Confirmer / ⏳ Tapez `deploy`]
````

---

## 🛠️ Référence Rapide Scripts Prod
````bash
# STATUS & LOGS (🟢)
./scripts/deploy-swarm.sh status
./scripts/deploy-swarm.sh logs <service>

# UPDATES (🟠 → deploy)
./scripts/deploy-swarm.sh update-frontend
./scripts/deploy-swarm.sh update-backend
./scripts/deploy-swarm.sh update-all

# GESTION (🟠)
./scripts/deploy-swarm.sh rollback <service>
./scripts/deploy-swarm.sh scale <service> <n>

# LARAVEL (🟠)
./scripts/deploy-swarm.sh artisan migrate
./scripts/deploy-swarm.sh artisan cache:clear
./scripts/deploy-swarm.sh post-deploy

# WAHA (🟠)
./scripts/backup-waha-session.sh
./scripts/restore-waha-session.sh
````

---

## 📂 Structure Agents
````
immoguinee/
├── CLAUDE.md                    ← Ce fichier
├── .claude/
│   ├── settings.json            ← Configuration
│   └── agents/
│       ├── local.md             ← Agent développement
│       └── production.md        ← Agent production
````

---

**🔗 Pour instructions détaillées, consulter les fichiers agents respectifs.**
````

---

## 📂 Structure finale complète
````
immoguinee/
├── CLAUDE.md                          # ← Instructions globales (ce fichier)
├── .claude/
│   ├── settings.json                  # ← Configuration agents
│   └── agents/
│       ├── local.md                   # ← Agent LOCAL complet
│       └── production.md              # ← Agent PROD complet
├── .specify/
│   └── memory/
│       └── constitution.md
├── specs/
│   └── 001-immog-platform/
│       ├── data-model.md
│       └── plan.md
├── scripts/
│   ├── deploy-swarm.sh
│   ├── cloudflare-firewall.sh
│   ├── backup-waha-session.sh
│   └── ...
└── ...