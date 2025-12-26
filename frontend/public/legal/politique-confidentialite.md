# POLITIQUE DE CONFIDENTIALITE

**ImmoGuinee - Protection de vos donnees personnelles**

*Derniere mise a jour : 27 decembre 2025*

---

## INTRODUCTION

ImmoGuinee s'engage a proteger la vie privee de ses Utilisateurs et a traiter leurs donnees personnelles avec le plus grand soin, dans le respect de :

- **La Loi L/2016/037/AN** de la Republique de Guinee relative a la cybersecurite et la protection des donnees personnelles
- **Les directives de la CEDEAO** sur la protection des donnees personnelles
- **Le Reglement General sur la Protection des Donnees (RGPD)** de l'Union Europeenne (applicable aux Utilisateurs europeens)
- **Les standards internationaux** en matiere de protection de la vie privee

La presente Politique de Confidentialite explique comment nous collectons, utilisons, stockons et protegeons vos informations personnelles.

---

## 1. RESPONSABLE DU TRAITEMENT

**ImmoGuinee SARL**
- Siege social : Conakry, Republique de Guinee
- Email : privacy@immoguinee.com
- Telephone : +224 613 354 420

Pour toute question relative a vos donnees personnelles, vous pouvez contacter notre Delegue a la Protection des Donnees (DPO) a l'adresse : dpo@immoguinee.com

---

## 2. DONNEES COLLECTEES

### 2.1 Donnees d'identification

| Donnee | Finalite | Base legale |
|--------|----------|-------------|
| Nom complet | Identification, contrats | Execution du contrat |
| Numero de telephone | Authentification, communication | Execution du contrat |
| Adresse email | Communication, notifications | Consentement |
| Photo de profil | Personnalisation du compte | Consentement |
| Adresse postale | Livraison de documents, contrats | Execution du contrat |

### 2.2 Donnees professionnelles (Agences et Professionnels)

| Donnee | Finalite | Base legale |
|--------|----------|-------------|
| Nom de l'entreprise | Identification professionnelle | Execution du contrat |
| Numero RCCM | Verification legale | Obligation legale |
| Adresse commerciale | Contact professionnel | Execution du contrat |

### 2.3 Documents d'identite

| Document | Finalite | Conservation |
|----------|----------|--------------|
| Carte Nationale d'Identite (CNI) | Verification d'identite | Duree du compte + 1 an |
| Titre Foncier | Verification de propriete | Duree de l'annonce + 1 an |
| Registre de commerce | Verification professionnelle | Duree du compte + 1 an |

Ces documents sont :
- Stockes de maniere chiffree (AES-256-GCM)
- Hashes pour verification d'integrite
- Accessibles uniquement au personnel autorise

### 2.4 Donnees de transaction

| Donnee | Finalite | Conservation |
|--------|----------|--------------|
| Montants des transactions | Facturation, commissions | 10 ans (obligation legale) |
| References de paiement | Tracabilite financiere | 10 ans |
| Informations Mobile Money | Traitement des paiements | Duree de la transaction |

### 2.5 Donnees d'utilisation

| Donnee | Finalite | Conservation |
|--------|----------|--------------|
| Adresse IP | Securite, prevention fraude | 12 mois |
| Type d'appareil | Optimisation technique | 12 mois |
| Historique de navigation | Amelioration des services | 6 mois |
| Derniere connexion | Securite du compte | Duree du compte |
| Statut en ligne | Fonctionnalite temps reel | Temps reel uniquement |

### 2.6 Donnees de communication

| Donnee | Finalite | Conservation |
|--------|----------|--------------|
| Messages texte | Service de messagerie | Duree du compte |
| Messages vocaux (E2E) | Communication | 7 jours sur serveur, permanent sur appareil |
| Photos/Videos (E2E) | Partage de medias | 7 jours sur serveur, permanent sur appareil |

### 2.7 Donnees de localisation

| Donnee | Finalite | Conservation |
|--------|----------|--------------|
| Quartier/Commune | Localisation des biens | Duree de l'annonce |
| Coordonnees GPS | Affichage sur carte | Duree de l'annonce |

La collecte des coordonnees GPS est optionnelle et soumise a votre consentement explicite.

---

## 3. FINALITES DU TRAITEMENT

Nous traitons vos donnees pour les finalites suivantes :

### 3.1 Execution du contrat
- Creer et gerer votre compte
- Publier et gerer vos annonces
- Faciliter les communications entre Utilisateurs
- Traiter les transactions et paiements
- Generer et signer les contrats numeriques

### 3.2 Interets legitimes
- Prevenir la fraude et les abus
- Ameliorer nos services
- Assurer la securite de la Plateforme
- Analyser l'utilisation de nos services

### 3.3 Obligations legales
- Conserver les contrats pendant 10 ans
- Repondre aux requisitions des autorites
- Respecter les obligations fiscales

### 3.4 Consentement
- Envoyer des communications marketing
- Utiliser des cookies non essentiels
- Collecter des donnees de localisation precises

---

## 4. MESURES DE SECURITE

ImmoGuinee met en oeuvre des mesures de securite techniques et organisationnelles avancees pour proteger vos donnees :

### 4.1 Chiffrement

| Niveau | Technologie | Application |
|--------|-------------|-------------|
| Transit | TLS 1.3 / HTTPS | Toutes les communications |
| Stockage | AES-256-GCM | Documents, contrats sensibles |
| Mots de passe | Bcrypt (12 rounds) | Authentification |
| Medias E2E | AES-256-GCM | Photos, videos, vocaux |

### 4.2 Authentification

- **Verification OTP** : Code a usage unique via WhatsApp pour la creation de compte
- **Authentification a deux facteurs (2FA)** : Disponible pour tous les comptes
- **Tokens d'acces** : Expiration automatique apres 24 heures
- **Tokens de rafraichissement** : Expiration apres 30 jours

### 4.3 Protection contre les attaques

| Menace | Protection |
|--------|------------|
| Injection SQL | Requetes preparees, ORM |
| XSS | Sanitisation des entrees, CSP |
| CSRF | Tokens CSRF, SameSite cookies |
| Brute force | Limitation de tentatives |
| DDoS | Pare-feu applicatif, CDN |

### 4.4 Limitation des tentatives (Rate Limiting)

| Action | Limite |
|--------|--------|
| Connexion | 5 tentatives/minute |
| Inscription | 3 tentatives/minute |
| Demande OTP | 3 tentatives/minute |
| Verification OTP | 5 tentatives/minute |
| Paiement | 10 tentatives/heure |
| Messages | 20/minute |

### 4.5 Securite des contrats

- **Verrouillage** : Les contrats signes sont verrouilles et non modifiables
- **Cachet electronique** : Hash SHA-256 garantissant l'integrite
- **Audit** : Journal des acces et modifications
- **Triggers SQL** : Protection au niveau base de donnees

### 4.6 Chiffrement de bout en bout (E2E)

Pour les medias (photos, videos, messages vocaux) :
- Les cles de chiffrement sont generees sur votre appareil
- Les cles ne sont **jamais stockees sur nos serveurs**
- Seuls vous et le destinataire pouvez dechiffrer le contenu
- Les medias chiffres sont stockes temporairement (7 jours) sur le serveur
- Apres telechargement, les medias sont supprimes du serveur

---

## 5. PARTAGE DES DONNEES

### 5.1 Partage avec d'autres Utilisateurs

| Donnee partagee | Avec qui | Finalite |
|-----------------|----------|----------|
| Nom, photo | Utilisateurs en contact | Communication |
| Annonces | Public | Visibilite des biens |
| Badge (niveau) | Utilisateurs | Confiance |

### 5.2 Prestataires techniques

Nous partageons certaines donnees avec des prestataires de confiance :

| Prestataire | Donnees partagees | Finalite | Localisation |
|-------------|-------------------|----------|--------------|
| DigitalOcean | Fichiers, medias | Hebergement | UE (Francfort) |
| Orange Money | Donnees paiement | Transactions | Guinee |
| MTN Mobile Money | Donnees paiement | Transactions | Guinee |
| Sentry | Erreurs techniques (sans PII) | Monitoring | UE |

Tous nos prestataires sont lies par des accords de confidentialite et de traitement des donnees.

### 5.3 Autorites

Nous pouvons divulguer vos donnees aux autorites competentes :
- En reponse a une requisition judiciaire valide
- Pour prevenir une menace imminente a la securite
- Pour respecter nos obligations legales

Nous vous informerons de toute divulgation, sauf si la loi l'interdit.

### 5.4 Ce que nous ne faisons PAS

- Nous ne **vendons pas** vos donnees personnelles
- Nous ne partageons pas vos donnees a des fins publicitaires tierces
- Nous ne transmettons pas vos donnees sans base legale

---

## 6. TRANSFERTS INTERNATIONAUX

### 6.1 Localisation des donnees

| Type de donnees | Localisation | Justification |
|-----------------|--------------|---------------|
| Base de donnees | UE (Francfort) | Conformite RGPD |
| Fichiers medias | UE (Francfort) | Conformite RGPD |
| Sauvegardes | UE | Continuite de service |

### 6.2 Garanties

Pour les transferts hors de Guinee :
- Clauses contractuelles types de l'UE
- Evaluation d'impact sur la protection des donnees
- Mesures techniques supplementaires (chiffrement)

---

## 7. CONSERVATION DES DONNEES

### 7.1 Durees de conservation

| Type de donnees | Duree | Justification |
|-----------------|-------|---------------|
| Compte utilisateur | Duree du compte + 2 ans | Service, litiges |
| Annonces | Duree de publication + 1 an | Historique |
| Contrats | 10 ans | Obligation legale |
| Messages texte | Duree du compte | Service |
| Medias chiffres (serveur) | 7 jours | Temporaire |
| Medias chiffres (appareil) | Choix utilisateur | Controle utilisateur |
| Logs de securite | 12 mois | Securite |
| Donnees de paiement | 10 ans | Obligation fiscale |
| Documents d'identite | Duree compte + 1 an | Verification |

### 7.2 Suppression automatique

- **OTP** : Expire apres 5 minutes
- **Sessions** : Expire apres 2 heures d'inactivite
- **Medias E2E** : Supprimes du serveur apres 7 jours
- **Contrats expires** : Supprimes apres 10 ans

### 7.3 Suppression sur demande

A votre demande, nous supprimons :
- Votre compte et profil
- Vos annonces
- Vos messages (sauf obligations legales)

Certaines donnees peuvent etre conservees pour des raisons legales (contrats, transactions).

---

## 8. VOS DROITS

Conformement a la legislation guineenne et aux standards internationaux, vous disposez des droits suivants :

### 8.1 Droit d'acces

Vous pouvez demander une copie de toutes les donnees que nous detenons sur vous.

**Comment exercer ce droit** : Envoyez un email a privacy@immoguinee.com avec l'objet "Demande d'acces".

**Delai de reponse** : 30 jours maximum.

### 8.2 Droit de rectification

Vous pouvez corriger vos donnees inexactes ou incompletes.

**Comment exercer ce droit** :
- Directement dans les parametres de votre compte
- Ou par email a privacy@immoguinee.com

### 8.3 Droit a l'effacement ("droit a l'oubli")

Vous pouvez demander la suppression de vos donnees personnelles.

**Limites** : Ce droit ne s'applique pas aux donnees que nous devons conserver pour des obligations legales (contrats, transactions).

### 8.4 Droit a la limitation du traitement

Vous pouvez demander la suspension du traitement de vos donnees dans certains cas.

### 8.5 Droit a la portabilite

Vous pouvez demander a recevoir vos donnees dans un format structure et lisible par machine (JSON).

### 8.6 Droit d'opposition

Vous pouvez vous opposer au traitement de vos donnees pour des motifs legitimes.

### 8.7 Droit de retrait du consentement

Lorsque le traitement est base sur votre consentement, vous pouvez le retirer a tout moment.

### 8.8 Comment exercer vos droits

- **Email** : privacy@immoguinee.com
- **Courrier** : ImmoGuinee SARL, Conakry, Guinee
- **Dans l'application** : Parametres > Confidentialite

Nous repondrons dans un delai de 30 jours. Une verification d'identite peut etre requise.

---

## 9. COOKIES ET TECHNOLOGIES SIMILAIRES

### 9.1 Types de cookies utilises

| Cookie | Type | Finalite | Duree |
|--------|------|----------|-------|
| Session | Essentiel | Authentification | Session |
| Preferences | Fonctionnel | Langue, theme | 1 an |
| Analytics | Statistique | Amelioration | 6 mois |

### 9.2 Gestion des cookies

Vous pouvez gerer vos preferences de cookies :
- Via la banniere de consentement au premier acces
- Dans les parametres de votre navigateur
- Dans les parametres de l'application mobile

### 9.3 Cookies tiers

Nous n'utilisons pas de cookies publicitaires tiers.

---

## 10. SECURITE DES MINEURS

ImmoGuinee n'est pas destine aux personnes de moins de 18 ans.

Nous ne collectons pas sciemment de donnees concernant des mineurs. Si vous etes parent et pensez que votre enfant nous a fourni des donnees, contactez-nous pour les faire supprimer.

---

## 11. NOTIFICATIONS ET COMMUNICATIONS

### 11.1 Types de notifications

| Type | Contenu | Opt-out possible |
|------|---------|------------------|
| Transactionnelles | Confirmations, alertes securite | Non |
| Service | Nouvelles fonctionnalites | Oui |
| Marketing | Promotions, offres | Oui |

### 11.2 Canaux de communication

Vous pouvez configurer vos preferences de notification pour :
- Email
- WhatsApp
- SMS
- Notifications push

### 11.3 Desabonnement

Pour vous desabonner des communications marketing :
- Cliquez sur "Se desabonner" dans l'email
- Modifiez vos preferences dans Parametres > Notifications
- Contactez-nous a support@immoguinee.com

---

## 12. DETECTION DE FRAUDE

### 12.1 Systeme automatise

Nous utilisons un systeme automatise pour detecter les activites frauduleuses :
- Analyse des messages pour detecter les numeros de telephone partages
- Detection des liens externes suspects
- Identification des mots-cles associes a la fraude
- Scoring de risque (0-100)

### 12.2 Finalite

Ce systeme vise a :
- Proteger les Utilisateurs contre les arnaques
- Empecher le contournement de la Plateforme
- Maintenir un environnement de confiance

### 12.3 Decisions automatisees

En cas de detection de fraude :
- Le message peut etre bloque
- L'Utilisateur est averti
- Un examen humain peut etre declenche

Vous avez le droit de contester une decision automatisee en contactant le support.

---

## 13. INCIDENTS DE SECURITE

### 13.1 Notification en cas de violation

En cas de violation de donnees susceptible d'engendrer un risque pour vos droits :
- Nous vous informerons dans les 72 heures
- Nous decrirons la nature de la violation
- Nous indiquerons les mesures prises
- Nous fournirons des recommandations

### 13.2 Mesures de prevention

- Surveillance continue de la securite
- Tests de penetration reguliers
- Audits de securite
- Formation du personnel

### 13.3 Signalement

Pour signaler une vulnerabilite de securite :
- Email : security@immoguinee.com
- Nous nous engageons a repondre sous 48 heures

---

## 14. MODIFICATIONS DE LA POLITIQUE

### 14.1 Mises a jour

Nous pouvons modifier cette Politique de Confidentialite pour refleter :
- L'evolution de nos pratiques
- Les nouvelles exigences legales
- Les ameliorations de securite

### 14.2 Notification

En cas de modification substantielle :
- Notification par email
- Notification dans l'application
- Affichage sur le site web

La date de derniere mise a jour est indiquee en haut de ce document.

### 14.3 Historique des versions

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 26/12/2025 | Version initiale |
| 1.1 | 27/12/2025 | Harmonisation duree stockage medias E2E (7 jours) |

---

## 15. CONTACT

Pour toute question concernant cette Politique de Confidentialite ou vos donnees personnelles :

**Delegue a la Protection des Donnees (DPO)**
- Email : dpo@immoguinee.com

**Service Confidentialite**
- Email : privacy@immoguinee.com
- Telephone : +224 613 354 420

**Adresse postale**
ImmoGuinee SARL
Conakry, Republique de Guinee

---

## 16. AUTORITE DE CONTROLE

Si vous estimez que vos droits ne sont pas respectes, vous pouvez adresser une reclamation a :

**En Guinee :**
Autorite de Regulation des Postes et Telecommunications (ARPT)
Conakry, Guinee

**Pour les residents de l'UE :**
Vous pouvez contacter l'autorite de protection des donnees de votre pays de residence.

---

*Cette Politique de Confidentialite entre en vigueur le 27 decembre 2025.*

**Version 1.1**

---

## RESUME DE VOS DROITS

| Droit | Description | Comment l'exercer |
|-------|-------------|-------------------|
| Acces | Obtenir une copie de vos donnees | privacy@immoguinee.com |
| Rectification | Corriger vos donnees | Parametres du compte |
| Effacement | Supprimer vos donnees | privacy@immoguinee.com |
| Portabilite | Recevoir vos donnees (JSON) | privacy@immoguinee.com |
| Opposition | Refuser certains traitements | privacy@immoguinee.com |
| Limitation | Suspendre le traitement | privacy@immoguinee.com |

**Delai de reponse : 30 jours maximum**
