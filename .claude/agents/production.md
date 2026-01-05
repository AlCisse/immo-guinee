# 📋 Instructions Sub-Agent — ImmoGuinée (Claude Code)

**Version 3.1 — Avec Indicateurs de Risque Systématiques**

---

## 🎨 Légende des Niveaux de Risque

| Indicateur | Niveau | Description | Action requise |
|------------|--------|-------------|----------------|
| 🟢 | **FAIBLE** | Lecture seule ou impact minimal | Exécution libre |
| 🟡 | **MODÉRÉ** | Impact limité, réversible facilement | Validation simple |
| 🟠 | **ÉLEVÉ** | Impact significatif sur les services | Validation explicite |
| 🔴 | **CRITIQUE** | Risque de perte de données ou downtime | `deploy` + confirmation |
| ⚫ | **INTERDIT** | Action bloquée par défaut | Refus sauf exception justifiée |

---

## 🌍 1. Internationalisation (i18n)

| Risque | Règle | Description |
|--------|-------|-------------|
| 🟢 | **Obligatoire** | Tout texte UI/code/message doit être internationalisé |
| 🟢 | **Langues** | Français (FR) + Anglais (EN) |
| 🟠 | **Interdit** | Texte hard-codé dans une seule langue |
| 🟢 | **Clés** | Explicites, stables, maintenables (ex: `property.create.success`) |

---

## 🚀 2. Déploiement & Scripts Autorisés

### 🔒 Règle d'or

```
🔴 AUCUN déploiement sans le mot exact : deploy
   
   ⚫ "ok", "go", "yes", "lance", "fais-le" → INVALIDE
   🟢 "deploy" uniquement → AUTORISÉ
```

### 📍 Serveur de production

```
🟢 Hôte : ssh immoguinee
```

---

### 🛠️ Script principal : `./scripts/deploy-swarm.sh`

#### Déploiement Initial

| Risque | Commande | Description | Validation requise |
|--------|----------|-------------|-------------------|
| 🟠 | `init` | Initialise Docker Swarm | ✅ Explicite |
| 🟢 | `build` | Construit images Docker | ✅ Explicite |
| 🟠 | `deploy` | Déploie le stack Swarm | ✅ `deploy` |
| 🔴 | `full` | Déploiement complet (init+build+deploy) | ✅ `deploy` + confirmation |

#### Mise à jour des Services

| Risque | Commande | Description | Validation requise |
|--------|----------|-------------|-------------------|
| 🟢 | `update-frontend` | MAJ frontend (zero downtime) | ✅ `deploy` |
| 🟠 | `update-backend` | MAJ services PHP | ✅ `deploy` |
| 🟠 | `update-all` | MAJ tous les services | ✅ `deploy` |
| 🟠 | `update <service>` | Force MAJ service spécifique | ✅ `deploy` |

#### Monitoring & Gestion

| Risque | Commande | Description | Validation requise |
|--------|----------|-------------|-------------------|
| 🟢 | `status` | Affiche état du stack | ❌ Aucune |
| 🟢 | `logs <service>` | Affiche logs service | ❌ Aucune |
| 🟠 | `rollback <service>` | Rollback version précédente | ✅ Explicite |
| 🟠 | `scale <service> <n>` | Scale à N replicas | ✅ Explicite |
| 🔴 | `remove` | Supprime le stack | ✅ Triple confirmation |

#### Administration

| Risque | Commande | Description | Validation requise |
|--------|----------|-------------|-------------------|
| 🟡 | `artisan <cmd>` | Commande Laravel artisan | ✅ Selon commande |
| 🟠 | `post-deploy` | Corrections post-déploiement | ✅ Explicite |
| 🟠 | `post-deploy --seed` | + Seed base de données | ✅ Explicite |
| 🔴 | `fix-db` | Corrige credentials DB | ✅ Explicite |
| 🟠 | `setup-waha` | Configure WhatsApp API | ✅ Explicite |

---

### 🔧 Autres Scripts Autorisés

| Risque | Script | Description | Validation requise |
|--------|--------|-------------|-------------------|
| 🔴 | `cloudflare-firewall.sh` | Config firewall Cloudflare | ✅ Explicite + impact |
| 🔴 | `do-cloudflare-firewall.sh` | Firewall CF pour DigitalOcean | ✅ Explicite + impact |
| 🟢 | `backup-waha-session.sh` | Sauvegarde session WhatsApp | ✅ Recommandé régulièrement |
| 🟠 | `restore-waha-session.sh` | Restauration session WAHA | ✅ Explicite |
| 🟢 | `build-n8n-image.sh` | Build image Docker n8n | ✅ Explicite |
| 🟠 | `deploy.sh` | Déploiement alternatif | ✅ `deploy` |

---

### 📊 Matrice des Commandes Artisan

| Risque | Commande Artisan | Validation |
|--------|------------------|------------|
| 🟠 | `migrate` | ✅ Backup DB avant |
| 🔴 | `migrate:rollback` | ✅ Double confirmation |
| ⚫ | `migrate:fresh` | ❌ INTERDIT en prod |
| 🟠 | `db:seed` | ✅ Explicite |
| 🟢 | `config:cache` | ✅ Recommandé |
| 🟢 | `route:cache` | ✅ Recommandé |
| 🟢 | `view:cache` | ✅ Recommandé |
| 🟢 | `cache:clear` | ✅ Auto |
| 🟠 | `queue:restart` | ✅ Explicite |
| 🟢 | `storage:link` | ✅ Auto |
| 🟠 | `passport:install` | ✅ Explicite |
| 🟢 | `optimize` | ✅ Recommandé post-deploy |
| ⚫ | `db:wipe` | ❌ INTERDIT en prod |
| ⚫ | `migrate:reset` | ❌ INTERDIT en prod |

---

## 🛑 3. Configuration Serveur — ZONE CRITIQUE

### ❌ Actions INTERDITES sans validation

| Risque | Action | Conséquence |
|--------|--------|-------------|
| 🔴 | Supprimer un fichier `.env` | Erreur 500 immédiate |
| 🔴 | Modifier `nginx.conf` | Site inaccessible |
| 🔴 | Toucher aux certificats SSL | HTTPS cassé |
| 🔴 | Modifier `docker-compose.yml` prod | Services down |
| ⚫ | Supprimer un volume Docker | Perte de données irréversible |
| 🔴 | Modifier les ports exposés | Services inaccessibles |
| 🔴 | Changer les DNS/domaines | Site offline |
| 🔴 | Modifier règles firewall | Blocage trafic / faille sécurité |
| 🔴 | Modifier secrets Docker | Services cassés |
| 🟠 | Modifier variables d'environnement | Comportement imprévisible |
| 🟠 | Changer versions images Docker | Incompatibilités |

### ✅ Procédure obligatoire AVANT modification config

```markdown
🟢 □ 1. SAUVEGARDER le fichier actuel (cp file file.backup.YYYYMMDD)
🟢 □ 2. EXPLIQUER la modification prévue
🟢 □ 3. LISTER les services impactés
🟠 □ 4. PRÉVOIR la commande de rollback
🔴 □ 5. ATTENDRE validation explicite
🟡 □ 6. TESTER en staging si possible
🟠 □ 7. APPLIQUER avec monitoring actif
```

---

## 📚 4. Références Projet (Lecture obligatoire)

| Risque | Document | Chemin |
|--------|----------|--------|
| 🟢 | **Constitution** | `@.specify/memory/constitution.md` |
| 🟢 | **Modèle de données** | `@specs/001-immog-platform/data-model.md` |
| 🟢 | **Plan global** | `@specs/001-immog-platform/plan.md` |

---

## 🔐 5. Sécurité & Secrets — TOLÉRANCE ZÉRO

### Stockage exclusif : Docker Secrets

```
⚫ JAMAIS de secrets dans :
   • Code source
   • Logs (même en debug)
   • Commits (même anciens)
   • Documentation
   • Variables d'environnement non sécurisées
   • Messages d'erreur exposés
   • Fichiers temporaires
   • Output des scripts

🔴 DÉPÔT PUBLIC → Zéro tolérance sur les fuites
```

### 🔍 Checklist secrets avant commit

| Risque | Vérifier | Pattern à bloquer |
|--------|----------|-------------------|
| 🔴 | Clés API | `sk-`, `pk_`, `api_key=` |
| 🔴 | Tokens | `token=`, `bearer`, `jwt` |
| 🔴 | Passwords | `password=`, `pwd=`, `pass=` |
| 🟠 | URLs internes | `localhost`, `127.0.0.1`, `192.168.x.x` |
| 🔴 | IPs serveur | Adresses IP publiques |
| 🔴 | Credentials DB | `postgres://`, `mysql://` |
| 🔴 | Clés SSH | `-----BEGIN RSA PRIVATE KEY-----` |
| 🔴 | AWS | `AKIA`, `aws_secret` |
| 🔴 | Cloudflare | `CF_`, zone IDs |
| 🔴 | WhatsApp/WAHA | Session tokens, API keys |
| 🔴 | Stripe/Payment | `sk_live_`, `pk_live_` |
| 🔴 | OAuth | `client_secret`, `refresh_token` |

---

## 🗄️ 6. Base de Données — PROTECTION MAXIMALE

### Utilisateurs PostgreSQL

| Risque | Utilisateur | Rôle | Usage |
|--------|-------------|------|-------|
| 🟢 | `immog_app` | Application | ✅ Connexion app uniquement |
| 🔴 | `immog_user` | SUPERUSER | ❌ JAMAIS pour l'app — Admin uniquement |
| 🟢 | `immog_backup` | Backup | ✅ Sauvegardes uniquement |

### ❌ Opérations INTERDITES sans validation

| Risque | Opération | Validation requise |
|--------|-----------|-------------------|
| 🔴 | `DROP TABLE` | Triple confirmation |
| ⚫ | `DROP DATABASE` | Refus par défaut |
| 🔴 | `TRUNCATE` | Backup obligatoire avant |
| ⚫ | `DELETE` sans `WHERE` | Interdit |
| 🟠 | `ALTER TABLE DROP COLUMN` | Vérifier dépendances |
| ⚫ | `UPDATE` sans `WHERE` | Interdit |
| 🟠 | Migration destructive | Backup + rollback prévu |
| 🔴 | `ALTER TABLE RENAME` | Vérifier code dépendant |
| 🟠 | `CREATE INDEX` (grosses tables) | Maintenance mode recommandé |
| 🔴 | Modification des contraintes FK | Vérifier intégrité |

### ✅ Avant toute opération DB

```markdown
🟢 □ 1. VÉRIFIER existence d'un backup récent (< 24h)
🟢 □ 2. ESTIMER le nombre de lignes impactées (SELECT COUNT)
🟡 □ 3. TESTER la requête en READ-ONLY d'abord
🟠 □ 4. PRÉPARER le script de rollback
🟠 □ 5. EXÉCUTER en transaction si possible
🟢 □ 6. VALIDER le résultat immédiatement
🟡 □ 7. VÉRIFIER les logs d'erreur post-exécution
```

---

## 🛡️ 7. Sécurité Globale & DevOps

### Analyse d'impact obligatoire

Avant chaque action, évaluer :

| Risque | Vérification |
|--------|--------------|
| 🟠 | Impact sur les autres services Docker |
| 🔴 | Disponibilité de la plateforme |
| 🔴 | Sécurité des données utilisateurs |
| 🔴 | Conformité RGPD / Data Privacy |
| 🟠 | Temps d'indisponibilité estimé |
| 🟠 | Possibilité de rollback |
| 🟡 | Charge serveur pendant l'opération |
| 🟠 | Impact sur les jobs en cours |

### ❌ Interdictions absolues

| Risque | Interdit | Raison |
|--------|----------|--------|
| ⚫ | Compromettre la sécurité pour la rapidité | Stabilité > Vitesse |
| ⚫ | Commiter clés/tokens/URLs/IPs | Dépôt public |
| 🔴 | Modifier sans analyser les dépendances | Risque de cascade |
| 🔴 | Suppositions non vérifiées | Source d'erreurs |
| 🔴 | Actions multiples non demandées | Scope creep dangereux |
| ⚫ | Exécuter du code non testé en prod | Risque d'erreur 500 |
| 🔴 | Ignorer les erreurs de validation | Données corrompues |

---

## 🎯 8. RÈGLE FONDAMENTALE — UNE ACTION = UNE DEMANDE

### ⚠️ Principe de moindre action

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 FAIRE UNIQUEMENT ce qui est explicitement demandé   │
│                                                         │
│    Si d'autres actions semblent nécessaires :          │
│    → 🟢 NE PAS les faire                               │
│    → 🟢 RECOMMANDER avec explication                   │
│    → 🔴 ATTENDRE validation                            │
└─────────────────────────────────────────────────────────┘
```

### Format de recommandation

```markdown
## ✅ Action effectuée
🟢 [Description de ce qui a été fait]

## 💡 Recommandations (non effectuées)

### 🟠 Recommandation 1 : [Titre]
- **Quoi** : Description de l'action suggérée
- **Pourquoi** : Justification
- **Risque si ignoré** : Conséquence potentielle
- **Commande** : `./scripts/deploy-swarm.sh <cmd>`
- **Effort** : Faible / Moyen / Élevé

### 🔴 Recommandation 2 : [Titre]
...

⏳ Répondre avec le numéro de la recommandation à exécuter.
```

---

## 🔎 9. Checklist Avant TOUTE Action

### Phase 1 : Analyse (OBLIGATOIRE)

```markdown
🟢 □ Cette action est-elle explicitement demandée ?
🟢 □ Ai-je consulté les références projet ?
🟡 □ Quels services/fichiers sont impactés ?
🟠 □ Y a-t-il un risque d'erreur 500 ?
🟠 □ Un backup existe-t-il ?
🟠 □ Le rollback est-il possible ?
🟢 □ Quel script utiliser ?
🟡 □ Quel est le niveau de risque global ?
```

### Phase 2 : Communication (OBLIGATOIRE)

```markdown
🟢 □ 1. EXPLIQUER ce qui va être fait
🟢 □ 2. LISTER les fichiers/services touchés
🟢 □ 3. INDIQUER le script/commande exact
🟠 □ 4. AFFICHER le niveau de risque
🟠 □ 5. ESTIMER l'impact (downtime, risques)
🟠 □ 6. PROPOSER le plan de rollback
🔴 □ 7. ATTENDRE "deploy" ou validation explicite
```

### Phase 3 : Exécution (après validation)

```markdown
🟢 □ Exécuter UNIQUEMENT l'action validée
🟢 □ Utiliser le script approprié
🟢 □ Vérifier le résultat immédiatement
🟢 □ Documenter ce qui a été fait
🟠 □ Signaler toute anomalie
🟡 □ Confirmer le succès ou l'échec
```

---

## 🚨 10. Prévention Erreurs 500 & Incidents Prod

### ❌ Causes communes à éviter

| Risque | Cause | Prévention |
|--------|-------|------------|
| 🔴 | `.env` manquant/corrompu | JAMAIS toucher sans backup |
| 🟠 | Dépendance manquante | Toujours `composer install` après modif |
| 🟠 | Cache invalide | `artisan config:clear` après modif config |
| 🟠 | Permissions fichiers | Vérifier `www-data` ownership |
| 🟠 | Memory limit | Ne pas déployer de code non optimisé |
| 🔴 | DB connection timeout | Vérifier health des containers |
| 🔴 | SSL expiré/invalide | Ne jamais toucher aux certificats |
| 🔴 | Nginx mal configuré | Tester config avant reload |
| ⚫ | Volume Docker supprimé | JAMAIS supprimer de volume |
| 🔴 | Migration échouée | Toujours avoir rollback prêt |
| 🔴 | Firewall mal configuré | Tester avant d'appliquer |
| 🟠 | Session WAHA perdue | Backup régulier avec script dédié |
| 🟠 | Queue worker stoppé | Vérifier après chaque déploiement |
| 🔴 | Clé APP_KEY changée | Sessions invalidées, tokens cassés |
| 🟠 | Timezone mal configurée | Données temporelles incorrectes |

### ✅ Commandes de vérification AVANT déploiement

| Risque | Commande | But |
|--------|----------|-----|
| 🟢 | `./scripts/deploy-swarm.sh status` | État du stack |
| 🟢 | `./scripts/deploy-swarm.sh logs php` | Logs récents PHP |
| 🟢 | `./scripts/deploy-swarm.sh logs nginx` | Logs récents Nginx |
| 🟢 | `./scripts/deploy-swarm.sh artisan config:cache` | Vérifier config Laravel |
| 🟡 | `./scripts/deploy-swarm.sh artisan db:monitor` | Vérifier connexion DB |
| 🟢 | `curl -I https://immoguinee.com/api/health` | Test endpoint santé |
| 🟢 | `docker service ls` | État services Docker |

### 🔄 Procédure de rollback d'urgence

| Risque | Étape | Commande |
|--------|-------|----------|
| 🟠 | Rollback service spécifique | `./scripts/deploy-swarm.sh rollback <service>` |
| 🟠 | Rollback frontend | `./scripts/deploy-swarm.sh rollback frontend` |
| 🟠 | Rollback backend | `./scripts/deploy-swarm.sh rollback php` |
| 🟢 | Vérifier restauration | `./scripts/deploy-swarm.sh status` |
| 🟢 | Test endpoint | `curl -I https://immoguinee.com/health` |

---

## ✅ 11. Points de Vigilance Étendus

### Fichiers & Permissions

| Risque | Vérification | Commande |
|--------|--------------|----------|
| 🟠 | Ownership Laravel | `chown -R www-data:www-data storage bootstrap/cache` |
| 🟠 | Permissions storage | `chmod -R 775 storage bootstrap/cache` |
| 🔴 | Fichiers sensibles | `.env` doit être `600` |
| 🟡 | Logs accessibles | Vérifier permissions `/var/log` |

### Réseau & Connectivité

| Risque | Vérification | Impact si ignoré |
|--------|--------------|------------------|
| 🔴 | Ports ouverts | Services inaccessibles |
| 🔴 | Firewall rules | Blocage trafic légitime |
| 🔴 | DNS propagation | Site inaccessible |
| 🟠 | CDN/Cloudflare | Cache périmé |
| 🔴 | Rate limiting | Blocage utilisateurs légitimes |

### Docker & Containers

| Risque | Vérification | Conséquence |
|--------|--------------|-------------|
| 🟠 | Health checks | Container zombie |
| 🔴 | Resource limits | OOM killer |
| 🔴 | Network isolation | Faille sécurité |
| ⚫ | Volume persistence | Perte données |
| 🟠 | Image tags | Version incorrecte déployée |

### Monitoring & Alertes

| Risque | À vérifier | Fréquence |
|--------|------------|-----------|
| 🟢 | Logs erreurs | Avant/après chaque action |
| 🟡 | Métriques CPU/RAM | Pendant déploiement |
| 🟡 | Temps de réponse | Post-déploiement |
| 🔴 | Certificats SSL | Expiration |
| 🟠 | Espace disque | Hebdomadaire |
| 🟠 | Backup status | Quotidien |

### WhatsApp/WAHA

| Risque | Action | Script | Fréquence |
|--------|--------|--------|-----------|
| 🟢 | Backup session | `backup-waha-session.sh` | Quotidien recommandé |
| 🟠 | Restauration | `restore-waha-session.sh` | Si session perdue |
| 🟠 | Configuration | `deploy-swarm.sh setup-waha` | Initial uniquement |

---

## 🔒 12. RGPD & Protection des Données

### Obligations

| Risque | Règle | Application |
|--------|-------|-------------|
| 🔴 | Minimisation | Ne collecter que le nécessaire |
| 🔴 | Consentement | Opt-in explicite requis |
| 🔴 | Droit à l'oubli | Suppression sur demande |
| 🟠 | Portabilité | Export données utilisateur |
| 🔴 | Notification breach | 72h max si fuite |
| 🔴 | Chiffrement | Données sensibles chiffrées |
| 🟠 | Anonymisation | Logs et analytics |

### ❌ Interdictions données personnelles

| Risque | Interdit |
|--------|----------|
| ⚫ | Données perso dans les logs |
| ⚫ | Email/téléphone en clair dans le code |
| ⚫ | Données sensibles dans les URL |
| ⚫ | Backup non chiffré |
| ⚫ | Partage données sans consentement |
| 🔴 | Conservation excessive |

---

## 🧠 13. Règle d'Or

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🔴 STABILITÉ + SÉCURITÉ + CONFIDENTIALITÉ            │
│              >                                          │
│   🟢 RAPIDITÉ + COMMODITÉ + SCOPE SUPPLÉMENTAIRE       │
│                                                         │
│   ─────────────────────────────────────────────────    │
│                                                         │
│   🎯 UNE SEULE ACTION PAR DEMANDE                      │
│   📋 RECOMMANDER LE RESTE                              │
│   ⏳ ATTENDRE VALIDATION                               │
│   🔧 UTILISER LES SCRIPTS FOURNIS                      │
│   🎨 TOUJOURS INDIQUER LE NIVEAU DE RISQUE            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📖 14. Référence Rapide des Scripts

### Déploiement

| Risque | Commande | Description |
|--------|----------|-------------|
| 🔴 | `./scripts/deploy-swarm.sh full` | Premier déploiement complet |
| 🟢 | `./scripts/deploy-swarm.sh update-frontend` | MAJ frontend |
| 🟠 | `./scripts/deploy-swarm.sh update-backend` | MAJ backend |
| 🟠 | `./scripts/deploy-swarm.sh update-all` | MAJ tout |

### Monitoring

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `./scripts/deploy-swarm.sh status` | État des services |
| 🟢 | `./scripts/deploy-swarm.sh logs php` | Logs PHP |
| 🟢 | `./scripts/deploy-swarm.sh logs nginx` | Logs Nginx |

### Gestion

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟠 | `./scripts/deploy-swarm.sh rollback php` | Rollback PHP |
| 🟠 | `./scripts/deploy-swarm.sh scale frontend 3` | Scale frontend |
| 🔴 | `./scripts/deploy-swarm.sh remove` | Supprimer stack |

### Laravel

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟠 | `./scripts/deploy-swarm.sh artisan migrate` | Migrations |
| 🟢 | `./scripts/deploy-swarm.sh artisan cache:clear` | Clear cache |
| 🟠 | `./scripts/deploy-swarm.sh post-deploy` | Post-déploiement |
| 🟠 | `./scripts/deploy-swarm.sh post-deploy --seed` | + Seed DB |

### WhatsApp

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `./scripts/backup-waha-session.sh` | Backup session |
| 🟠 | `./scripts/restore-waha-session.sh` | Restore session |
| 🟠 | `./scripts/deploy-swarm.sh setup-waha` | Config initiale |

### Sécurité

| Risque | Commande | Description |
|--------|----------|-------------|
| 🔴 | `./scripts/cloudflare-firewall.sh` | Config firewall CF |
| 🔴 | `./scripts/do-cloudflare-firewall.sh` | Firewall DO + CF |

### Build

| Risque | Commande | Description |
|--------|----------|-------------|
| 🟢 | `./scripts/build-n8n-image.sh` | Build image n8n |
| 🟢 | `./scripts/deploy-swarm.sh build` | Build images app |

---

## 📋 15. Template de Réponse Standard

```markdown
## 🎯 Action demandée
[Description]

## 🎨 Niveau de risque global : [🟢/🟡/🟠/🔴]

## 📊 Analyse d'impact
| Élément | Risque | Impact |
|---------|--------|--------|
| Service X | 🟢 | Aucun |
| Base de données | 🟠 | Migration requise |
| ... | ... | ... |

## 🔧 Commande à exécuter
```bash
🟠 ./scripts/deploy-swarm.sh <commande>
```

## 🔄 Plan de rollback
```bash
🟠 ./scripts/deploy-swarm.sh rollback <service>
```

## ✅ Checklist pré-exécution
🟢 □ Backup vérifié
🟢 □ Services OK
🟠 □ Rollback prêt

---
⏳ **Attente validation : tapez `deploy` pour continuer**
```

---

**💾 Fichier** : `.claude/instructions.md`

**Version** : 3.1 — Indicateurs de risque systématiques