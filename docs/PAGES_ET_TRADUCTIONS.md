# Recapitulatif des Pages et Traductions - ImmoGuinee

*Document genere le 3 janvier 2026*

## Vue d'ensemble

ImmoGuinee dispose de **75+ pages** organisees en plusieurs categories. Toutes les pages sont traduites en **Francais (fr)** et **Anglais (en)**.

---

## Structure des fichiers de traduction

| Fichier | Lignes | Sections |
|---------|--------|----------|
| `messages/fr.json` | 1675 | 35 sections principales |
| `messages/en.json` | 1675 | 35 sections principales |

---

## Pages Publiques (`/app/(public)/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Annonces (liste) | `/annonces` | `search.*`, `listing.*` |
| Detail annonce | `/annonces/[id]` | `listing.*` |
| Aide | `/aide` | `help.*` |
| Contact | `/contact` | `contact.*` |
| Inscription | `/inscription` | `auth.register.*` |
| Conditions | `/conditions` | `legal.termsOfUse.*` |
| Confidentialite | `/confidentialite` | `legal.privacy.*` |
| Location courte duree | `/location-courte-duree` | `shortTermRental.*` |
| Reponse visite | `/visite/reponse` | `visits.*` |

### Pages Legal (`/legal/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Index legal | `/legal` | `legal.*` |
| Conditions d'utilisation | `/legal/conditions-utilisation` | `legal.termsOfUse.*` |
| Politique de confidentialite | `/legal/politique-confidentialite` | `legal.privacy.*` |

### Pages Authentification (`/auth/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Connexion | `/auth/login` | `auth.login.*` |
| Inscription | `/auth/register` | `auth.register.*` |
| Mot de passe oublie | `/auth/forgot-password` | `auth.forgotPassword.*` |
| Verification OTP | `/auth/verify-otp` | `auth.otp.*` |
| Reinitialiser mot de passe | `/auth/reset-password` | `auth.resetPassword.*` |
| Completer profil | `/auth/complete-profile` | `auth.completeProfile.*` |
| Verification 2FA | `/auth/verify-2fa` | `auth.verify2fa.*` |

---

## Pages Client (`/app/(client)/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Accueil | `/` | `home.*` |
| Recherche | `/recherche` | `search.*` |
| Detail bien | `/bien/[id]` | `listing.*` |
| Connexion | `/connexion` | `auth.login.*` |
| Deconnexion | `/deconnexion` | `nav.logout` |
| Estimer | `/estimer` | `estimate.*` |

---

## Pages Authentifiees (`/app/(auth)/`)

### Dashboard

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Tableau de bord | `/dashboard` | `dashboard.*` |
| Certification | `/dashboard/certification` | `certification.*` |
| Mes contrats | `/dashboard/mes-contrats` | `contracts.*` |
| Mes litiges | `/dashboard/mes-litiges` | `disputes.*` |
| Mes paiements | `/dashboard/mes-paiements` | `payments.*` |
| Messagerie | `/dashboard/messagerie` | `messages.*` |

### Profil et parametres

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Profil | `/profil` | `profile.*` |
| Modifier profil | `/profil/edit` | `profile.edit.*` |
| Parametres | `/parametres` | `settings.*` |

### Annonces

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Mes annonces | `/mes-annonces` | `myListings.*` |
| Modifier annonce | `/mes-annonces/[id]/modifier` | `publish.*` |
| Publier | `/publier` | `publish.*` |

### Autres pages authentifiees

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Favoris | `/favoris` | `favorites.*` |
| Messages | `/messages` | `messages.*` |
| Messagerie | `/messagerie` | `messages.*` |
| Visites | `/visites` | `visits.*` |

### Contrats

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Liste contrats | `/contrats` | `contracts.*` |
| Detail contrat | `/contrats/[id]` | `contracts.*` |
| Signer contrat | `/contrats/[id]/signer` | `contracts.*` |
| Generer contrat | `/contrats/generer` | `contracts.*` |

### Assurances

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Reclamations | `/assurances/reclamations` | `insurance.claims.*` |
| Souscrire | `/assurances/souscrire` | `insurance.subscribe.*` |

### Litiges et Notations

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Creer litige | `/litiges/creer` | `disputes.create.*` |
| Notations | `/notations/[transactionId]` | `ratings.*` |

### Proprietaire

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Statistiques | `/proprietaire/statistiques` | `ownerStats.*` |

---

## Pages Moderation (`/app/(moderator)/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Dashboard moderation | `/moderator` | `moderator.dashboard.*` |
| Annonces | `/moderator/annonces` | `moderator.listings.*` |
| Signalements | `/moderator/signalements` | `moderator.reports.*` |
| Utilisateurs | `/moderator/utilisateurs` | `moderator.users.*` |
| Historique | `/moderator/historique` | `moderator.history.*` |

---

## Pages Administration (`/app/(admin)/`)

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Dashboard admin | `/admin` | `admin.dashboard.*` |
| Annonces | `/admin/annonces` | `admin.sidebar.listings` |
| Modifier annonce | `/admin/annonces/[id]/modifier` | `publish.*` |
| Assurances | `/admin/assurances` | `insurance.*` |
| Certifications | `/admin/certifications` | `certification.*` |
| Contrats | `/admin/contrats` | `contracts.*` |
| Documentation | `/admin/documentation` | `admin.sidebar.documentation` |
| Litiges | `/admin/litiges` | `disputes.*` |
| Messages | `/admin/messages` | `messages.*` |
| Moderation | `/admin/moderation` | `moderator.*` |
| Notations | `/admin/notations` | `ratings.*` |
| Notifications | `/admin/notifications` | `settings.notifications.*` |
| Paiements | `/admin/paiements` | `payments.*` |
| Parametres | `/admin/settings` | `admin.settings.*` |
| Statistiques | `/admin/stats` | `admin.dashboard.*` |
| Utilisateurs | `/admin/users` | `admin.users.*` |
| Utilisateurs (fr) | `/admin/utilisateurs` | `admin.users.*` |
| Visites | `/admin/visites` | `visits.*` |

---

## Pages Speciales

| Page | URL | Cle de traduction |
|------|-----|-------------------|
| Signature contrat externe | `/contrat/signer/[token]` | `contracts.*` |
| Erreur 404 | `/not-found` | `errors.404.*` |
| Erreur generale | `/error` | `errors.500.*` |

---

## Sections de traduction disponibles

### Sections principales (35 total)

1. `common` - Elements communs (boutons, textes)
2. `nav` - Navigation
3. `home` - Page d'accueil
4. `search` - Recherche et filtres
5. `listing` - Details des annonces
6. `auth` - Authentification (login, register, OTP, 2FA...)
7. `dashboard` - Tableau de bord utilisateur
8. `publish` - Publication d'annonces
9. `messages` - Messagerie
10. `favorites` - Favoris
11. `myListings` - Mes annonces
12. `profile` - Profil utilisateur
13. `settings` - Parametres
14. `footer` - Pied de page
15. `errors` - Pages d'erreur
16. `time` - Formatage des dates
17. `language` - Selection de langue
18. `visits` - Gestion des visites
19. `estimate` - Estimation de biens
20. `contact` - Page de contact
21. `help` - Centre d'aide
22. `contracts` - Gestion des contrats
23. `moderator` - Interface de moderation
24. `admin` - Administration
25. `legal` - Pages legales
26. `insurance` - Assurances
27. `disputes` - Litiges
28. `ratings` - Notations et avis
29. `shortTermRental` - Location courte duree
30. `certification` - Certification proprietaire
31. `payments` - Paiements
32. `ownerStats` - Statistiques proprietaire

---

## Utilisation dans le code

### Exemple d'utilisation avec next-intl

```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('home');

  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('hero.subtitle')}</p>
    </div>
  );
}
```

### Variables dans les traductions

```json
{
  "greeting": "Bonjour, {name}",
  "memberSince": "Membre depuis {year}"
}
```

```tsx
t('greeting', { name: 'Mamadou' })  // "Bonjour, Mamadou"
t('memberSince', { year: 2024 })     // "Membre depuis 2024"
```

---

## Ajout de nouvelles traductions

1. Ajouter la cle dans `messages/fr.json`
2. Ajouter la traduction correspondante dans `messages/en.json`
3. Utiliser avec `useTranslations('section')` et `t('key')`

---

## Notes

- Les accents sont evites dans les fichiers JSON pour compatibilite
- Toutes les pages sont accessibles en francais (langue par defaut)
- La selection de langue peut etre ajoutee via le composant LanguageSelector
- Les traductions sont chargees cote serveur pour de meilleures performances SEO

---

*Ce document est genere automatiquement. Pour toute modification, editez les fichiers source dans `/frontend/messages/`.*
