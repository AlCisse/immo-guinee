# Feature Specification: Plateforme ImmoGuinée - Confiance d'Abord

**Feature Branch**: `001-immog-platform`
**Created**: 2025-01-28
**Updated**: 2026-07-19
**Status**: Draft
**Input**: Plateforme d'annonces immobilières pour la Guinée avec publication gratuite, contrats automatiques, signatures électroniques, paiements Mobile Money et système de confiance

> **Note stack (backend Rust)** : cette spécification est **agnostique de l'implémentation**
> (elle décrit le *quoi*, pas le *comment*) et s'applique **intégralement** au backend Rust (Axum).
> Les seules mentions techniques (WebSocket, PostgreSQL, Redis, chiffrement AES-256/SHA-256, GIN index,
> pg_dump, Grafana/Prometheus) relèvent de l'infrastructure et de la cryptographie, indépendantes du
> framework backend. Les détails de stack backend figurent dans `plan.md` et `rust-backend/README.md`.

---

## 🎯 Vision & Philosophie Centrale

**ImmoGuinée** est la première plateforme immobilière guinéenne basée sur le principe de **"Confiance d'Abord"**.

### Philosophie Fondamentale
- ✅ **Zéro paiement avant signature de contrat**
- ✅ **Confiance absolue entre parties**
- ✅ **Transparence totale des commissions**
- ✅ **Conformité juridique guinéenne stricte**

### Marché Cible
- **Zones géographiques** : Conakry (Kaloum, Dixinn, Ratoma, Matam, Matoto), Dubréka, Coyah
- **Publics cibles** :
  - Particuliers : 60% (propriétaires individuels, locataires)
  - Agences immobilières : 25% (professionnels du secteur)
  - Diaspora guinéenne : 15% (investisseurs à l'étranger)

### Modèle Économique
- **Annonces** : Publication 100% gratuite et illimitée
- **Commission plateforme** : 50% d'un mois de loyer (payée le jour du paiement de caution par le locataire)
- **Paiement commission** : Uniquement APRÈS signature du contrat, au moment du paiement de la caution
- **Services premium optionnels** :
  - Badge "URGENT" : 50 000 GNF
  - Remontée 48h : 30 000 GNF
  - Photos professionnelles : 100 000 GNF

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publication Gratuite d'Annonces en 5 Minutes (Priority: P1)

Un propriétaire particulier ou une agence peut publier gratuitement une annonce immobilière (location ou vente) en moins de 5 minutes avec avec maximum 10 photos par post, description, prix, caution, avance en GNF et géolocalisation par quartier. Les chercheurs peuvent consulter les annonces et utiliser des filtres avancés sans créer de compte.

**Why this priority**: C'est le fondement de la plateforme. Sans annonces, aucune valeur n'est créée. La publication doit être ultra-rapide (5 min max) pour concurrencer les méthodes traditionnelles (WhatsApp, bouche-à-oreille).

**Independent Test**: Un propriétaire crée un compte avec son numéro de téléphone (OTP SMS), publie une annonce d'appartement 2 chambres à Kaloum avec 5 photos, prix 2 500 000 GNF/mois, caution 3 mois, et vérifie qu'elle apparaît immédiatement dans les résultats de recherche.

**Acceptance Scenarios**:

1. **Given** un visiteur non authentifié sur la page d'accueil, **When** il consulte les annonces récentes, **Then** il voit les 20 dernières annonces avec photo principale, prix en GNF, quartier et badge de certification du propriétaire
2. **Given** un propriétaire s'inscrit avec son numéro Orange/MTN, **When** il saisit l'OTP SMS reçu, **Then** son compte est créé en statut "Bronze" (non certifié) et il accède au formulaire de publication
3. **Given** le formulaire de publication, **When** le propriétaire remplit : Type "Appartement", Titre "Bel appart 2 chambres vue mer", Description, Prix "2500000 GNF/mois", Quartier "Kaloum", Caution "3 mois", Upload 5 photos depuis smartphone, **Then** l'annonce est publiée en statut "Disponible" et un SMS de confirmation est envoyé
4. **Given** un chercheur utilise les filtres : Type "Appartement", Quartier "Kaloum", Prix max "3000000 GNF", Chambres min "2", **When** il clique sur "Rechercher", **Then** seules les annonces correspondantes s'affichent triées par date (plus récentes en premier)
5. **Given** un chercheur consulte une annonce, **When** il clique sur "Contacter le propriétaire", **Then** une interface de messagerie s'ouvre ET les numéros de téléphone restent masqués (protection vie privée)

---

### User Story 2 - Génération Automatique de Contrats Conformes Législation Guinéenne (Priority: P2)

Après accord verbal entre propriétaire et locataire, la plateforme génère automatiquement un contrat de location conforme à la loi guinéenne 2016/037 via un formulaire guidé. Le contrat inclut toutes les clauses obligatoires (EDG, SEG, sécurité, caution) et peut être prévisualisé avant envoi pour signature.

**Why this priority**: La génération automatique de contrats est le différenciateur majeur face aux méthodes traditionnelles (contrats manuscrits, photocopies). Elle garantit la conformité légale et réduit les litiges.

**Independent Test**: Un propriétaire et un locataire sont d'accord sur une location (appartement Kaloum, 2 500 000 GNF/mois, caution 3 mois). Le propriétaire initie la génération d'un contrat de location résidentiel, remplit le formulaire en 5 minutes, prévisualise le PDF généré avec toutes les clauses, et l'envoie au locataire pour signature.

**Acceptance Scenarios**:

1. **Given** un propriétaire a reçu un accord verbal du locataire, **When** il accède à l'annonce et clique sur "Générer un contrat", **Then** un formulaire guidé s'affiche avec pré-remplissage automatique : Nom propriétaire, Nom locataire (depuis profil), Adresse bien, Prix loyer (depuis annonce), et champs à compléter : Durée bail (déterminé/indéterminé), Montant caution (1-6 mois), Date début bail, Clauses spécifiques
2. **Given** le formulaire est complété avec Durée "12 mois", Caution "3 mois (7 500 000 GNF)", Date début "01/02/2025", **When** le propriétaire clique sur "Générer le contrat", **Then** un PDF est généré en moins de 5 secondes contenant : En-tête "CONTRAT DE LOCATION RÉSIDENTIEL - Loi 2016/037", Identités parties, Description bien, Loyer et caution, Clauses EDG/SEG, Clause sécurité, Durée bail, Signatures électroniques (vierges)
3. **Given** le PDF est généré, **When** le propriétaire clique sur "Prévisualiser", **Then** une fenêtre modale affiche le PDF complet et un bouton "Envoyer pour signature" est disponible
4. **Given** le propriétaire clique sur "Envoyer pour signature", **When** la requête est envoyée, **Then** le locataire reçoit 4 notifications simultanées : SMS ("Nouveau contrat à signer"), Email (lien vers contrat), Notification push, WhatsApp (si activé), ET le contrat passe en statut "En attente de signature"
5. **Given** le contrat est envoyé, **When** le locataire clique sur le lien dans le SMS, **Then** il accède au contrat en lecture seule avec un bouton "Signer électroniquement" ET un compteur de délai de rétractation "48 heures restantes"

---

### User Story 3 - Signature Électronique OTP SMS et Archivage Sécurisé (Priority: P3)

Les deux parties (propriétaire et locataire) signent électroniquement le contrat via OTP SMS. Chaque signature est horodatée et un cachet électronique est apposé. Une fois toutes les signatures complètes, le contrat devient immutable et est archivé de manière sécurisée (chiffrement AES-256) pendant 10 ans minimum.

**Why this priority**: Les signatures électroniques permettent de signer à distance (crucial pour la diaspora) et garantissent la validité légale du contrat. L'archivage sécurisé protège contre la perte de documents.

**Independent Test**: Un locataire reçoit un contrat à signer. Il consulte le contrat sur son smartphone, clique sur "Signer", reçoit un OTP SMS, le saisit, et sa signature avec horodatage est ajoutée au PDF. Le propriétaire signe ensuite de la même manière. Le contrat devient immutable et les deux parties reçoivent une copie par email.

**Acceptance Scenarios**:

1. **Given** le locataire consulte le contrat envoyé, **When** il clique sur "Signer électroniquement", **Then** un message s'affiche "Un code OTP va être envoyé à votre numéro +224 XXX XXX XXX" ET après 2 secondes, un SMS contenant un code à 6 chiffres est envoyé
2. **Given** le locataire reçoit l'OTP "123456", **When** il saisit le code et clique sur "Valider", **Then** sa signature électronique est ajoutée au PDF avec : Nom complet, Date et heure précise (ex: "28/01/2025 à 14:35:22 GMT"), Cachet "Signé électroniquement via ImmoGuinée", ET le statut du contrat passe à "Signé par locataire - En attente signature propriétaire"
3. **Given** le locataire ne reçoit pas l'OTP après 60 secondes, **When** il clique sur "Renvoyer le code", **Then** un nouvel OTP est envoyé ET un compteur de 60 secondes avant prochain renvoi s'affiche
4. **Given** le locataire saisit 3 fois un mauvais OTP, **When** il valide le 3ème code erroné, **Then** un message d'erreur s'affiche "Code incorrect. Veuillez vérifier votre numéro de téléphone ou contacter le support" ET le formulaire se bloque pendant 5 minutes
5. **Given** les deux parties ont signé le contrat, **When** la signature du propriétaire est validée, **Then** le PDF signé est archivé sur stockage sécurisé (S3 avec chiffrement AES-256), le statut passe à "Signé et archivé", ET les deux parties reçoivent le PDF par email + SMS de confirmation + notification push "Votre contrat est signé et archivé pour 10 ans"

---

### User Story 4 - Paiement Commission 50% Loyer le Jour de la Caution (Priority: P4)

**NOUVEAU WORKFLOW CRITIQUE** : Après signature du contrat, le locataire paie la caution (1-6 mois de loyer) + l'avance demandé par le proprietaire l'or du création du poste'' + la commission plateforme (50% d'un mois de loyer) via Orange Money ou MTN Mobile Money. Le paiement de la commission est obligatoire le même jour que la caution. La commission est collectée par la plateforme AVANT que l'argent de la caution ne soit transféré au propriétaire.

**Why this priority**: Le paiement de la commission le jour de la caution garantit que la plateforme est rémunérée pour son service (génération contrat, signatures, archivage) tout en respectant le principe "Zéro paiement avant signature". Cela évite les impayés de commission.

**Independent Test**: Un contrat de bail est signé (loyer 2 500 000 GNF/mois, caution 1 mois et avance 3 mois = 7 500 000 GNF). Le locataire accède à son dashboard "Mes paiements", voit une facture de 8 750 000 GNF (7 500 000 avance + 2 500 000 caution + 1 250 000 commission), paie via Orange Money avec 2FA, l'argent est placé en escrow, la commission est prélevée par la plateforme, et le propriétaire reçoit 10 000 000 GNF après validation.

**Acceptance Scenarios**:

1. **Given** un contrat de bail est signé avec loyer 2 500 000 GNF/mois , caution 1 mois et avance 3 mois, **When** le locataire accède à son dashboard "Mes paiements", **Then** il voit une facture détaillée : "avance 3 mois : 7 500 000 GNF", caution 1 mois: 2 500 000 "Commission plateforme (50% d'un mois) : 1 250 000 GNF", "Total à payer aujourd'hui : 10 000 000 GNF", Date limite "01/02/2025 (jour début bail)", Statut "En attente de paiement"
2. **Given** la facture affichée, **When** le locataire clique sur "Payer via Orange Money", **Then** il est redirigé vers l'interface de paiement Orange Money avec montant pré-rempli "10 000 000 GNF", description "Caution + avance + Commission ImmoGuinée - Contrat #1234", ET un message s'affiche "Après paiement, 1 250 000 GNF seront conservés par ImmoGuinée (commission) et 10 000 000 GNF seront transférés au propriétaire après validation"
3. **Given** le montant est supérieur à 500 000 GNF, **When** le locataire confirme le paiement Orange Money, **Then** un OTP SMS est envoyé pour validation 2FA, ET après saisie OTP correcte, le paiement est confirmé
4. **Given** le paiement Orange Money est confirmé (webhook reçu), **When** la transaction est validée, **Then** l'argent est placé en escrow, la commission de 1 250 000 GNF est IMMÉDIATEMENT prélevée et transférée au compte ImmoGuinée, le propriétaire reçoit une notification "Paiement caution reçu (10 000 000 GNF) - En attente de votre validation", ET le statut passe à "Paiement en escrow - Commission collectée"
5. **Given** le propriétaire vérifie que le locataire a emménagé sans problème, **When** il clique sur "Confirmer réception de la caution", une notification sera envoyer au locataire pour confirmation **Then** les 10 000 000 GNF sont débloqués de l'escrow et transférés au propriétaire, une quittance PDF "Caution" est générée automatiquement avec détails (montant, date, numéro transaction Orange Money), ET les deux parties reçoivent la quittance par email + SMS

---

### User Story 5 - Programme de Certification "Confiance" (Bronze/Argent/Or/Diamant) (Priority: P5)

Les utilisateurs progressent dans un programme de certification en 4 niveaux (Bronze, Argent, Or, Diamant) basé sur le nombre de transactions complétées, la vérification de documents et l'absence de litiges. Chaque niveau débloque des avantages (badge visible, priorité messagerie, réduction commissions) et renforce la confiance.

**Why this priority**: Le programme de certification est le pilier du modèle "Confiance d'Abord". Il incite les utilisateurs à être honnêtes, à compléter leurs profils et à accumuler des transactions réussies. Les badges visibles aident les chercheurs à identifier rapidement les utilisateurs fiables.

**Independent Test**: Un propriétaire s'inscrit (statut Bronze par défaut), complète sa vérification de documents CNI + titre foncier (passe Argent), complète 5 transactions sans litige (passe Or), atteint 20 transactions avec note moyenne 4.8/5 (passe Diamant). Son badge Diamant s'affiche sur toutes ses annonces.

**Acceptance Scenarios**:

1. **Given** un nouvel utilisateur s'inscrit avec OTP SMS, **When** son compte est créé, **Then** il reçoit automatiquement le badge "Bronze 🥉" avec statut "Non certifié", ET un message s'affiche "Complétez votre profil et vérifiez vos documents pour passer au niveau Argent"
2. **Given** un utilisateur Bronze, **When** il upload sa CNI (Carte Nationale d'Identité) et un titre foncier au format PDF, **Then** les documents sont soumis pour vérification manuelle par l'équipe ImmoGuinée (délai 48h), ET une notification "Documents en cours de vérification" s'affiche
3. **Given** les documents sont vérifiés et valides, **When** l'administrateur approuve la vérification, **Then** l'utilisateur reçoit une notification "Félicitations ! Vous êtes maintenant certifié Argent 🥈", son badge passe à "Argent 🥈", ET il débloques l'avantage "Priorité messagerie" (ses messages sont marqués comme prioritaires)
4. **Given** un utilisateur Argent complète sa 5ème transaction (contrat signé + paiement effectué) avec note moyenne ≥ 4 étoiles, **When** la 5ème transaction est marquée "Complétée", **Then** son badge passe automatiquement à "Or 🥇", ET il débloque "Réduction commission 10%" (commission passe de 50% à 40% d'un mois de loyer)
5. **Given** un utilisateur Or atteint 20 transactions complétées avec note moyenne ≥ 4.5 étoiles et zéro litige, **When** la 20ème transaction est validée, **Then** son badge passe à "Diamant 💎", il débloque "Réduction commission 20%" (commission passe à 30% d'un mois de loyer) + "Badge premium visible sur toutes les annonces" + "Support prioritaire WhatsApp"

---

### User Story 6 - Messagerie Sécurisée avec Notifications Multicanales (Priority: P6)

Les chercheurs et propriétaires communiquent via une messagerie interne (texte + vocal) sans révéler leurs numéros de téléphone. Les notifications sont envoyées via 4 canaux : Push app, SMS, Email, WhatsApp (opt-in). Les messages sont conservés avec horodatage et statut de lecture.

**Why this priority**: La messagerie protège la vie privée des utilisateurs (pas de spam ni de harcèlement) tout en facilitant la communication. Les notifications multicanales garantissent que les messages sont reçus même si l'utilisateur n'est pas actif sur l'app.

**Independent Test**: Un chercheur envoie un message "Bonjour, le bien est-il toujours disponible ?" au propriétaire d'une annonce. Le propriétaire (qui a activé les notifications WhatsApp) reçoit 4 notifications simultanées (Push, SMS, Email, WhatsApp), répond "Oui, disponible dès le 1er février", et le chercheur voit la réponse en temps réel avec statut "Lu à 14:35".

**Acceptance Scenarios**:

1. **Given** un chercheur consulte une annonce d'appartement à Kaloum, **When** il clique sur "Contacter le propriétaire", **Then** une interface de messagerie s'ouvre avec placeholder "Écrivez votre message..." ET les numéros de téléphone des deux parties restent masqués (affichage : "Propriétaire certifié Or 🥇" au lieu du numéro)
2. **Given** le chercheur envoie le message "Bonjour, le bien est-il toujours disponible ? Quand puis-je visiter ?", **When** le message est envoyé, **Then** le propriétaire reçoit 4 notifications simultanées en moins de 10 secondes : Notification push "Nouveau message de Mamadou D.", SMS "ImmoGuinée : Vous avez un nouveau message sur votre annonce Appart Kaloum", Email avec extrait du message, WhatsApp "Nouveau message sur ImmoGuinée : Bonjour, le bien..." (uniquement si opt-in activé dans paramètres)
3. **Given** le propriétaire est en ligne et reçoit le message, **When** il consulte la messagerie, **Then** il voit le message avec horodatage "Aujourd'hui à 14:30" ET le chercheur voit le statut "Lu à 14:31" sous son message
4. **Given** le propriétaire répond "Oui disponible. Vous pouvez visiter samedi 10h ?", **When** le chercheur est hors ligne, **Then** il reçoit les mêmes 4 notifications (Push, SMS, Email, WhatsApp si activé), ET lorsqu'il ouvre l'app, le message s'affiche automatiquement sans rechargement de page (temps réel via WebSocket)
5. **Given** un utilisateur reçoit des messages inappropriés (spam, harcèlement), **When** il clique sur "Signaler ce message" et confirme, **Then** le message est signalé pour modération, l'expéditeur reçoit un avertissement automatique, ET après 3 signalements validés, l'expéditeur est bloqué automatiquement

---

### User Story 7 - Système de Notation et Médiation de Litiges (Priority: P7)

Après une transaction complétée, les deux parties se notent mutuellement (1-5 étoiles) avec commentaire obligatoire. Les commentaires sont modérés automatiquement (détection mots-clés inappropriés). En cas de litige, un système de médiation gratuite permet de résoudre à l'amiable dans un délai de 7 jours.

**Why this priority**: Le système de notation renforce la responsabilité des utilisateurs et aide à identifier les profils problématiques. La médiation de litiges réduit les escalades juridiques coûteuses et préserve la réputation de la plateforme.

**Independent Test**: Un locataire et un propriétaire complètent une transaction de location. Le locataire note le propriétaire 5 étoiles "Très professionnel, appartement conforme". Le propriétaire note le locataire 4 étoiles "Bon locataire mais retard paiement 1er mois". Les notes et commentaires apparaissent sur leurs profils publics après modération automatique.

**Acceptance Scenarios**:

1. **Given** une transaction de location est marquée "Complétée" (contrat signé + 1er loyer payé), **When** les deux parties accèdent à leurs dashboards, **Then** ils voient une invitation "Notez votre expérience avec [Nom de l'autre partie]" avec bouton "Noter maintenant"
2. **Given** le locataire clique sur "Noter maintenant", **When** le formulaire s'affiche, **Then** il voit 3 critères à noter (1-5 étoiles) : "État du logement", "Réactivité du propriétaire", "Transparence", ET un champ texte "Commentaire public (obligatoire, minimum 20 caractères)"
3. **Given** le locataire note 5/5/5 et écrit "Très professionnel, appartement conforme aux photos, excellent échange", **When** il soumet la notation, **Then** le commentaire passe par modération automatique (détection mots-clés : insultes, coordonnées personnelles, contenus inappropriés), ET si aucun mot-clé détecté, le commentaire est publié immédiatement sur le profil public du propriétaire
4. **Given** un utilisateur écrit un commentaire contenant "Arnaqueur ! Numéro : +224 XXX XXX XXX", **When** il soumet le commentaire, **Then** le système détecte les mots-clés "Arnaqueur" + numéro de téléphone, rejette automatiquement le commentaire avec message "Votre commentaire contient des informations inappropriées. Veuillez reformuler sans insultes ni coordonnées personnelles"
5. **Given** un locataire signale un litige "Le propriétaire refuse de rembourser ma caution sans raison", **When** il clique sur "Demander une médiation", **Then** un médiateur ImmoGuinée est assigné automatiquement dans les 48h, les deux parties reçoivent un email + SMS "Médiation ouverte - Référence #MED-1234", ET la médiation doit être résolue sous 7 jours (résolution amiable ou escalade juridique)

---

### User Story 8 - Module Assurance Locative "SÉJOUR SEREIN" et "LOYER GARANTI" (Priority: P8 - Phase 2)

**PHASE 2 UNIQUEMENT** : Les locataires peuvent souscrire à l'assurance "SÉJOUR SEREIN" (2% du loyer mensuel) pour se protéger contre les expulsions abusives et garantir le remboursement de leur caution. Les propriétaires peuvent souscrire à "LOYER GARANTI" pour se protéger contre les impayés (couverture 2 mois maximum).

**Why this priority**: Les assurances locatives ajoutent une couche de sécurité supplémentaire et génèrent des revenus récurrents pour la plateforme. Elles arrivent en Phase 2 car elles nécessitent un partenariat avec une compagnie d'assurance guinéenne.

**Independent Test**: Un locataire souscrit à "SÉJOUR SEREIN" pour 50 000 GNF/mois (2% de 2 500 000 GNF). Après 6 mois, le propriétaire tente de l'expulser sans raison valable. Le locataire active l'assurance, ImmoGuinée intervient, et si l'expulsion est jugée abusive, le locataire reçoit 7 500 000 GNF (3 mois de loyer) en compensation.

**Acceptance Scenarios**:

1. **Given** un locataire consulte un contrat de bail avec loyer 2 500 000 GNF/mois, **When** il accède à la section "Options d'assurance", **Then** il voit deux offres : "SÉJOUR SEREIN - Protection locataire : 50 000 GNF/mois (2% du loyer)" avec détails "Protection expulsion abusive (3 mois loyer), Remboursement caution garanti, Assistance juridique WhatsApp", ET un bouton "Souscrire"
2. **Given** le locataire clique sur "Souscrire à SÉJOUR SEREIN", **When** il confirme, **Then** 50 000 GNF sont ajoutés à sa facture mensuelle (2 550 000 GNF au lieu de 2 500 000 GNF), ET il reçoit un certificat d'assurance par email + SMS avec numéro de police "ASSUR-SS-1234"
3. **Given** après 6 mois de location, le propriétaire envoie un SMS "Vous devez quitter l'appartement dans 7 jours" sans raison valable (contrat non expiré, loyers payés à jour), **When** le locataire clique sur "Activer mon assurance SÉJOUR SEREIN", **Then** un dossier de réclamation est ouvert automatiquement, un conseiller juridique ImmoGuinée contacte le locataire par WhatsApp dans les 24h, ET si l'expulsion est jugée abusive après enquête, le locataire reçoit 7 500 000 GNF (3 mois de loyer) en compensation sous 48h
4. **Given** un propriétaire consulte son dashboard, **When** il accède à "Options d'assurance", **Then** il voit "LOYER GARANTI - Protection propriétaire : 100 000 GNF/mois (4% du loyer)" avec détails "Couverture impayés 2 mois maximum, Assurance dégâts locatifs (max 1 000 000 GNF)", ET un bouton "Souscrire"
5. **Given** le propriétaire a souscrit à LOYER GARANTI et le locataire ne paie pas le loyer pendant 2 mois consécutifs, **When** le propriétaire active l'assurance, **Then** ImmoGuinée vérifie le dossier (contrat, historique paiements, preuves de relances), ET si les impayés sont confirmés, le propriétaire reçoit 5 000 000 GNF (2 mois de loyer) en compensation sous 7 jours

---

### User Story 9 - Interface Multilingue pour la Diaspora (FR/AR) (Priority: P9 - Phase 2)

**PHASE 2 UNIQUEMENT** : La diaspora guinéenne (principalement en France et pays arabes) peut utiliser l'interface en français ou en arabe. Les notifications respectent les fuseaux horaires (Europe, Moyen-Orient). Les achats de terrains nécessitent une vérification renforcée du titre foncier par ImmoGuinée.

**Why this priority**: La diaspora représente 15% du marché cible et a un pouvoir d'achat élevé pour l'achat de terrains et maisons. Le support multilingue et la vérification titre foncier renforcent la confiance pour investir à distance.

**Independent Test**: Un Guinéen vivant en France (fuseau horaire UTC+1) consulte l'interface en français, trouve un terrain à Dubréka, reçoit des notifications WhatsApp adaptées à son fuseau horaire (14h Paris = 13h Conakry), demande une vérification titre foncier, et achète après validation par ImmoGuinée.

**Acceptance Scenarios**:

1. **Given** un utilisateur de la diaspora visite immoguinee.com depuis la France (IP détectée), **When** la page d'accueil se charge, **Then** un popup s'affiche "Bienvenue ! Sélectionnez votre langue : Français 🇫🇷 | العربية 🇸🇦" ET après sélection, l'interface bascule complètement dans la langue choisie
2. **Given** l'utilisateur sélectionne "Français" et son fuseau horaire est détecté "Europe/Paris (UTC+1)", **When** il active les notifications WhatsApp, **Then** un message s'affiche "Vos notifications seront envoyées selon votre fuseau horaire (Paris). Ex: Nouvelle annonce à 14h Paris = 13h Conakry" ET toutes les notifications futures respectent ce fuseau
3. **Given** l'utilisateur consulte une annonce de terrain à Dubréka (5 hectares, 500 000 000 GNF), **When** il clique sur "Demander vérification titre foncier", **Then** un formulaire s'affiche "Vérification renforcée (diaspora)" avec upload de documents requis : Passeport/CNI, Preuve de résidence à l'étranger, ET un message "Délai de vérification : 7 jours ouvrés. Frais : 200 000 GNF"
4. **Given** l'utilisateur soumet sa demande de vérification + paie 200 000 GNF via Orange Money, **When** l'équipe ImmoGuinée vérifie le titre foncier auprès des services fonciers guinéens, **Then** après 7 jours, l'utilisateur reçoit un rapport PDF "Certificat de vérification titre foncier - Terrain Dubréka" avec conclusion "Titre foncier valide, propriété confirmée, aucun litige en cours" OU "Titre foncier invalide, raisons : [détails]"
5. **Given** le titre foncier est validé, **When** l'utilisateur génère un contrat de promesse de vente, **Then** le contrat mentionne explicitement "Achat diaspora - Titre foncier vérifié par ImmoGuinée le [date] - Certificat #TF-1234", ET la commission plateforme pour vente terrain est de 1% du prix (5 000 000 GNF pour un terrain à 500 000 000 GNF), payée le jour de la signature de l'acte notarié

---

### User Story 10 - Planification de Visites (Priority: P6 - liée à la Messagerie)

Un chercheur intéressé par une annonce peut demander une visite physique du bien en proposant un ou plusieurs créneaux (date/heure). Le propriétaire confirme, propose un autre créneau ou refuse. Les deux parties reçoivent des notifications multi-canal, et le propriétaire peut répondre via un lien public (sans se connecter). Les statuts évoluent `EN_ATTENTE → CONFIRMEE → COMPLETEE` (ou `ANNULEE`). Chaque annonce affiche des statistiques de visites.

**Why this priority**: La visite est l'étape naturelle entre la prise de contact (messagerie) et la génération du contrat. Elle réduit les déplacements inutiles et sécurise la rencontre. Elle s'appuie sur les annonces (US1) et la messagerie (US6).

**Independent Test**: Un chercheur demande une visite pour un appartement à Kaloum le samedi 10h. Le propriétaire reçoit une notification, confirme via le lien public, les deux parties reçoivent une confirmation, et le statut passe à `CONFIRMEE`. Après la visite, elle est marquée `COMPLETEE` et apparaît dans les statistiques de l'annonce.

**Acceptance Scenarios**:

1. **Given** un chercheur consulte une annonce, **When** il clique sur "Demander une visite" et propose "Samedi 10h", **Then** une visite est créée en statut `EN_ATTENTE`, le propriétaire reçoit une notification multi-canal (Push, SMS, Email, WhatsApp si opt-in), ET les numéros de téléphone restent masqués
2. **Given** le propriétaire reçoit la demande, **When** il clique sur "Confirmer" (dans l'app ou via le lien public), **Then** le statut passe à `CONFIRMEE`, ET les deux parties reçoivent une confirmation avec la date
3. **Given** une visite confirmée est passée, **When** le propriétaire (ou le système) la marque "Effectuée", **Then** le statut passe à `COMPLETEE` ET la visite est comptabilisée dans les statistiques de l'annonce
4. **Given** une visite `EN_ATTENTE` ou `CONFIRMEE`, **When** l'une des parties clique sur "Annuler", **Then** le statut passe à `ANNULEE` et l'autre partie est notifiée

---

### Edge Cases

- **Que se passe-t-il si un locataire tente de payer uniquement la caution sans la commission ?** Le système détecte automatiquement que le montant est incomplet (caution seule) et affiche un message d'erreur "Montant incorrect. Vous devez payer Caution (X GNF) + Commission plateforme (Y GNF) = Total Z GNF". Le paiement est rejeté et le locataire doit recommencer avec le montant correct.

- **Que se passe-t-il si le paiement Mobile Money échoue après 3 tentatives ?** Après 3 échecs de paiement Orange Money ou MTN MoMo, le système propose automatiquement un "Paiement en espèces". Le locataire peut uploader une photo du reçu de paiement en espèces (remis au propriétaire), le propriétaire doit valider manuellement la réception, et après validation, la commission est collectée manuellement par ImmoGuinée (virement bancaire ou Mobile Money du propriétaire vers ImmoGuinée).

- **Comment gérer le cas où un propriétaire refuse de valider la réception de la caution après 48h ?** Si le propriétaire ne valide pas la réception de la caution dans les 48h suivant le paiement, le système envoie 3 relances automatiques (à 24h, 36h, 48h). Après 48h sans validation, un médiateur ImmoGuinée contacte le propriétaire par téléphone. Si le propriétaire reste injoignable ou refuse de valider sans raison valable, l'argent en escrow est automatiquement débloqué après 72h (protection du locataire contre les blocages abusifs).

- **Que se passe-t-il si un utilisateur tente de publier le même bien 10 fois pour "booster" sa visibilité ?** Le système détecte les doublons via comparaison de photos (hash MD5). Si deux annonces du même utilisateur ont 3+ photos identiques, un message d'avertissement s'affiche "Doublon détecté. Vous avez déjà publié ce bien. Pour améliorer sa visibilité, utilisez les options premium : Badge URGENT (50K GNF) ou Remontée 48h (30K GNF)". Après 3 tentatives de publication de doublons, le compte est suspendu 24h.

- **Comment le système gère-t-il les utilisateurs qui accumulent des notes négatives < 3 étoiles ?** Après 3 notes consécutives < 3 étoiles (3 transactions avec notes faibles), l'utilisateur reçoit un email + SMS "Alerte : Votre note moyenne est faible (X/5). Améliorez votre service pour éviter la suspension de compte". Après 5 notes < 3 étoiles, le compte est automatiquement suspendu pendant 7 jours et l'utilisateur doit suivre une formation en ligne "Bonnes pratiques ImmoGuinée" (vidéo 30 min + quiz 10 questions) pour réactiver son compte.

- **Que se passe-t-il si le délai de rétractation de 48h expire et qu'une partie veut annuler le contrat signé ?** Après expiration du délai de 48h, le contrat devient juridiquement contraignant. Si une partie veut annuler, elle doit demander une médiation. Si l'autre partie accepte l'annulation à l'amiable, le contrat est marqué "Annulé par accord mutuel", la caution est remboursée au locataire (hors commission plateforme déjà collectée - non remboursable), et aucune pénalité n'est appliquée. Si l'autre partie refuse, le contrat reste en vigueur et seule une action juridique peut l'annuler.

- **Comment gérer les annonces de biens situés hors des zones couvertes (ex: Kankan, N'Zérékoré) ?** Lors de la publication, si l'utilisateur sélectionne un quartier non listé (hors Conakry, Dubréka, Coyah), un message s'affiche "Cette zone n'est pas encore couverte par ImmoGuinée. Nous prévoyons d'étendre nos services à [ville] en [date estimée]. Inscrivez-vous à notre liste d'attente pour être notifié du lancement." L'annonce n'est pas publiée mais l'utilisateur peut s'inscrire sur une liste d'attente.

- **Que se passe-t-il si la connexion Evolution API (WhatsApp Business API) est déconnectée pendant 24h ?** Le système détecte automatiquement la déconnexion Evolution API via un healthcheck toutes les 5 minutes. Si la connexion échoue, une alerte est envoyée aux administrateurs ImmoGuinée par email + SMS. Les notifications WhatsApp échouent gracieusement (fallback automatique vers SMS + Push + Email uniquement) sans bloquer les autres fonctionnalités. Un message d'état s'affiche dans le dashboard admin "WhatsApp indisponible depuis X heures - Notifications basculées sur SMS/Email/Push".

---

## Requirements *(mandatory)*

### Functional Requirements

**MODULE 1 : AUTHENTIFICATION & GESTION UTILISATEURS**

- **FR-001**: Le système DOIT permettre l'inscription avec numéro de téléphone guinéen (Orange +224 6XX XXX XXX ou MTN +224 6XX XXX XXX) et vérification OTP SMS obligatoire (code à 6 chiffres valide 5 minutes)
- **FR-002**: Le système DOIT attribuer automatiquement le badge "Bronze 🥉" à tout nouvel utilisateur avec statut "Non certifié"
- **FR-003**: Le système DOIT permettre l'authentification via numéro de téléphone + mot de passe (minimum 8 caractères avec 1 majuscule, 1 chiffre, 1 caractère spécial)
- **FR-004**: Le système DOIT permettre la réinitialisation de mot de passe via OTP SMS uniquement (pas d'email)
- **FR-005**: Le système DOIT permettre aux utilisateurs de gérer leurs préférences de notification avec 4 canaux configurables indépendamment : Push app (activé par défaut), SMS (activé par défaut), Email (activé par défaut), WhatsApp (désactivé par défaut - opt-in requis)

**MODULE 2 : PUBLICATION ET GESTION D'ANNONCES**

- **FR-006**: Le système DOIT permettre la publication gratuite et illimitée d'annonces immobilières avec obligation de complétion en 5 minutes maximum (timer visible)
- **FR-007**: Le système DOIT proposer uniquement les types de biens suivants : Villa, Appartement, Studio, Terrain, Commerce, Bureau, Entrepôt
- **FR-008**: Le système DOIT exiger la sélection d'un quartier parmi la liste pré-définie : Conakry (Kaloum, Dixinn, Ratoma, Matam, Matoto), Dubréka (Centre, Périphérie), Coyah (Centre, Périphérie). Aucune saisie libre de localisation n'est autorisée.
- **FR-009**: Le système DOIT permettre l'upload de photos illimitées (minimum 3, pas de maximum) avec validation automatique de qualité : taille minimum 800x600px, formats acceptés JPEG/PNG/WebP, poids maximum 5 Mo par photo, résolution minimum 72 DPI
- **FR-010**: Le système DOIT optimiser automatiquement chaque photo uploadée : compression avec qualité 85%, conversion en format WebP, génération de 3 tailles (thumbnail 200x150px, medium 800x600px, large 1920x1440px)
- **FR-011**: Le système DOIT exiger les champs obligatoires suivants pour toute annonce : Type d'opération (Location/Vente), Type de bien (liste FR-007), Titre (50-100 caractères), Description (200-2000 caractères), Prix en GNF uniquement (pas de conversion USD/EUR), Quartier (liste FR-008), Superficie en m² (pour terrains et villas) ou nombre de pièces (pour appartements/studios)
- **FR-012**: Le système DOIT afficher automatiquement le montant de la caution lors de la publication d'une annonce de location, avec sélection obligatoire : 1 mois, 2 mois, 3 mois, 4 mois, 5 mois, 6 mois. Le montant de la caution est calculé automatiquement (Prix loyer × Nombre de mois)
- **FR-013**: Le système DOIT permettre l'édition d'annonces avec limitation : seuls le titre, la description et les photos peuvent être modifiés. Le prix, le quartier et le type de bien sont immutables après publication (pour éviter les fraudes)
- **FR-014**: Le système DOIT marquer automatiquement les annonces comme "Expirées" après 90 jours sans mise à jour. Un email + SMS de rappel est envoyé à J-7 et J-1 avant expiration avec lien de réactivation en 1 clic
- **FR-015**: Le système DOIT proposer 3 options premium payantes : Badge "URGENT" (50 000 GNF - affichage en tête de liste pendant 7 jours), Remontée 48h (30 000 GNF - remonter l'annonce en haut toutes les 48h pendant 30 jours), Photos pro (100 000 GNF - photographe professionnel ImmoGuinée se déplace pour prendre 20 photos HD)

**MODULE 3 : RECHERCHE ET FILTRES**

- **FR-016**: Le système DOIT permettre la recherche d'annonces sans authentification (accessible aux visiteurs)
- **FR-017**: Le système DOIT fournir 7 filtres de recherche avancés : Type d'opération (Location/Vente), Type de bien (liste FR-007), Quartier (liste FR-008), Prix min/max en GNF, Superficie min/max en m², Nombre de chambres min/max (pour appartements/villas), Caution max (pour locations)
- **FR-018**: Le système DOIT permettre le tri des résultats par 5 critères : Date de publication (Plus récent/Plus ancien), Prix (Croissant/Décroissant), Popularité (Nombre de vues), Certification propriétaire (Diamant/Or/Argent/Bronze), Distance (si géolocalisation activée)
- **FR-019**: Le système DOIT afficher les résultats de recherche avec pagination (20 annonces par page) et compteur total "X annonces trouvées"
- **FR-020**: Le système DOIT permettre la recherche en texte libre (fulltext) sur les champs Titre + Description avec highlighting des mots-clés recherchés
- **FR-021**: Le système DOIT afficher pour chaque annonce dans les résultats : Photo principale (thumbnail 200x150px), Titre, Prix en GNF avec séparateurs (ex: 2 500 000 GNF), Quartier, Type de bien, Badge de certification du propriétaire (Bronze/Argent/Or/Diamant), Nombre de vues, Date de publication (ex: "Il y a 2 jours")

**MODULE 4 : GÉNÉRATION AUTOMATIQUE DE CONTRATS**

- **FR-022**: Le système DOIT fournir 5 types de contrats pré-configurés conformes à la loi guinéenne 2016/037 : Contrat de location résidentiel (durée déterminée/indéterminée), Contrat de location commerciale, Promesse de vente terrain, Mandat de gestion agence, Attestation de caution
- **FR-023**: Le système DOIT guider l'utilisateur avec un formulaire en 3 étapes maximum (durée totale < 5 minutes) : Étape 1 - Sélection type de contrat + pré-remplissage automatique (noms parties, adresse bien, prix depuis annonce), Étape 2 - Personnalisation (durée bail, date début, clauses spécifiques), Étape 3 - Prévisualisation PDF temps réel + validation
- **FR-024**: Le système DOIT générer un PDF professionnel (format A4, marges 2cm, police Arial 11pt) contenant obligatoirement : En-tête "RÉPUBLIQUE DE GUINÉE - Loi 2016/037", Logo ImmoGuinée, Titre du contrat centré en gras, Article 1 - Identités parties (nom complet, CNI/passeport, adresse, téléphone), Article 2 - Description bien (adresse complète, type, superficie, équipements), Article 3 - Loyer et caution (montant en GNF, mode de paiement, date échéance), Article 4 - Clauses EDG/SEG (responsabilités paiement eau/électricité), Article 5 - Clause sécurité (gardiennage, clés), Article 6 - Durée bail (date début/fin si déterminé), Article 7 - Conditions résiliation, Article 8 - Signatures électroniques (emplacements avec lignes pointillées)
- **FR-025**: Le système DOIT permettre la prévisualisation du PDF avec zoom (50%-200%) et navigation par pages avant envoi pour signature
- **FR-026**: Le système DOIT permettre l'annulation d'un contrat tant qu'il n'est pas signé par toutes les parties avec confirmation "Êtes-vous sûr ? Cette action est irréversible"
- **FR-027**: Le système DOIT envoyer automatiquement le contrat pour signature via 4 canaux simultanés : SMS avec lien court (ex: immog.ne/c/12345), Email avec PDF en pièce jointe + lien signature, Notification push "Nouveau contrat à signer", WhatsApp (si opt-in activé) avec lien + message "Vous avez un contrat à signer. Délai de rétractation : 48h"

**MODULE 5 : SIGNATURES ÉLECTRONIQUES**

- **FR-028**: Le système DOIT permettre la signature électronique via OTP SMS avec processus sécurisé en 4 étapes : Étape 1 - Utilisateur clique "Signer", Étape 2 - Message d'information "Un code à 6 chiffres va être envoyé à +224 XXX XXX XXX", Étape 3 - OTP envoyé par SMS (validité 5 minutes), Étape 4 - Utilisateur saisit OTP + clique "Valider signature"
- **FR-029**: Le système DOIT implémenter un système anti-fraude OTP : Maximum 3 tentatives de saisie (blocage 5 minutes après 3 échecs), Bouton "Renvoyer le code" désactivé pendant 60 secondes après chaque envoi, Expiration automatique après 5 minutes (nouveau code requis), Journalisation de toutes les tentatives (IP, timestamp, succès/échec)
- **FR-030**: Le système DOIT ajouter automatiquement à chaque signature : Nom complet du signataire (depuis profil), Date et heure précise au format "DD/MM/YYYY à HH:MM:SS GMT", Cachet électronique "Signé électroniquement via ImmoGuinée - Signature juridiquement valide selon loi 2016/037", Hash SHA-256 du contrat pour garantir l'intégrité (non-modification après signature)
- **FR-031**: Le système DOIT gérer le statut du contrat avec transitions automatiques : "Brouillon" (contrat créé, non envoyé), "En attente de signature" (envoyé à au moins 1 partie), "Partiellement signé" (1 partie a signé, autres en attente), "Signé et archivé" (toutes les parties ont signé), "Annulé" (annulation avant signature complète)
- **FR-032**: Le système DOIT rendre le contrat immutable après signature complète avec mécanisme de protection : Hash SHA-256 du PDF final stocké en base de données, Toute tentative de modification du fichier PDF invalide le hash, Impossibilité de supprimer un contrat signé (archivage permanent 10 ans minimum), Seule action possible après signature : Création d'un avenant (nouveau contrat lié au contrat original)
- **FR-033**: Le système DOIT implémenter un délai de rétractation de 48 heures avec compteur visible : Après signature complète, message "Contrat signé. Délai de rétractation : 48 heures restantes" avec timer countdown, Pendant les 48h, bouton "Annuler le contrat" disponible (confirmation requise + motif obligatoire), Après expiration des 48h, le contrat devient juridiquement contraignant et le bouton "Annuler" disparaît

**MODULE 6 : ARCHIVAGE SÉCURISÉ DE DOCUMENTS**

- **FR-034**: Le système DOIT archiver automatiquement tous les contrats signés sur stockage cloud sécurisé (AWS S3 ou équivalent) avec chiffrement AES-256 à la fois pour le stockage at-rest et le transit
- **FR-035**: Le système DOIT conserver les contrats archivés pendant minimum 10 ans (conformité juridique guinéenne) avec politique de rétention automatique : Suppression automatique après 10 ans + 30 jours (délai de grâce), Notification aux parties 30 jours avant suppression avec option de téléchargement, Impossibilité de supprimer manuellement avant expiration du délai
- **FR-036**: Le système DOIT permettre le téléchargement des contrats signés uniquement par les parties signataires avec contrôle d'accès strict : Vérification identité (session utilisateur authentifié), Vérification autorisation (utilisateur = signataire du contrat), Journalisation de chaque téléchargement (qui, quand, adresse IP), Watermark automatique sur le PDF téléchargé "Téléchargé par [Nom] le [Date]"
- **FR-037**: Le système DOIT envoyer automatiquement une copie du contrat signé par 2 canaux : Email avec PDF en pièce jointe (sujet "Votre contrat ImmoGuinée #[ID] est signé et archivé"), SMS avec lien de téléchargement sécurisé (ex: "Contrat signé. Télécharger : immog.ne/dl/abc123 - Valide 7 jours")
- **FR-038**: Le système DOIT implémenter un système de backup automatique quotidien : Backup complet de tous les contrats à 2h du matin GMT (heure creuse), Stockage sur 2 serveurs géographiquement distants (résilience), Rétention des backups : 30 jours glissants, Tests de restauration automatiques mensuels avec alertes si échec

**MODULE 7 : PAIEMENTS MOBILE MONEY ET COMMISSIONS**

- **FR-039**: Le système DOIT intégrer les APIs officielles Orange Money Guinée et MTN Mobile Money Guinée avec authentification OAuth 2.0 et webhooks pour les confirmations de paiement
- **FR-040**: Le système DOIT calculer automatiquement la commission plateforme selon le type d'opération : Location - 50% d'un mois de loyer (ex: loyer 2 500 000 GNF → commission 1 250 000 GNF), Vente terrain - 1% du prix de vente (ex: terrain 500 000 000 GNF → commission 5 000 000 GNF), Vente maison/villa - 2% du prix de vente
- **FR-041**: Le système DOIT générer une facture détaillée APRÈS signature du contrat avec 3 sections : Section 1 - Caution (montant caution = loyer × nombre de mois selon annonce), Section 2 - Commission plateforme (calcul selon FR-040), Section 3 - Total à payer aujourd'hui (caution + commission), Date limite de paiement (date début bail indiquée dans le contrat)
- **FR-042**: Le système DOIT afficher un message de transparence sur la facture : "⚠️ IMPORTANT : Le paiement de la commission (X GNF) est obligatoire le même jour que la caution. La commission est collectée par ImmoGuinée pour les services de génération de contrat, signatures électroniques et archivage sécurisé 10 ans. Cette commission n'est PAS remboursable, même en cas d'annulation du contrat après le délai de rétractation de 48h."
- **FR-043**: Le système DOIT implémenter le workflow de paiement suivant : Étape 1 - Locataire/acheteur initie le paiement (choix Orange Money ou MTN MoMo), Étape 2 - Redirection vers interface du provider avec montant total pré-rempli, Étape 3 - Si montant > 500 000 GNF, envoi OTP SMS pour validation 2FA, Étape 4 - Confirmation paiement par le provider (webhook reçu), Étape 5 - Argent placé en escrow automatiquement, Étape 6 - Commission prélevée IMMÉDIATEMENT et transférée au compte ImmoGuinée, Étape 7 - Notification au propriétaire "Paiement caution reçu (X GNF) - En attente de votre validation"
- **FR-044**: Le système DOIT bloquer l'argent de la caution en escrow pendant maximum 48h avec règles : Si propriétaire valide dans les 48h → Argent transféré au propriétaire + quittance générée, Si propriétaire ne valide pas dans les 48h → Relances automatiques à 24h, 36h, 48h, Si pas de validation après 72h → Déblocage automatique + transfert au propriétaire (protection contre les blocages abusifs)
- **FR-045**: Le système DOIT exiger une authentification 2FA (OTP SMS) pour tout paiement supérieur à 500 000 GNF avec processus : Message "Pour sécuriser votre paiement de X GNF, un code de validation va être envoyé par SMS", Envoi OTP à 6 chiffres (validité 5 minutes), Saisie OTP par l'utilisateur, Validation et confirmation paiement uniquement si OTP correct
- **FR-046**: Le système DOIT générer automatiquement une quittance PDF après confirmation de paiement avec contenu : En-tête "QUITTANCE DE CAUTION - ImmoGuinée", Logo ImmoGuinée, Date et heure d'émission, Identités parties (payeur + bénéficiaire), Montant caution en GNF (en chiffres et en lettres), Méthode de paiement (Orange Money ou MTN MoMo), Numéro de transaction externe (ID Orange/MTN), Objet "Caution pour location - Contrat #[ID]", Signature électronique ImmoGuinée + cachet "Quittance valide - Ne peut être dupliquée"
- **FR-047**: Le système DOIT envoyer la quittance PDF par 3 canaux : Email aux deux parties avec PDF en pièce jointe, SMS aux deux parties avec lien de téléchargement, Notification push "Quittance de caution disponible"
- **FR-048**: Le système DOIT afficher l'historique complet des paiements dans le dashboard utilisateur avec tableau : Colonnes : Date, Type (Caution/Loyer/Commission), Montant, Méthode (Orange/MTN/Espèces), Statut (En attente/Confirmé/Échoué/Remboursé), Quittance (lien PDF téléchargement), Filtres : Par date (7 derniers jours/30 jours/Tout), Par statut, Par type, Export CSV possible
- **FR-049**: Le système DOIT permettre le remboursement en cas de litige validé par un administrateur avec workflow : Locataire/acheteur ouvre un litige (motif obligatoire + preuves), Médiateur ImmoGuinée examine le dossier (délai 48h), Si litige fondé → Administrateur approuve le remboursement, Argent en escrow remboursé au locataire sous 24h (hors commission - non remboursable), Notification aux deux parties + rapport de médiation PDF
- **FR-050**: Le système DOIT afficher les frais de service avec transparence AVANT validation du paiement : Popup récapitulatif "Récapitulatif de votre paiement : Caution : X GNF, Commission plateforme (50% d'un mois) : Y GNF, Frais Orange Money/MTN (2%) : Z GNF, Total à payer : TOTAL GNF", Bouton "J'ai compris et j'accepte" obligatoire avant accès au paiement
- **FR-051**: Le système DOIT gérer les échecs de paiement avec 3 tentatives maximum : Tentative 1 échoue → Message "Paiement échoué. Vérifiez votre solde Orange Money/MTN. Réessayer ?", Tentative 2 échoue → Message "2ème échec. Contactez votre provider (Orange/MTN) ou essayez l'autre méthode", Tentative 3 échoue → Message "3ème échec. Option alternative : Paiement en espèces (upload reçu requis)"
- **FR-052**: Le système DOIT permettre le paiement en espèces comme fallback avec workflow : Locataire sélectionne "Paiement en espèces", Message "Remettez X GNF au propriétaire en mains propres et demandez un reçu signé", Upload photo du reçu (formats JPEG/PNG/PDF, max 5 Mo), Propriétaire reçoit notification "Paiement espèces déclaré - Confirmez la réception", Propriétaire clique "Confirmer réception", Commission collectée manuellement (virement bancaire propriétaire → ImmoGuinée sous 7 jours)

**MODULE 8 : PROGRAMME DE CERTIFICATION "CONFIANCE"**

- **FR-053**: Le système DOIT attribuer automatiquement un badge de certification selon 4 niveaux avec critères précis : Bronze 🥉 (défaut) - Inscription complète, Argent 🥈 - 1 transaction complétée + CNI vérifiée, Or 🥇 - 5+ transactions + titre foncier vérifié + note moyenne ≥ 4 étoiles, Diamant 💎 - 20+ transactions + note moyenne ≥ 4.5 étoiles + zéro litige
- **FR-054**: Le système DOIT permettre l'upload de documents de vérification avec validation manuelle : CNI (Carte Nationale d'Identité) - Format PDF/JPEG/PNG, max 2 Mo, Titre foncier (pour propriétaires) - Format PDF uniquement, max 5 Mo, Délai de vérification : 48h ouvrés (L-V 9h-17h GMT), Email + SMS de confirmation après validation "Documents vérifiés. Vous êtes maintenant certifié [Niveau]"
- **FR-055**: Le système DOIT afficher le badge de certification de manière visible : Sur le profil utilisateur (coin supérieur droit de la photo de profil), Sur toutes les annonces publiées par l'utilisateur (badge à côté du nom), Dans les résultats de recherche (badge + tooltip "Utilisateur certifié [Niveau] - X transactions complétées"), Dans la messagerie (badge à côté du nom dans la liste des conversations)
- **FR-056**: Le système DOIT débloquer des avantages progressifs selon le niveau : Bronze - Aucun avantage, Argent - Priorité messagerie (messages marqués avec étoile ⭐), Or - Réduction commission 10% (50% → 40% d'un mois de loyer) + Badge "Vendeur de confiance" sur annonces, Diamant - Réduction commission 20% (50% → 30%) + Support prioritaire WhatsApp + Mise en avant annonces (rotation aléatoire page d'accueil)
- **FR-057**: Le système DOIT suivre automatiquement la progression avec dashboard dédié "Mon niveau de certification" : Niveau actuel (badge + nom), Progression vers niveau suivant (barre de progression + critères restants), Historique des transactions (nombre, notes moyennes, litiges), Documents vérifiés (CNI ✅, Titre foncier ✅/❌), Avantages débloqués (liste avec descriptions), Prochaine étape (ex: "Complétez 3 transactions supplémentaires pour atteindre le niveau Or")
- **FR-058**: Le système DOIT rétrograder automatiquement le niveau en cas de comportement problématique : 3+ litiges ouverts simultanément → Rétrogradation 1 niveau (ex: Or → Argent), Note moyenne < 3 étoiles sur 5 dernières transactions → Rétrogradation 1 niveau, Fraude avérée (validation admin) → Rétrogradation à Bronze + suspension 30 jours, Email + SMS de notification "Alerte : Votre niveau de certification a été rétrogradé à [Niveau] en raison de [raison]. Améliorez votre service pour retrouver votre niveau."

**MODULE 9 : MESSAGERIE SÉCURISÉE ET NOTIFICATIONS MULTICANALES**

- **FR-059**: Le système DOIT fournir une messagerie interne en temps réel (WebSocket) avec fonctionnalités : Messagerie texte (limite 2000 caractères par message), Messagerie vocale (enregistrement audio max 2 minutes, formats MP3/M4A), Envoi de photos (max 5 Mo, formats JPEG/PNG), Partage de localisation GPS (pour organiser visites), Horodatage de chaque message (ex: "Aujourd'hui à 14:35"), Statut de lecture (Envoyé/Livré/Lu), Indicateur "en train d'écrire..."
- **FR-060**: Le système NE DOIT PAS révéler les numéros de téléphone ou emails des utilisateurs dans la messagerie avec masquage : Affichage "Propriétaire certifié Or 🥇" au lieu du nom complet, Affichage "Locataire" ou "Acheteur" au lieu du numéro, Révélation du numéro uniquement après accord mutuel (bouton "Partager mon numéro" dans les paramètres de conversation)
- **FR-061**: Le système DOIT envoyer des notifications pour chaque nouveau message via 4 canaux avec priorisation : Canal 1 (instantané) - Notification push app (si app installée et autorisations accordées), Canal 2 (< 10 secondes) - WhatsApp Business API (si opt-in activé dans paramètres utilisateur), Canal 3 (< 30 secondes) - SMS avec extrait message "ImmoGuinée : Nouveau message de [Nom] - [Extrait 50 caractères]...", Canal 4 (< 1 minute) - Email avec contenu complet du message + lien direct vers conversation
- **FR-062**: Le système DOIT respecter les préférences de notification utilisateur avec 4 toggles indépendants dans "Paramètres > Notifications" : Toggle 1 - Notifications push (ON/OFF), Toggle 2 - Notifications SMS (ON/OFF), Toggle 3 - Notifications Email (ON/OFF), Toggle 4 - Notifications WhatsApp (OFF par défaut - opt-in requis avec message explicatif "En activant WhatsApp, vous autorisez ImmoGuinée à envoyer des notifications via WhatsApp Business API")
- **FR-063**: Le système DOIT conserver l'historique complet des conversations avec stockage sécurisé : Messages texte stockés en base de données PostgreSQL (chiffrement AES-256), Messages vocaux stockés sur S3 (chiffrement AES-256), Rétention illimitée (pas de suppression automatique), Possibilité de supprimer une conversation (soft delete - données masquées mais conservées pour audit), Export conversation en PDF possible (bouton "Exporter" avec génération PDF horodaté)
- **FR-064**: Le système DOIT permettre le signalement de messages inappropriés avec workflow de modération : Utilisateur clique "Signaler ce message", Formulaire apparaît "Raison du signalement : [Spam/Harcèlement/Contenu inapproprié/Fraude/Autre]", Champ texte optionnel "Détails (optionnel)", Soumission → Message signalé envoyé à l'équipe de modération, Modérateur examine sous 24h, Si signalement fondé → Avertissement automatique à l'expéditeur (1er avertissement), 2ème avertissement → Suspension messagerie 24h, 3ème avertissement → Suspension compte 7 jours
- **FR-065**: Le système DOIT détecter automatiquement les mots-clés frauduleux avec liste pré-configurée : Mots-clés financiers suspects : "Western Union", "MoneyGram", "virement à l'étranger", "avance de fonds", "transaction urgente", Mots-clés harcèlement : "rencontre privée", "rendez-vous seul(e)", "numéro personnel", Détection → Alerte automatique admin + notification utilisateur "Message suspect détecté. Notre équipe de sécurité a été alertée."
- **FR-066**: Le système DOIT implémenter un système anti-spam avec limitations : Maximum 50 messages/heure par utilisateur (protection contre spam massif), Maximum 10 nouvelles conversations/jour (protection contre sollicitations massives), Délai minimum 5 secondes entre 2 messages consécutifs au même destinataire, Si limites dépassées → Message "Vous avez atteint la limite de messages. Réessayez dans [temps restant]"

**MODULE 10 : SYSTÈME DE NOTATION ET MÉDIATION DE LITIGES**

- **FR-067**: Le système DOIT permettre la notation mutuelle après une transaction complétée avec critères spécifiques : Pour propriétaires (notés par locataires) - État du logement (1-5 étoiles), Réactivité (1-5 étoiles), Transparence (1-5 étoiles), Pour locataires (notés par propriétaires) - Ponctualité paiement (1-5 étoiles), Entretien du bien (1-5 étoiles), Respect des termes du contrat (1-5 étoiles), Note globale = Moyenne des 3 critères
- **FR-068**: Le système DOIT exiger un commentaire obligatoire avec validation : Minimum 20 caractères (forcer un retour d'expérience substantiel), Maximum 500 caractères, Interdiction de coordonnées personnelles (détection automatique de numéros de téléphone, emails, adresses), Interdiction de mots-clés inappropriés (insultes, langage violent), Si violation détectée → Rejet automatique avec message "Votre commentaire contient des informations inappropriées. Veuillez reformuler."
- **FR-069**: Le système DOIT modérer automatiquement les commentaires avec liste de mots-clés bannis : Insultes courantes en français et langues locales (Soussou, Poular, Malinké), Coordonnées personnelles (regex pour numéros +224, emails, adresses), Contenus diffamatoires ("arnaqueur", "escroc", "voleur"), Détection → Rejet automatique + journalisation (utilisateur + timestamp + contenu pour audit)
- **FR-070**: Le système DOIT publier les notes et commentaires sur les profils publics après modération : Section "Avis et notations" sur chaque profil utilisateur, Affichage : Photo de l'évaluateur (ou avatar par défaut), Note globale (ex: 4.5/5 ⭐⭐⭐⭐⭐), Commentaire texte, Date de publication (ex: "Il y a 2 semaines"), Tri par défaut : Plus récents en premier, Possibilité de filtrer par note (5 étoiles, 4+, 3+, etc.)
- **FR-071**: Le système DOIT calculer et afficher la note moyenne utilisateur avec algorithme : Note moyenne globale = Somme de toutes les notes / Nombre total de notations, Affichage : Note sur 5 étoiles (ex: 4.3/5) + nombre de notations (ex: "basé sur 12 avis"), Badge automatique si note ≥ 4.5 et 10+ notations : "Hautement recommandé ✅", Mise à jour en temps réel après chaque nouvelle notation
- **FR-072**: Le système DOIT permettre l'ouverture de litiges avec formulaire structuré : Bouton "Signaler un litige" visible dans le dashboard "Mes transactions", Formulaire : Type de litige (Impayé/Dégâts/Expulsion abusive/Caution non remboursée/Autre), Description détaillée (200-2000 caractères obligatoires), Upload preuves (photos, documents PDF, captures d'écran - max 10 fichiers de 5 Mo chacun), Soumission → Litige créé avec référence unique (ex: #LIT-1234)
- **FR-073**: Le système DOIT assigner automatiquement un médiateur avec SLA : Médiateur assigné dans les 48h ouvrées (L-V 9h-17h GMT), Email + SMS aux deux parties "Litige #[ID] ouvert. Médiateur assigné : [Nom]. Vous serez contacté sous 48h", Médiateur contacte les parties par téléphone + WhatsApp pour entendre les versions, Tentative de résolution amiable dans un délai de 7 jours
- **FR-074**: Le système DOIT enregistrer le résultat de la médiation avec 3 issues possibles : Issue 1 - Résolution amiable : Accord trouvé entre les parties, statut "Litige résolu à l'amiable", rapport de médiation PDF généré et envoyé aux parties, Issue 2 - Résolution avec compensation : Ex: Propriétaire rembourse 50% de la caution, paiement effectué via plateforme, quittance générée, statut "Litige résolu avec compensation", Issue 3 - Échec médiation : Pas d'accord trouvé, statut "Escalade juridique recommandée", coordonnées avocat partenaire ImmoGuinée fournies, plateforme se désengage (litige externe)
- **FR-075**: Le système DOIT journaliser tous les litiges dans un registre accessible aux administrateurs : Dashboard admin "Registre des litiges" avec tableau : Colonnes : ID litige, Date ouverture, Parties (anonymisées), Type, Statut (Ouvert/En cours/Résolu/Échoué), Médiateur assigné, Filtres par statut, date, type, Export CSV pour analyses statistiques mensuelles

**MODULE 11 : ASSURANCE LOCATIVE (PHASE 2)**

- **FR-076**: Le système DOIT proposer deux produits d'assurance optionnels : "SÉJOUR SEREIN" (pour locataires) - 2% du loyer mensuel, "LOYER GARANTI" (pour propriétaires) - 4% du loyer mensuel
- **FR-077**: L'assurance "SÉJOUR SEREIN" DOIT couvrir 3 risques avec plafonds : Risque 1 - Expulsion abusive (protection 3 mois de loyer maximum), Risque 2 - Caution non remboursée (remboursement intégral de la caution après médiation ImmoGuinée), Risque 3 - Assistance juridique (conseiller disponible par WhatsApp 7j/7 9h-21h GMT)
- **FR-078**: L'assurance "LOYER GARANTI" DOIT couvrir 2 risques avec plafonds : Risque 1 - Impayés de loyer (couverture 2 mois maximum par an), Risque 2 - Dégâts locatifs (max 1 000 000 GNF par an pour réparations)
- **FR-079**: Le système DOIT ajouter automatiquement la prime d'assurance à la facture mensuelle : Si "SÉJOUR SEREIN" souscrit : Facture = Loyer + 2% loyer (ex: 2 500 000 + 50 000 = 2 550 000 GNF), Si "LOYER GARANTI" souscrit : Prime déduite automatiquement du loyer reçu par le propriétaire (ex: locataire paie 2 500 000, propriétaire reçoit 2 400 000)
- **FR-080**: Le système DOIT générer un certificat d'assurance avec numéro de police : Format PDF avec logo partenaire assurance, Contenu : Numéro de police (ex: ASSUR-SS-1234), Nom assuré, Adresse bien couvert, Montant couverture par risque, Date début/fin (1 an renouvelable tacitement), Conditions générales (lien vers PDF détaillé), Envoi par email + SMS après souscription

**MODULE 12 : ADMINISTRATION ET MODÉRATION**

- **FR-081**: Le système DOIT fournir un dashboard administrateur avec 5 sections principales : Section 1 - Modération annonces (liste annonces signalées avec raisons), Section 2 - Gestion utilisateurs (liste utilisateurs avec statuts, possibilité de suspendre/bannir), Section 3 - Analytics globales (KPIs : nombre d'annonces actives, utilisateurs actifs, transactions complétées, revenus commissions), Section 4 - Médiation litiges (liste litiges ouverts avec assignation médiateurs), Section 5 - Logs système (journal d'audit toutes actions administratives)
- **FR-082**: Le système DOIT permettre la modération d'annonces avec actions : Action 1 - Suspendre annonce (masquage temporaire + notification propriétaire avec raison), Action 2 - Supprimer annonce (suppression définitive si violation grave : fraude, contenu illégal), Action 3 - Demander modification (email propriétaire avec demande de correction), Chaque action nécessite un commentaire obligatoire (traçabilité)
- **FR-083**: Le système DOIT permettre la gestion des utilisateurs avec 3 actions : Action 1 - Suspendre compte (durée configurable : 24h, 7j, 30j, indéfini), Action 2 - Bannir compte (blocage permanent, interdiction de réinscription via même numéro/email), Action 3 - Rétrograder niveau certification (ex: Diamant → Bronze si fraude), Chaque action enregistrée dans le journal d'audit avec admin ID + timestamp + raison
- **FR-084**: Le système DOIT afficher des analytics globales avec 15 KPIs : Nombre total d'annonces (actives + expirées), Nombre d'utilisateurs inscrits (total + actifs derniers 30j), Nombre de transactions complétées (total + ce mois), Revenus commissions (total + ce mois + projection annuelle), Taux de conversion (visites → locations), Temps moyen location (jours entre publication et signature contrat), Satisfaction utilisateurs (note moyenne des avis), Taux de litiges (litiges / transactions × 100), Taux de résolution amiable (litiges résolus / litiges totaux × 100), Répartition géographique (annonces par quartier - graphique camembert), Répartition types de biens (graphique barres), Évolution mensuelle annonces (graphique ligne), Évolution mensuelle utilisateurs (graphique ligne), Évolution mensuelle revenus (graphique ligne), Top 10 propriétaires (plus de transactions)
- **FR-085**: Le système DOIT enregistrer toutes les actions administratives dans un journal d'audit immuable : Chaque action enregistrée avec : Admin ID + nom, Action (ex: "Suspension utilisateur #1234"), Raison/commentaire, Timestamp (date + heure précise GMT), Adresse IP admin, Impossibilité de supprimer ou modifier des entrées du journal (append-only log), Export CSV possible pour audits externes, Rétention permanente (pas de suppression automatique)

**MODULE 13 : SÉCURITÉ ET CONFORMITÉ**

- **FR-086**: Le système DOIT chiffrer toutes les données sensibles avec AES-256 : Mots de passe (hashage bcrypt + salt), Documents d'identité uploadés (CNI, titres fonciers), Contrats signés (PDFs), Messages de la messagerie interne, Données de paiement (numéros de transaction Mobile Money)
- **FR-087**: Le système DOIT implémenter un rate limiting sur les APIs pour prévenir les abus : Endpoint public (recherche annonces) : 100 requêtes/minute par IP, Endpoint authentifié (CRUD annonces) : 60 requêtes/minute par utilisateur, Endpoint paiement : 10 requêtes/heure par utilisateur (protection contre tentatives multiples), Si limite dépassée → HTTP 429 "Too Many Requests" + header "Retry-After: [secondes]"
- **FR-088**: Le système DOIT implémenter une protection CSRF (Cross-Site Request Forgery) sur tous les formulaires avec tokens : Génération d'un token CSRF unique par session utilisateur, Inclusion du token dans chaque formulaire (champ caché), Validation côté serveur : rejet si token absent ou invalide, Régénération du token après chaque soumission réussie
- **FR-089**: Le système DOIT sanitiser tous les inputs utilisateurs pour prévenir XSS et SQL injection : Validation stricte des formats (email, téléphone, prix en GNF, etc.), Échappement de tous les caractères HTML (<, >, &, ", ') avant affichage, Utilisation de requêtes préparées (prepared statements) pour toutes les requêtes SQL, Validation des uploads de fichiers (vérification MIME type + extension + taille)
- **FR-090**: Le système DOIT effectuer des backups quotidiens automatiques de la base de données PostgreSQL : Heure : 2h du matin GMT (heure creuse), Type : Dump complet PostgreSQL (pg_dump), Stockage : AWS S3 ou équivalent avec chiffrement AES-256, Rétention : 30 jours glissants (suppression automatique backups > 30 jours), Tests de restauration : Automatiques 1er de chaque mois avec alerte email si échec
- **FR-091**: Le système DOIT servir tout le contenu via HTTPS uniquement avec certificat Let's Encrypt : Redirection automatique HTTP → HTTPS (code 301 Moved Permanently), Certificat TLS/SSL Let's Encrypt (gratuit, renouvelé automatiquement tous les 90 jours), Headers de sécurité obligatoires : HSTS (Strict-Transport-Security max-age=31536000), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP (Content-Security-Policy)
- **FR-092**: Le système DOIT être conforme à la législation guinéenne avec 3 piliers : Conformité loi protection données (équivalent RGPD local) - Consentement explicite pour collecte données, droit à l'effacement, portabilité données, Conformité loi signatures électroniques 2016/037 - Validité juridique des contrats signés via OTP SMS, Conformité règlement Mobile Money BCE (Banque Centrale) - Enregistrement en tant que partenaire agréé, respect des plafonds de transaction

**MODULE 14 : PERFORMANCE ET SCALABILITÉ**

- **FR-093**: Le système DOIT afficher la page d'accueil en moins de 3 secondes sur une connexion 3G avec optimisations : Lazy loading des images (chargement uniquement des images visibles), Minification CSS/JS (réduction taille fichiers), Compression Gzip/Brotli côté serveur, Service Worker PWA pour cache intelligent, Optimisation requêtes base de données (indexes sur colonnes fréquemment filtrées)
- **FR-094**: Le système DOIT retourner les résultats de recherche en moins de 500ms même avec filtres complexes avec optimisations : Indexes PostgreSQL sur : quartier, type_bien, prix, superficie, nombre_chambres, statut, date_publication, Full-text search index sur colonnes titre + description (GIN index), Cache Redis des recherches populaires (TTL 5 minutes), Pagination server-side (LIMIT/OFFSET) pour éviter de charger toutes les annonces
- **FR-095**: Le système DOIT utiliser Redis pour cacher les annonces populaires et réduire la charge PostgreSQL : Cache des 100 annonces les plus vues (TTL 10 minutes), Cache des résultats de recherche fréquents (TTL 5 minutes), Cache des profils utilisateurs certifiés Diamant/Or (TTL 30 minutes), Invalidation automatique du cache lors de modifications (publication, édition, suppression annonces)
- **FR-096**: Le système DOIT utiliser un CDN (Content Delivery Network) pour servir les images et assets statiques : CDN Cloudflare ou équivalent, Stockage images sur S3 avec distribution CDN, Cache des assets statiques (CSS, JS, fonts) avec TTL 1 semaine, Géolocalisation automatique (serveur CDN le plus proche de l'utilisateur)
- **FR-097**: Le système DOIT supporter 100 000+ annonces actives simultanées sans dégradation de performance avec architecture : Base de données PostgreSQL avec réplication master-slave (read replicas pour lectures), Partitionnement de table annonces si > 500 000 lignes (partition par quartier), Load balancing sur plusieurs serveurs backend (Nginx ou AWS ALB), Monitoring continu avec alertes si temps de réponse > 500ms (Grafana + Prometheus)
- **FR-098**: Le système DOIT monitorer en temps réel les métriques de performance avec dashboard : Temps de réponse moyen par endpoint (ms), Taux d'erreurs 5xx (%), Nombre de requêtes/seconde, Utilisation CPU/RAM serveurs (%), Connexions base de données actives, Taille cache Redis (Mo), Latence API Mobile Money (ms), Taux de succès paiements (%), Alertes automatiques si seuils dépassés (ex: temps réponse > 1s, erreurs > 1%, CPU > 80%)

**MODULE 15 : PLANIFICATION DE VISITES**

- **FR-099**: Le système DOIT permettre à un chercheur authentifié de demander une visite d'une annonce en proposant un créneau (date + heure), avec un message optionnel (max 500 caractères). La visite est créée en statut "EN_ATTENTE" et le propriétaire est notifié via les 4 canaux (Push, SMS, Email, WhatsApp si opt-in). Les numéros de téléphone restent masqués.
- **FR-100**: Le système DOIT permettre au propriétaire de confirmer, annuler ou marquer une visite comme effectuée, avec transitions de statut : EN_ATTENTE → CONFIRMEE → COMPLETEE, ou → ANNULEE (par l'une des parties). Le propriétaire peut répondre via un lien public sécurisé (token unique) sans se connecter. Chaque changement de statut notifie l'autre partie.
- **FR-101**: Le système DOIT afficher, pour chaque annonce, des statistiques de visites (nombre de demandes, confirmées, complétées) visibles par le propriétaire, et empêcher les créneaux dans le passé.

### Key Entities

- **Utilisateur (User)** : Représente une personne inscrite. Attributs clés : id (UUID), nom_complet, numéro_téléphone (format +224 6XX XXX XXX unique), email (optionnel), mot_de_passe_hash (bcrypt), type_compte (particulier/agence/diaspora), badge_certification (bronze/argent/or/diamant), statut_vérification (non_vérifié/cni_vérifiée/titre_foncier_vérifié), préférences_notification (JSON : {push: true, sms: true, email: true, whatsapp: false}), date_inscription, dernière_connexion, note_moyenne (calculée), nombre_transactions, nombre_litiges, statut_compte (actif/suspendu/banni)

- **Annonce (Listing)** : Représente un bien immobilier. Attributs clés : id (UUID), créateur_id (FK User), type_opération (location/vente), type_bien (villa/appartement/studio/terrain/commerce/bureau/entrepôt), titre (50-100 caractères), description (200-2000 caractères), prix_gnf (integer), quartier (enum : kaloum/dixinn/ratoma/matam/matoto/dubreka_centre/dubreka_peripherie/coyah_centre/coyah_peripherie), superficie_m2 (pour terrains/villas), nombre_chambres, nombre_salons, caution_mois (1-6 pour locations), équipements (JSON array), photos (JSON array URLs S3), statut (disponible/en_négociation/loué_vendu/expiré/archivé), nombre_vues, options_premium (JSON : {badge_urgent: false, remontée_48h: false, photos_pro: false}), date_publication, date_dernière_mise_à_jour, date_expiration (publication + 90 jours)

- **Visite (Visit)** : Représente une demande de visite d'un bien. Attributs clés : id (UUID), annonce_id (FK Listing), demandeur_id (FK User - chercheur), propriétaire_id (FK User - créateur annonce), date_visite (créneau proposé/confirmé), statut (en_attente/confirmée/complétée/annulée), message (optionnel, max 500 caractères), lien_public_token (réponse sans compte), date_création, date_confirmation

- **Contrat (Contract)** : Représente un document légal. Attributs clés : id (UUID), type_contrat (bail_location_residentiel/bail_location_commercial/promesse_vente_terrain/mandat_gestion/attestation_caution), annonce_id (FK Listing), propriétaire_id (FK User), locataire_acheteur_id (FK User), données_personnalisées (JSON : durée_bail, montant_loyer_gnf, montant_caution_gnf, date_début, date_fin, clauses_spécifiques), statut (brouillon/en_attente_signature/partiellement_signé/signé_archivé/annulé), fichier_pdf_url (S3), hash_sha256 (intégrité), signatures (JSON array : [{user_id, timestamp, otp_validé, signature_base64}]), date_création, date_signature_complète, délai_rétractation_expire_à (signature_complète + 48h)

- **Paiement (Payment)** : Représente une transaction financière. Attributs clés : id (UUID), payeur_id (FK User), bénéficiaire_id (FK User), contrat_id (FK Contract), type_paiement (caution/loyer_mensuel/commission_plateforme/vente), montant_gnf (integer), commission_plateforme_gnf (calculée selon type), montant_total_gnf (montant + commission), méthode_paiement (orange_money/mtn_momo/espèces), statut (initié/en_attente_otp/en_escrow/commission_collectée/confirmé/échoué/remboursé), numéro_transaction_externe (ID Orange/MTN), quittance_pdf_url (S3), tentatives_paiement (1-3), date_création, date_confirmation, date_validation_bénéficiaire, date_déblocage_escrow

- **Certification (CertificationDocument)** : Représente un document de vérification uploadé. Attributs clés : id (UUID), utilisateur_id (FK User), type_document (cni/titre_foncier/passeport), fichier_url (S3), statut_vérification (en_attente/approuvé/rejeté), commentaire_vérification (si rejeté), vérifié_par_admin_id (FK User admin), date_upload, date_vérification

- **Notation (Rating)** : Représente une évaluation. Attributs clés : id (UUID), évaluateur_id (FK User), évalué_id (FK User), transaction_id (FK Transaction), note_globale (1-5), critère_1_note (1-5), critère_2_note (1-5), critère_3_note (1-5), commentaire (20-500 caractères), statut_modération (en_attente/approuvé/rejeté), mots_clés_détectés (JSON array si rejeté), date_création, date_publication

- **Conversation (Conversation)** : Représente un fil de discussion. Attributs clés : id (UUID), annonce_id (FK Listing), participant_1_id (FK User), participant_2_id (FK User), date_création, date_dernier_message, statut (active/archivée), numéros_partagés (booléen - false par défaut)

- **Message (Message)** : Représente un message. Attributs clés : id (UUID), conversation_id (FK Conversation), expéditeur_id (FK User), type_message (texte/vocal/photo/localisation_gps), contenu_texte (max 2000 caractères si type=texte), fichier_url (S3 si type=vocal/photo), localisation_lat_lng (si type=localisation), horodatage, statut_lecture (envoyé/livré/lu), signalé (booléen), raison_signalement

- **Litige (Dispute)** : Représente un litige. Attributs clés : id (UUID), référence (ex: LIT-1234), transaction_id (FK Transaction), demandeur_id (FK User), défendeur_id (FK User), type_litige (impayé/dégâts/expulsion_abusive/caution_non_remboursée/autre), description (200-2000 caractères), preuves_urls (JSON array S3), statut (ouvert/en_cours/résolu_amiable/résolu_compensation/échoué_escalade), médiateur_assigné_id (FK User admin), résolution (JSON : {issue, montant_compensation_gnf, accord_parties}), date_ouverture, date_assignation_médiateur, date_résolution

- **Transaction (Transaction)** : Représente une opération complétée. Attributs clés : id (UUID), annonce_id (FK Listing), propriétaire_id (FK User), locataire_acheteur_id (FK User), contrat_id (FK Contract), paiements_ids (JSON array FK Payment), type_transaction (location/vente), montant_total_gnf, commission_plateforme_gnf, statut (en_cours/complétée/annulée), date_début, date_complétion

- **Assurance (Insurance)** : Représente une souscription d'assurance. Attributs clés : id (UUID), utilisateur_id (FK User), contrat_id (FK Contract), type_assurance (sejour_serein/loyer_garanti), numéro_police (ex: ASSUR-SS-1234), prime_mensuelle_gnf, couvertures (JSON : {expulsion_abusive: true, caution: true, assistance_juridique: true}), plafonds (JSON : {expulsion: 3_mois_loyer, dégâts: 1000000}), statut (active/résiliée/suspendue), date_souscription, date_expiration (souscription + 1 an)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Les propriétaires peuvent publier une nouvelle annonce complète (avec 5 photos) en moins de 5 minutes chrono (du clic "Créer annonce" à la publication finale), mesuré via analytics utilisateur avec timer intégré

- **SC-002**: Les chercheurs trouvent des annonces correspondant exactement à leurs critères (ex: Appartement 2 chambres à Kaloum entre 2M et 3M GNF) en moins de 30 secondes (de l'ouverture de la page de recherche à l'affichage des résultats pertinents)

- **SC-003**: 95% des messages sont livrés en temps réel (< 2 secondes de latence entre envoi et réception) via WebSocket, mesuré par timestamp serveur

- **SC-004**: Les utilisateurs reçoivent les notifications pour nouveaux messages dans les 10 secondes suivant l'envoi via les 4 canaux (Push, SMS, Email, WhatsApp si activé), mesuré par logs notifications

- **SC-005**: 100% des contrats générés sont conformes aux clauses obligatoires de la loi guinéenne 2016/037, validé par audit juridique trimestriel avec juriste local partenaire

- **SC-006**: La génération d'un contrat PDF complet (4-6 pages) prend moins de 5 secondes après soumission du formulaire, mesuré côté serveur

- **SC-007**: Les signatures électroniques via OTP SMS sont complétées en moins de 2 minutes par partie signataire (du clic "Signer" à la validation OTP finale), mesuré via analytics

- **SC-008**: 90% des paiements Mobile Money (Orange/MTN) sont confirmés dans les 2 minutes suivant l'initiation (hors délais des providers externes hors contrôle), mesuré via webhooks

- **SC-009**: Les quittances PDF (caution ou loyer) sont générées et envoyées automatiquement dans les 30 secondes suivant la confirmation de paiement, mesuré par logs système

- **SC-010**: Les rappels de paiement automatiques (J-3, J-1, J-0) sont envoyés avec une précision de 100% aux bons moments (tolérance ±5 minutes), mesuré via logs workflows n8n

- **SC-011**: La commission plateforme est collectée avec un taux de succès de 95% le jour du paiement de la caution (5% d'échecs acceptables pour paiements espèces nécessitant validation manuelle)

- **SC-012**: Le système supporte 10 000 utilisateurs actifs simultanés sans dégradation de performance (temps de réponse < 500ms pour 95% des requêtes), validé par tests de charge mensuels avec k6

- **SC-013**: Le taux de disponibilité (uptime) de la plateforme est supérieur à 99,5% (tolérance de 3,6 heures de downtime par mois), mesuré par Uptime Robot

- **SC-014**: 80% des nouveaux utilisateurs complètent leur première publication d'annonce sans abandon (taux de conversion inscription → première annonce publiée), mesuré via funnel analytics

- **SC-015**: Le taux de litiges est inférieur à 5% du nombre total de transactions (95%+ de transactions sans litige), mesuré mensuellement

- **SC-016**: 70%+ des litiges ouverts sont résolus à l'amiable (sans escalade juridique) grâce à la médiation ImmoGuinée, mesuré via dashboard admin

- **SC-017**: Les utilisateurs certifiés Or et Diamant représentent 20%+ de la base utilisateurs active après 12 mois de lancement, mesuré via statistiques certification

- **SC-018**: Le nombre d'annonces actives croît de 20% par mois après le lancement (indicateur de traction), mesuré via dashboard analytics

- **SC-019**: Le temps moyen de complétion d'une transaction (de la publication de l'annonce à la signature du contrat) est réduit de 50% par rapport aux méthodes traditionnelles hors plateforme (baseline : 60 jours en moyenne → objectif : 30 jours), mesuré via sondages utilisateurs

- **SC-020**: Les utilisateurs notent l'expérience globale de la plateforme avec une moyenne de 4+ étoiles sur 5 (sondage post-transaction envoyé automatiquement après chaque transaction complétée), avec taux de réponse > 30%
