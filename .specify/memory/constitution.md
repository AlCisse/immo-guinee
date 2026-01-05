# ImmoGuinée Constitution
<!-- Plateforme d'Annonces Immobilières pour la Guinée-Conakry -->

## Vision du Projet

**ImmoGuinée** est la plateforme immobilière de référence en Guinée, conçue pour digitaliser et moderniser le marché immobilier guinéen. Elle permet aux particuliers, propriétaires et agences de publier gratuitement leurs annonces, de trouver des biens via des filtres avancés, de communiquer en toute sécurité, de générer des contrats automatiquement et de finaliser les transactions via Mobile Money.

**Slogan**: *Trouvez votre logement idéal en Guinée*

---

## Core Principles

### I. Simplicité & Accessibilité (NON-NÉGOCIABLE)
**Une plateforme accessible à tous, même sans expertise technique**
- Interface intuitive : toute action doit être réalisable en 3 clics maximum
- Mobile-first : 90% des utilisateurs guinéens accèdent via smartphone
- Temps de chargement < 3s sur connexion 3G/4G
- Support bilingue : Français (défaut) + Anglais
- Aide contextuelle visible sur chaque page critique
- Mode sombre/clair pour confort visuel
- PWA pour consultation offline

### II. Gratuité & Monétisation Éthique
**Annonces gratuites illimitées pour démocratiser l'accès**
- Publication d'annonces 100% gratuite (particuliers, agents, propriétaires)
- Pas de limite de nombre d'annonces actives
- Monétisation via services premium optionnels :
  - Mise en avant d'annonces (boost premium)
  - Badges de vérification (propriétaire vérifié)
  - Statistiques avancées pour agents
  - Forfaits pour agences immobilières
- Commissions transparentes sur transactions :
  - Location longue durée : 1 mois de loyer
  - Location courte durée : 10% du montant
  - Vente : 3% du prix de vente
- Réductions par badge : Bronze (0%), Argent (0%), Or (-20%), Diamant (-40%)

### III. Contexte Local Guinéen
**Adapter chaque fonctionnalité aux réalités du marché guinéen**
- **Localisation** :
  - Adressage par quartiers/communes (Matoto, Ratoma, Kaloum, Dixinn, Matam)
  - Support de Conakry + villes principales (Kindia, Labé, Kankan, Mamou, etc.)
  - Carte interactive Leaflet + OpenStreetMap adaptée aux zones mal référencées
  - PostGIS pour recherche géospatiale
- **Types de biens** :
  - Locations : Studio, Chambre-Salon, Appartement (2-3ch), Villa, Duplex, Bureau, Magasin, Entrepôt
  - Ventes : Terrain, Maison, Villa, Immeuble, Commerce
  - Location courte durée : Logement meublé style Airbnb
- **Formats locaux** :
  - Devise : Francs Guinéens (GNF) avec séparateurs d'espaces (ex: 5 000 000 GNF)
  - Superficies en m² et hectares
  - Documents guinéens : Bail guinéen, Titre foncier, Certificat de propriété

### IV. Communication Sécurisée
**Protéger les utilisateurs contre fraudes et arnaques**
- Messagerie interne obligatoire avec chiffrement E2E
- Système de signalement d'annonces suspectes (1 clic)
- Détection automatique de mots-clés frauduleux (ContentModerationService)
- Historique complet des conversations (traçabilité)
- Notifications multi-canal : Push, SMS, Email, WhatsApp
- Blocage d'utilisateurs malveillants
- Mode anonyme pour les recherches (pas de numéro visible avant accord)

### V. Vérification & Confiance
**Réduire les fraudes via un système de vérification multicouche**
- **Vérification utilisateurs** :
  - Numéro de téléphone (OTP SMS/WhatsApp obligatoire)
  - Adresse email (optionnelle mais recommandée)
  - Document d'identité (CNI/Passeport) pour badges vérifiés
  - 2FA Google Authenticator pour admins
- **Vérification annonces** :
  - Photos obligatoires (minimum 3, maximum 20)
  - Validation automatique des prix aberrants
  - Géolocalisation GPS optionnelle mais valorisée
  - Modération par queue avant publication
- **Système de badges gamifié** :
  - BRONZE : Utilisateur de base
  - ARGENT : 1+ transaction, rating minimum
  - OR : 5+ transactions, rating >= 4.0
  - DIAMANT : 20+ transactions, rating >= 4.5
- **Système de notation** :
  - Notes 1-5 étoiles après transaction
  - Commentaires publics modérés
  - Badge automatique basé sur performance

### VI. Automatisation Légale
**Simplifier la génération de documents légaux conformes**
- **Génération automatique de contrats** :
  - Bail de location (durée déterminée/indéterminée)
  - Promesse de vente
  - État des lieux (entrée/sortie)
  - Quittance de loyer (PDF)
- **Conformité légale guinéenne** :
  - Templates validés par juristes locaux
  - Clauses obligatoires pré-remplies
  - Personnalisation guidée (formulaire simple)
  - Durée minimum 7 jours avant résiliation
  - Préavis 3 mois pour terminaison
- **Signature électronique** :
  - Signature via OTP SMS (2FA)
  - Horodatage sécurisé
  - Archivage crypté 10 ans minimum
  - Export PDF signé avec certificat d'authenticité

### VII. Paiements Sécurisés
**Intégration native avec Mobile Money local**
- **Providers supportés** :
  - Orange Money (priorité 1)
  - MTN Mobile Money (priorité 2)
  - Paiement espèces (marqué "à confirmer")
- **Fonctionnalités** :
  - Paiement post-signature uniquement (sécurité)
  - Frais de service transparents
  - Reçu automatique par SMS + Email + WhatsApp
  - Historique complet des transactions
  - Remboursement en cas de litige
- **Sécurité** :
  - Escrow system : argent bloqué jusqu'à validation
  - 2FA obligatoire pour paiements sensibles
  - Détection de fraudes (FraudDetectionService)
  - Webhooks sécurisés pour callbacks

### VIII. Performance & Scalabilité
**Garantir une expérience fluide même avec forte croissance**
- Support de 100,000+ annonces actives simultanées
- Temps de recherche < 500ms (Elasticsearch)
- Optimisation images automatique (Sharp, WebP, lazy loading)
- Cache intelligent (Redis + Varnish)
- CDN pour assets statiques (DigitalOcean Spaces)
- Base de données répliquée PostgreSQL avec PostGIS
- Docker Swarm pour haute disponibilité

### IX. Automatisation via n8n (NON-NÉGOCIABLE)
**Orchestrer tous les workflows automatisés avec n8n**
- **Plateforme centrale** : n8n (open source) pour tous les workflows
- **Workflows implémentés** :
  - `send-otp-whatsapp.json` : Envoi OTP via WhatsApp
  - `paiement-quittance.json` : Génération quittance après paiement
  - `signature-contrat-pdf.json` : Workflow signature contrat
  - `escrow-timeout.json` : Gestion timeout escrow
  - `nouveau-message-alerts.json` : Alertes nouveaux messages
  - `docker-ops-telegram.json` : Alertes ops via Telegram
- **Intégrations n8n** :
  - WAHA (WhatsApp) : Notifications opt-in
  - Twilio SMS : Messages critiques
  - PostgreSQL : Lecture/écriture base de données
  - S3 : Upload/download documents
  - Email (SMTP) : Notifications secondaires
  - Telegram : Alertes opérationnelles

### X. Open Source First (PRINCIPE FONDAMENTAL)
**Privilégier les solutions open source pour indépendance et pérennité**
- **Stack 100% open source** :
  - Frontend : Next.js 15, React 18, TailwindCSS
  - Backend : Laravel 12, PHP 8.2+
  - Base de données : PostgreSQL 15+, Redis 7+
  - Search : Elasticsearch 8.17
  - Automation : n8n
  - Messaging : WAHA (WhatsApp), Socket.io, Laravel Reverb
  - Infrastructure : Docker, Docker Swarm, Traefik
- **Avantages** :
  - Pas de vendor lock-in
  - Coûts maîtrisés (pas de licences)
  - Communauté active (support, mises à jour)
  - Auditabilité (sécurité, conformité)
  - Personnalisation totale
- **Exceptions autorisées** (services payants essentiels) :
  - Hébergement cloud (DigitalOcean)
  - Mobile Money APIs (Orange, MTN) - pas d'alternative
  - Sentry (error tracking) - hosted plus pratique
  - Twilio (SMS)

---

## Stack Technologique Actuelle

### Frontend (Next.js 15)
```
Framework       : Next.js 15.1.0 (App Router, SSR/SSG)
Runtime         : Node.js >= 20.0.0
TypeScript      : 5.7.2 (strict mode)
UI Library      : TailwindCSS 3.4.1 + Headless UI 2.2.9
State           : TanStack React Query 5.62 + React Context
Forms           : React Hook Form 7.51 + Zod 3.24
i18n            : next-intl 4.6.1 (FR + EN)
Maps            : Leaflet 1.9.4 + React Leaflet 4.2.1
Animations      : Framer Motion 11.18
Icons           : Lucide React 0.469
Real-time       : Socket.io-client 4.7 + Laravel Echo 1.16
HTTP Client     : Axios 1.7.9
Date            : date-fns 3.3.1
```

### Backend (Laravel 12)
```
Framework       : Laravel 12.40 (PHP 8.2 || 8.3)
API Auth        : Laravel Passport 12.4 + Sanctum 4.0
WebSocket       : Laravel Reverb 1.0
Queue           : Redis + Laravel Horizon 5.30
Search          : Elasticsearch 8.17 + Laravel Scout 10.12
PDF             : barryvdh/laravel-dompdf 3.0
Images          : Intervention/image 3.10
Permissions     : Spatie/laravel-permission 6.4
2FA             : PragmaRX/google2fa-laravel 2.2
Storage         : AWS SDK PHP 3.368 (S3-compatible)
```

### Base de Données
```
Principal       : PostgreSQL 15+ avec PostGIS 3.5
Extensions      : PostGIS (géolocalisation), pg_trgm (fulltext)
Cache/Session   : Redis 7.4-alpine
Search          : Elasticsearch 8.17.0
Storage         : DigitalOcean Spaces (S3-compatible)
Backup          : MinIO (local cache) + DO Spaces (production)
```

### Infrastructure Docker
```
Orchestration   : Docker Swarm (production)
Reverse Proxy   : Traefik v2.11 (SSL/TLS auto via Let's Encrypt)
Cache HTTP      : Varnish 7.6
WebSocket       : Laravel Reverb
Automation      : n8n
WhatsApp        : WAHA
Antivirus       : ClamAV (scan fichiers uploadés)
Secrets         : Docker Secrets
```

### Monitoring & Observabilité
```
Metrics         : Prometheus v3.1.0
Dashboards      : Grafana 11.4.0
Alerting        : AlertManager 0.28.0
Container       : cAdvisor 0.51.0
Exporters       : Node, Redis, PostgreSQL
Error Tracking  : Sentry
Session Replay  : LogRocket
DB Admin        : PgAdmin 4
```

---

## Architecture

### Pattern Architectural
- **Backend** : MVC + Service Layer + Repository Pattern
- **Frontend** : Components + Custom Hooks + Context API
- **API** : RESTful JSON avec pagination et filtering
- **Real-time** : WebSocket via Reverb + Socket.io + Laravel Echo
- **Async** : Queue Redis avec Horizon monitoring

### Modules Backend
```
app/
├── Actions/          → Logique métier réutilisable
├── Channels/         → Notification channels (Email, SMS, WhatsApp)
├── Console/Commands/ → Artisan commands
├── Events/           → Events (BadgeUpgraded, PaymentReceived, etc.)
├── Http/Controllers/ → 26 contrôleurs API
├── Jobs/             → 11+ jobs asynchrones
├── Models/           → 24 modèles Eloquent
├── Notifications/    → Classes de notification
├── Policies/         → Authorization policies
├── Repositories/     → Data access layer
└── Services/         → 20+ services métier
```

### Modules Frontend
```
app/
├── (public)/      → Routes publiques (home, search, contact)
├── (auth)/        → Routes auth (login, register)
├── (client)/      → Routes client (dashboard, listings, contracts)
├── (admin)/       → Routes admin (moderation, users)
├── (moderator)/   → Routes modérateur
components/        → Composants UI réutilisables
lib/
├── api/           → Client API Axios
├── auth/          → Context d'authentification
├── hooks/         → 15+ custom hooks
├── i18n/          → Configuration i18n
├── socket/        → Socket.io + Laravel Echo
└── utils/         → Utilitaires
```

### Services Backend Clés
| Service | Responsabilité |
|---------|----------------|
| OtpService | Génération/validation OTP |
| MessageNotificationService | Notifications multi-canal |
| ContentModerationService | Modération automatique |
| ListingPhotoService | Optimisation images |
| EncryptionService | Chiffrement E2E |
| SignatureService | Signature électronique |
| OrangeMoneyService | Intégration Orange Money |
| MtnMomoService | Intégration MTN MoMo |
| EscrowService | Gestion escrow |
| CertificationService | Vérification documents |
| FraudDetectionService | Détection fraude |

---

## Fonctionnalités Implémentées

### Authentification & Sécurité
- [x] Inscription/Connexion avec OTP SMS/WhatsApp
- [x] Normalisation numéros téléphone (Guinée + international)
- [x] 2FA Google Authenticator (admins)
- [x] OAuth2 via Laravel Passport
- [x] Rate limiting par endpoint
- [x] Tokens refresh automatique

### Gestion des Annonces
- [x] CRUD complet annonces
- [x] 10 types de biens (Studio, Chambre-Salon, Villa, etc.)
- [x] 3 types de transactions (Location, Location courte, Vente)
- [x] Galerie photos dynamique (max 20)
- [x] Modération par queue
- [x] Statuts : pending → approved → active → expired
- [x] Listings premium avec upgrade
- [x] Compteurs (vues, favoris, contacts)
- [x] Géolocalisation PostGIS
- [x] Expiration auto 30 jours
- [x] Renouvellement

### Messagerie
- [x] Conversations entre utilisateurs
- [x] Messages avec statuts (sent, delivered, read)
- [x] Chiffrement E2E
- [x] Médias chiffrés
- [x] WebSocket temps réel
- [x] Archive/suppression
- [x] Recherche dans conversations

### Contrats
- [x] Signature électronique OTP
- [x] Génération PDF
- [x] Multi-signatures
- [x] Certificat d'authenticité
- [x] Archivage 10 ans
- [x] Workflow terminaison avec préavis
- [x] Envoi multi-canal (email, SMS, WhatsApp)

### Paiements
- [x] Orange Money API
- [x] MTN Mobile Money API
- [x] Escrow system
- [x] Génération quittances PDF
- [x] Historique transactions
- [x] Webhooks sécurisés
- [x] Commissions configurables

### Notifications
- [x] Email (SMTP)
- [x] WhatsApp (WAHA)
- [x] SMS (Twilio)
- [x] Telegram (bot)
- [x] Push (Expo)
- [x] Database notifications
- [x] Jobs asynchrones

### Modération & Admin
- [x] Dashboard admin complet
- [x] Queue modération (listings, messages, ratings)
- [x] Rôles : admin, moderator, mediator
- [x] Audit logs
- [x] Bulk notifications
- [x] Gestion utilisateurs/rôles

### Système de Badges
- [x] 4 niveaux : Bronze, Argent, Or, Diamant
- [x] Critères automatiques (transactions, rating)
- [x] Upload documents certification
- [x] Vérification par admin
- [x] Events BadgeUpgraded/Downgraded

### Visites
- [x] Planification avec dates/heures
- [x] Statuts : pending → confirmed → completed
- [x] Notifications multi-canal
- [x] Liens publics pour réponse
- [x] Statistiques par listing

### Assurances
- [x] Souscription
- [x] Réclamations
- [x] Résiliation
- [x] Certificats PDF

### Internationalisation
- [x] Français (défaut)
- [x] Anglais
- [x] Système next-intl
- [x] ~2300+ clés de traduction

---

## Rôles et Permissions

### Rôles (6)
| Rôle | Description | 2FA |
|------|-------------|-----|
| admin | Accès complet, gestion totale | Requis |
| moderator | Modération contenu et listings | Optionnel |
| mediator | Résolution disputes | Optionnel |
| proprietaire | Propriétaire immobilier | Non |
| chercheur | Locataire potentiel | Non |
| agence | Agence immobilière | Non |

### Permissions (11)
- manage_users
- manage_roles
- manage_listings
- manage_contracts
- manage_payments
- manage_certifications
- view_analytics
- moderate_content
- moderate_listings
- moderate_ratings
- resolve_disputes

---

## Statuts et États

### Annonces (Listings)
```
pending → approved → active → expired/archived
                  ↘ suspended
```

### Contrats
```
pending → signed → completed
       ↘ cancelled
       ↘ terminated (avec préavis)
```

### Paiements
```
pending → processing → completed
                    ↘ failed
                    ↘ refunded
```

### Messages
```
sent → delivered → read
```

### Visites
```
pending → confirmed → completed
       ↘ cancelled
```

---

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Auth | 5 req/min |
| OTP | Custom limiter |
| Contact form | 5 req/min |
| AI endpoints | 10 req/min |
| Listings creation | 5/heure |
| Listing photos | 25/heure |

---

## Intégrations Externes

### WAHA (WhatsApp)
- Endpoint : http://waha:3000
- Webhook : /api/webhooks/waha
- Events : message, message.ack, session.status
- Usage : OTP, notifications, messages commerciaux

### n8n (Automation)
- Port : 5678
- 6 workflows actifs
- Webhooks Laravel → n8n

### Mobile Money
- Orange Money : REST API
- MTN MoMo : REST API (wrapper SOAP)
- Webhooks callbacks

### Stockage S3
- Production : DigitalOcean Spaces (fra1)
- Dev : MinIO local
- Bucket : immoguinee-images

### Autres
- Twilio : SMS
- Telegram : Alertes ops
- Sentry : Error tracking
- LogRocket : Session replay
- Nominatim : Geocoding

---

## Sécurité

### Mesures Implémentées
- HTTPS obligatoire (Let's Encrypt via Traefik)
- Headers sécurisés (Helmet équivalent Laravel)
- Rate limiting multi-niveau
- CORS strict
- Sanitisation inputs
- Protection CSRF
- Chiffrement données sensibles (AES-256)
- 2FA pour admins
- Chiffrement E2E messages
- Docker Secrets pour credentials
- ClamAV scan fichiers uploadés

### Authentification
- JWT + Refresh tokens
- OTP SMS/WhatsApp
- Google Authenticator 2FA
- Sessions Redis (120min TTL)

---

## Testing & Qualité

### Tests Requis
- **Unitaires** : PHPUnit + Jest (70% coverage min)
- **Intégration** : Laravel Feature Tests
- **E2E** : Playwright (parcours critiques)
- **Performance** : k6 / Artillery
- **Sécurité** : OWASP ZAP

### Qualité Code
- ESLint + Prettier (frontend)
- PHP CS Fixer (backend)
- TypeScript strict mode
- Pre-commit hooks
- Code review obligatoire

---

## Gates de Qualité

**Avant chaque déploiement** :
- [ ] Tous les tests passent
- [ ] Pas de régression performance
- [ ] Pas de failles sécurité critiques
- [ ] Code review approuvé
- [ ] Documentation mise à jour
- [ ] Test sur device low-end
- [ ] Backup DB effectué

---

## Gouvernance

### Règles de Développement
- Cette constitution guide toutes les décisions techniques
- Toute déviation doit être justifiée et documentée
- La simplicité prime sur la complexité : "KISS > YAGNI"
- Question clé : *"Est-ce que ça aide un Guinéen à trouver un logement ?"*

### Priorités
1. **Sécurité** : Pas de compromis sur données utilisateurs
2. **Performance** : Plateforme rapide = plus d'utilisateurs
3. **Simplicité** : Interface intuitive = moins de support
4. **Fiabilité** : Moins de bugs = meilleure réputation
5. **Features** : Seulement après les 4 premiers points

### Déploiement
- **RÈGLE STRICTE** : Aucun déploiement sans consentement explicite via le mot `deploy`
- Backup automatique avant déploiement
- Rollback possible en < 5min
- Zero-downtime via Docker Swarm rolling updates

### Support & Maintenance
- Monitoring 24/7 (Prometheus + Grafana + AlertManager)
- Backup quotidien automatique (rétention 30 jours)
- Hotfix déployable en < 2h
- Mises à jour sécurité hebdomadaires
- Support utilisateurs : Email + WhatsApp Business

---

## Métriques de Succès

| Période | Utilisateurs | Annonces | Transactions |
|---------|-------------|----------|--------------|
| Mois 1 | 50 | 100 | - |
| Mois 2 | 200 | 500 | 50 contrats |
| Mois 3 | 500 | 1000 | 100 |
| Mois 6 | 5000 | 10000 | 1000 |

---

## Roadmap Future

### Court terme (1-3 mois)
- [ ] Application mobile React Native (iOS + Android)
- [ ] Chatbot WhatsApp via WAHA
- [ ] Visite virtuelle 360°
- [ ] Amélioration SEO

### Moyen terme (3-6 mois)
- [ ] Expansion géographique (villes province)
- [ ] Langues locales (Soussou, Poular, Malinké)
- [ ] Recommandations IA
- [ ] Analytics prédictifs

### Long terme (6-12 mois)
- [ ] API publique pour partenaires
- [ ] Intégration banques locales
- [ ] Marketplace services (déménagement, rénovation)
- [ ] Expansion régionale (Afrique de l'Ouest)

---

**Version**: 2.0.0 | **Ratified**: 2026-01-05 | **Last Amended**: 2026-01-05 | **Next Review**: 2026-04-05
