# ImmoG Constitution
<!-- Plateforme d'Annonces Immobilières pour la Guinée-Conakry -->

## Vision du Projet

**ImmoG** est une plateforme d'annonces immobilières moderne conçue pour digitaliser le marché immobilier guinéen. Elle permet aux particuliers, propriétaires et agents de publier gratuitement leurs annonces, de trouver des biens via des filtres avancés, de communiquer en toute sécurité, de générer des contrats automatiquement et de finaliser les transactions via Mobile Money.

## Core Principles

### I. Simplicité & Accessibilité (NON-NÉGOCIABLE)
**Une plateforme accessible à tous, même sans expertise technique**
- Interface intuitive : toute action doit être réalisable en 3 clics maximum
- Mobile-first : 90% des utilisateurs guinéens accèdent via smartphone
- Temps de chargement < 3s sur connexion 3G/4G
- Support du français simplifié (langage clair, pas de jargon)
- Aide contextuelle visible sur chaque page critique
- Mode sombre/clair pour confort visuel

### II. Gratuité & Monétisation Éthique
**Annonces gratuites illimitées pour démocratiser l'accès**
- Publication d'annonces 100% gratuite (particuliers, agents, propriétaires)
- Pas de limite de nombre d'annonces actives
- Monétisation via services premium optionnels :
  - Mise en avant d'annonces (boost)
  - Badges de vérification (propriétaire vérifié)
  - Statistiques avancées pour agents
  - Forfaits pour agences immobilières
- Transparence totale sur les tarifs

### III. Contexte Local Guinéen
**Adapter chaque fonctionnalité aux réalités du marché guinéen**
- **Localisation** :
  - Adressage par quartiers/communes (Matoto, Ratoma, Kaloum, etc.)
  - Support de Conakry + villes principales (Kindia, Labé, Kankan, etc.)
  - Carte interactive adaptée aux zones mal référencées
- **Types de biens** :
  - Locations : Studio, Chambre simple, Appartement, Villa, Duplex, Immeuble, Bureau, entrepot, logement courte séjour
  - Ventes : Terrain, Maison, Immeuble, Commerce
  - Biens atypiques : Chambre en colocation, Bureau partagé
- **Formats locaux** :
  - Devise : Francs Guinéens (GNF) avec séparateurs d'espaces (ex: 5 000 000 GNF)
  - Superficies en m² et hectares
  - Documents guinéens : Bail guinéen, Titre foncier, Certificat de propriété

### IV. Communication Sécurisée
**Protéger les utilisateurs contre fraudes et arnaques**
- Messagerie interne obligatoire (pas d'échange de numéros avant accord mutuel)
- Système de signalement d'annonces suspectes (1 clic)
- Détection automatique de mots-clés frauduleux
- Historique complet des conversations (traçabilité)
- Notification push/SMS pour nouveaux messages
- Blocage d'utilisateurs malveillants
- Mode anonyme pour les recherches (pas de numéro visible)

### V. Vérification & Confiance
**Réduire les fraudes via un système de vérification multicouche**
- **Vérification utilisateurs** :
  - Numéro de téléphone (OTP SMS obligatoire)
  - Adresse email (optionnelle mais recommandée)
  - Document d'identité (CNI/Passeport) pour badges vérifiés
- **Vérification annonces** :
  - Photos obligatoires (minimum 3, maximum 20)
  - Validation automatique des prix aberrants (alertes)
  - Géolocalisation GPS optionnelle mais valorisée
- **Système de notation** :
  - Notes 1-5 étoiles après transaction
  - Commentaires publics modérés
  - Badge "Vendeur fiable" après 5 transactions positives

### VI. Automatisation Légale
**Simplifier la génération de documents légaux conformes**
- **Génération automatique de contrats** :
  - Bail de location (durée déterminée/indéterminée)
  - Promesse de vente
  - État des lieux (entrée/sortie)
  - Quittance de loyer
- **Conformité légale guinéenne** :
  - Templates validés par juristes locaux
  - Clauses obligatoires pré-remplies
  - Personnalisation guidée (formulaire simple)
- **Signature électronique** :
  - Signature via OTP SMS (2FA)
  - Horodatage sécurisé
  - Archivage crypté 10 ans minimum
  - Export PDF signé

### VII. Paiements Sécurisés
**Intégration native avec Mobile Money local**
- **Providers supportés** :
  - Orange Money (priorité 1)
  - MTN Mobile Money (priorité 2)
  - Paiement espèces (marqué "à confirmer")
- **Fonctionnalités** :
  - Paiement post-signature uniquement (sécurité)
  - Frais de service transparents (max 2%)
  - Reçu automatique par SMS + Email
  - Historique complet des transactions
  - Remboursement en cas de litige (sous 48h)
- **Sécurité** :
  - Escrow system : argent bloqué jusqu'à validation
  - 2FA obligatoire pour paiements > 500k GNF
  - Détection de fraudes (machine learning)

### VIII. Performance & Scalabilité
**Garantir une expérience fluide même avec forte croissance**
- Support de 100,000+ annonces actives simultanées
- Temps de recherche < 500ms (même avec filtres complexes)
- Optimisation images automatique (compression, WebP, lazy loading)
- Cache intelligent pour annonces populaires (Redis)
- CDN pour assets statiques (images, CSS, JS)
- Base de données répliquée (haute disponibilité)

### IX. Automatisation via n8n (NON-NÉGOCIABLE)
**Orchestrer tous les workflows automatisés avec n8n**
- **Plateforme centrale** : n8n (open source) pour tous les workflows
- **Workflows critiques** :
  - Nouvelle annonce → Notifications utilisateurs matching critères
  - Nouveau message → Alerte WhatsApp (si opt-in) + SMS + Push
  - Signature contrat → Génération PDF + Archivage S3 + Notifications
  - Paiement reçu → Génération quittance + Notifications + Mise à jour DB
  - Rappels automatiques → Échéances loyer, visites programmées
  - Modération → Détection mots-clés frauduleux + Alerte admin
- **Intégrations n8n** :
  - WAHA (WhatsApp) : Notifications opt-in
  - Orange SMS API : Messages critiques
  - PostgreSQL : Lecture/écriture base de données
  - S3 : Upload/download documents
  - Email (SMTP) : Notifications secondaires
- **Avantages** :
  - Visual workflow builder (facilité maintenance)
  - Auto-hébergé (contrôle total, confidentialité)
  - Extensible (custom nodes si besoin)
  - Logs détaillés pour debugging

### X. Open Source First (PRINCIPE FONDAMENTAL)
**Privilégier les solutions open source pour indépendance et pérennité**
- **Stack 100% open source** :
  - Frontend : Next.js, React, TailwindCSS
  - Backend : Node.js, Express/Fastify
  - Base de données : PostgreSQL, Redis
  - Automation : n8n
  - Messaging : WAHA (WhatsApp), Socket.io
  - Infrastructure : Docker, Linux
- **Avantages** :
  - Pas de vendor lock-in
  - Coûts maîtrisés (pas de licences)
  - Communauté active (support, mises à jour)
  - Auditabilité (sécurité, conformité)
  - Personnalisation totale
- **Exceptions autorisées** (services payants essentiels) :
  - Hébergement cloud (OVH, AWS, DigitalOcean)
  - Mobile Money APIs (Orange, MTN) - pas d'alternative
  - Monitoring (Sentry) - version open source disponible mais hosted plus pratique
  - CDN (optionnel si performance critique)

## Exigences Techniques

### Stack Technologique

**Frontend** :
- Framework : Next.js 14+ (App Router, React 18+)
- UI Library : TailwindCSS + Shadcn/UI
- État global : Zustand ou React Context
- Formulaires : React Hook Form + Zod validation
- Maps : Leaflet + OpenStreetMap (gratuit)
- PWA : Support offline pour consultation annonces

**Backend** :
- Runtime : Node.js 20+ LTS
- Framework : Express.js ou Fastify
- API : RESTful + endpoints GraphQL (phase 2)
- Auth : JWT + Refresh tokens, bcrypt
- File upload : Multer + Sharp (compression images)

**Base de données** :
- Principal : PostgreSQL 15+ (données structurées)
  - Extensions : PostGIS (géolocalisation), pg_trgm (recherche fulltext)
- Cache : Redis 7+ (sessions, cache recherches)
- Storage : AWS S3 / DigitalOcean Spaces (images, documents)

**Messagerie & Temps réel** :
- WebSocket : Socket.io (chat temps réel)
- WhatsApp : WAHA (WhatsApp HTTP API - open source, auto-hébergé)
  - Notifications opt-in utilisateurs
  - Rappels de paiement, confirmations, alertes
  - Multi-sessions support
- Notifications : Firebase Cloud Messaging (push mobile) ou alternatives open source (Gotify, ntfy.sh)
- SMS : API locale guinéenne (Orange SMS API)
- Email : Mailtrain (open source) ou Resend/SendGrid (si budget)

**Paiements** :
- Orange Money API (REST)
- MTN Mobile Money API (SOAP → REST wrapper)
- Webhook handlers pour callbacks

**Automation & Workflows** :
- n8n : Workflow automation platform (open source, auto-hébergé)
  - Interface web visuelle pour créer workflows
  - 300+ intégrations natives (PostgreSQL, S3, WAHA, etc.)
  - Webhooks pour événements temps réel
  - Scheduling (cron jobs pour rappels automatiques)
  - Error handling & retry logic
- Exemples workflows :
  - Trigger: Nouvelle annonce → Actions: Notification WhatsApp + Email matching users
  - Trigger: Paiement confirmé → Actions: Générer quittance PDF + Upload S3 + Notifier parties

**Infrastructure** :
- Containerisation : Docker + Docker Compose
  - Containers: frontend, backend, postgresql, redis, n8n, waha
  - Docker Compose pour orchestration locale
  - Production: Docker Swarm ou Kubernetes (si scale)
- Hébergement : OVH (priorité - data souveraineté) ou DigitalOcean
- CI/CD : GitHub Actions (open source, gratuit pour projets publics)
- Monitoring :
  - Sentry (errors - version self-hosted possible)
  - Grafana + Prometheus (metrics - open source)
  - Uptime Kuma (monitoring uptime - open source)
- Backup : Automated daily PostgreSQL dumps → S3
  - Rétention : 30 jours
  - Tests de restauration mensuels

### Architecture

**Pattern** : Monolithe modulaire (début) → Microservices (phase 4)

**Modules** :
- `auth` : Authentification, gestion utilisateurs
- `listings` : Annonces (CRUD, recherche)
- `messaging` : Chat interne
- `contracts` : Génération documents légaux
- `payments` : Intégration Mobile Money
- `notifications` : SMS, Email, Push, WhatsApp (via n8n)
- `workflows` : Webhooks pour déclencher workflows n8n
- `admin` : Modération, analytics

**Architecture n8n** :
- n8n tourne en container Docker séparé
- Backend expose des webhooks pour événements critiques :
  - POST /webhooks/listing-created
  - POST /webhooks/message-received
  - POST /webhooks/contract-signed
  - POST /webhooks/payment-confirmed
- n8n écoute ces webhooks et déclenche workflows appropriés
- Workflows n8n peuvent appeler API backend pour actions (update DB, etc.)

**Sécurité** :
- HTTPS obligatoire (Let's Encrypt)
- Helmet.js (headers sécurisés)
- Rate limiting (express-rate-limit)
- CORS configuré strictement
- Sanitisation inputs (validator.js)
- Protection CSRF pour formulaires
- Chiffrement données sensibles (AES-256)

### Testing & Qualité (NON-NÉGOCIABLE)

**Tests obligatoires** :
- **Unitaires** : Jest + 70% coverage minimum (logique métier)
- **Intégration** : Supertest (API endpoints)
- **E2E** : Playwright (parcours critiques)
  - Publication annonce
  - Recherche + filtres
  - Envoi message
  - Génération contrat
  - Paiement Mobile Money
- **Performance** : k6 ou Artillery (load testing)
- **Sécurité** : OWASP ZAP (scan automatisé)

**Qualité code** :
- ESLint + Prettier (formatage automatique)
- Husky (pre-commit hooks)
- TypeScript strict mode
- Code review obligatoire (1+ reviewer)

## Roadmap de Développement

### Mois 1 : Fondations & Annonces (Semaines 1-4)

**Semaine 1-2 : Infrastructure & Auth**
- Setup projet (Next.js + PostgreSQL + Docker)
- Setup n8n (container Docker + configuration initiale)
- Setup WAHA (container Docker + connexion WhatsApp Business)
- Authentification (inscription, login, OTP SMS)
- Dashboard basique utilisateur
- Upload photos (max 20 par annonce)
- Workflow n8n test : Nouvel utilisateur → Email bienvenue

**Semaine 3-4 : Annonces & Recherche**
- CRUD annonces (créer, éditer, supprimer)
- Recherche avec filtres avancés :
  - Type bien (location, vente)
  - Localisation (commune, quartier)
  - Prix min/max
  - Superficie min/max
  - Nombre de chambres/salons
- Pagination + tri (récent, prix, popularité)
- Page détail annonce (galerie photos, carte, contact)

**Semaine 4 : Messagerie & Notation**
- Chat temps réel (Socket.io)
- Historique conversations
- Système notation 1-5 étoiles
- Commentaires publics
- Workflows n8n notifications :
  - Nouveau message → WhatsApp (si opt-in activé) + SMS + Push
  - Nouvelle annonce → Alertes utilisateurs avec critères matching
  - Paramètres utilisateur : Opt-in/out notifications WhatsApp

**Livrables Mois 1** :
- ✅ Publication annonces gratuites illimitées
- ✅ Recherche + filtres avancés (7+ critères)
- ✅ Messagerie interne sécurisée
- ✅ Système notation + commentaires
- ✅ n8n opérationnel (3+ workflows actifs)
- ✅ WAHA connecté (notifications WhatsApp opt-in)
- ✅ 50 annonces test publiées
- ✅ 20 utilisateurs beta internes testant notifications WhatsApp

### Mois 2 : Contrats & Documents (Semaines 5-8)

**Semaine 5-6 : Génération Contrats**
- Templates contrats (Bail location, Promesse vente, État des lieux)
- Formulaire guidé personnalisation contrats
- Prévisualisation PDF avant signature
- Validation juridique (collaboration juriste local)

**Semaine 7 : Signatures Électroniques**
- Système signature OTP SMS (2FA)
- Horodatage sécurisé (timestamp server)
- Multi-signatures (propriétaire + locataire)
- Export PDF signé + cachet électronique
- Workflow n8n :
  - Demande signature → WhatsApp + SMS aux parties
  - Contrat signé → PDF généré + Upload S3 + Notifications parties + Email récapitulatif

**Semaine 8 : Archivage & Vérification**
- Archivage sécurisé S3 (chiffrement AES-256)
- Accès documents signés (liste, téléchargement)
- Vérification documents uploadés :
  - CNI/Passeport (OCR détection texte)
  - Titre foncier (format PDF validé)
  - Photos (détection duplicatas)
- Badge "Vérifié" pour utilisateurs

**Livrables Mois 2** :
- ✅ Génération contrats automatiques (3 types)
- ✅ Signatures électroniques OTP SMS
- ✅ Archivage sécurisé 10 ans
- ✅ Module vérification documents
- ✅ 100 contrats test générés
- ✅ Tests juridiques validés

### Mois 3 : Paiements & Lancement (Semaines 9-12)

**Semaine 9 : Intégration Mobile Money**
- API Orange Money (sandbox → production)
- API MTN Mobile Money (sandbox → production)
- Webhook handlers (confirmations paiements)
- Escrow system (argent bloqué)
- Workflows n8n paiements :
  - Paiement initié → SMS confirmation + WhatsApp recap
  - Paiement confirmé → Génération quittance PDF + Upload S3 + Notifications + Update statut DB
  - Rappel échéance → WhatsApp (J-3, J-1) + SMS (J-0)
  - Paiement en retard → Notification propriétaire + Alerte locataire

**Semaine 10 : Dashboard & Analytics**
- Dashboard utilisateur :
  - Mes annonces (actives, expirées)
  - Mes conversations
  - Mes contrats signés
  - Mes paiements
- Dashboard agent immobilier :
  - Statistiques annonces (vues, clics, messages)
  - Leads générés
  - Commissions calculées
- Dashboard admin :
  - Modération annonces
  - Gestion utilisateurs
  - Analytics globales

**Semaine 11 : Tests Beta**
- Recrutement 100 utilisateurs beta (Conakry)
- Tests terrain : publication 200+ annonces réelles
- Collecte feedback (formulaire + interviews)
- Corrections bugs critiques

**Semaine 12 : Optimisation & Lancement**
- Optimisation performance (caching, images)
- Sécurisation finale (audit OWASP)
- Documentation utilisateur (FAQ, guides)
- Campagne marketing pré-lancement (réseaux sociaux)
- **Lancement public** 🚀

**Livrables Mois 3** :
- ✅ Intégration Mobile Money (Orange + MTN)
- ✅ Paiements post-signature sécurisés
- ✅ Dashboard utilisateurs complet
- ✅ Dashboard agents immobiliers
- ✅ Dashboard admin modération
- ✅ Tests beta 100 utilisateurs
- ✅ 500+ annonces réelles
- ✅ Lancement public

## Post-Lancement (Mois 4-6)

**Améliorations prioritaires** :
- **Workflows n8n avancés** :
  - Détection fraudes ML (patterns suspects)
  - Recommandations personnalisées IA
  - Analytics prédictifs (meilleur moment pour publier annonce)
  - A/B testing automatisé (optimisation conversion)
- **Features utilisateurs** :
  - Galerie vidéos (visites virtuelles)
  - Visite 360° (photos panoramiques)
  - Chatbot WhatsApp via WAHA (FAQ automatiques)
  - Système alertes avancé (prix marché, nouveaux biens)
- **Expansion géographique** :
  - Extension villes province (Kindia, Labé, Kankan)
  - Adaptation langues locales (Soussou, Poular, Malinké)
- **Applications natives** :
  - Application mobile React Native (iOS + Android)
  - Progressive Web App (PWA) optimisée

## Gates de Qualité

**Avant chaque déploiement** :
- ✅ Tous les tests passent (CI/CD green)
- ✅ Pas de régression performance (Lighthouse > 80)
- ✅ Pas de failles sécurité critiques (OWASP scan)
- ✅ Code review approuvé (1+ senior dev)
- ✅ Documentation mise à jour
- ✅ Test manuel sur Android low-end (< 150$)
- ✅ Backup base de données effectué

**Métriques de succès** :
- Mois 1 : 50 utilisateurs actifs, 100 annonces
- Mois 2 : 200 utilisateurs, 500 annonces, 50 contrats générés
- Mois 3 : 500 utilisateurs, 1000 annonces, 100 transactions
- Mois 6 : 5000 utilisateurs, 10000 annonces, 1000 transactions

## Gouvernance

### Règles de Développement
- Cette constitution guide toutes les décisions techniques
- Toute déviation doit être justifiée et documentée (ADR)
- Les features non planifiées nécessitent validation
- La simplicité prime sur la complexité : "KISS > YAGNI"
- Question clé : "Est-ce que ça aide un Guinéen à trouver un logement ?"

### Priorités
1. **Sécurité** : Pas de compromis sur données utilisateurs
2. **Performance** : Plateforme rapide = plus d'utilisateurs
3. **Simplicité** : Interface intuitive = moins de support
4. **Fiabilité** : Moins de bugs = meilleure réputation
5. **Features** : Seulement après les 4 premiers points

### Décisions Architecturales
- Documenter choix majeurs (ADR - Architecture Decision Records)
- Privilégier solutions éprouvées (battle-tested)
- Évaluer coûts vs bénéfices (TCO - Total Cost of Ownership)
- Éviter vendor lock-in (portabilité)
- Penser scalabilité dès le début (mais pas over-engineer)

### Support & Maintenance
- Monitoring 24/7 (Sentry + uptime monitoring)
- Backup quotidien automatique (rétention 30 jours)
- Hotfix déployable en < 2h (bugs critiques)
- Mises à jour sécurité hebdomadaires
- Support utilisateurs : Email + WhatsApp Business

### Bonnes Pratiques n8n

**Organisation workflows** :
- Nommage clair : `[Trigger] - [Action] - [Destination]` (ex: "New Listing - Notify - WhatsApp")
- Tags par catégorie : `#notifications`, `#paiements`, `#contrats`, `#moderation`
- Documentation inline : Notes dans chaque workflow expliquant la logique
- Versionning : Export régulier des workflows (backup JSON)

**Performance** :
- Éviter boucles infinies (max iterations configuré)
- Timeouts raisonnables (30s par défaut, 2min max)
- Retry logic : 3 tentatives max avec backoff exponentiel
- Queue system pour tâches lourdes (génération PDF)

**Sécurité** :
- Credentials séparées (pas hardcodées dans workflows)
- Webhook URLs sécurisées (authentification via API keys)
- Logs sensibles désactivés (pas de logs passwords/tokens)
- Rate limiting sur webhooks publics

**Monitoring** :
- Alertes erreurs → Canal Slack/Discord dédié
- Métriques trackées : Succès rate, durée moyenne, erreurs
- Dashboard Grafana : Vue d'ensemble workflows critiques
- Tests hebdomadaires workflows critiques (dry run)

**Version**: 1.0.0 | **Ratified**: 2025-01-28 | **Last Amended**: 2025-01-28 | **Next Review**: 2025-04-28
