# API Contract: Facebook Page Integration

**Version**: 1.0.0 | **Date**: 2026-01-05 | **Status**: Draft
**Base URL**: `https://api.immoguinee.com/api`
**Authentication**: Bearer Token (JWT — `AuthUser` extractor)

---

## Overview

Cette API permet aux utilisateurs de connecter leur Page Facebook pour publier automatiquement leurs annonces immobilières avec un filigrane ImmoGuinée, et supprimer automatiquement les posts lorsque l'annonce est marquée comme louée ou vendue.

### Contraintes de Sécurité (NON-NÉGOCIABLES)

- Publication UNIQUEMENT sur Pages Facebook (jamais profils personnels)
- Consentement explicite (opt-in) obligatoire pour chaque annonce
- Tokens chiffrés AES-256-GCM en base de données
- Aucun token dans les logs ou réponses API
- Conformité stricte aux Meta Platform Policies
- Tous les messages via codes i18n (FR/EN)

### Permissions Meta Requises

| Permission | Usage | App Review |
|------------|-------|------------|
| `public_profile` | Identification utilisateur | Non requis |
| `pages_manage_posts` | Publication/suppression posts | Requis |
| `pages_read_engagement` | Lecture métriques Page | Requis |

---

## Endpoints

### 1. Initiate OAuth Connection

Initie le flow OAuth 2.0 avec Meta pour connecter une Page Facebook.

```
POST /facebook/connect
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
  "redirect_uri": "https://immoguinee.com/parametres/facebook/callback"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| redirect_uri | string | No | URL de redirection après OAuth (défaut: config) |

#### Response 200 OK

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://www.facebook.com/v18.0/dialog/oauth?client_id=123&redirect_uri=...&scope=pages_manage_posts,pages_read_engagement,public_profile&state=abc123",
    "state": "abc123"
  },
  "message": "facebook.connect_initiated"
}
```

#### Response 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "auth.unauthenticated"
  }
}
```

#### Response 409 Conflict

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CONNECTED",
    "message": "facebook.already_connected"
  }
}
```

---

### 2. OAuth Callback

Traite le callback OAuth de Meta après autorisation utilisateur.

```
GET /facebook/callback
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | Authorization code de Meta |
| state | string | Yes | State token pour validation CSRF |

#### Response 200 OK (Redirect)

Redirige vers l'URL frontend avec token temporaire:

```
302 Redirect to: https://immoguinee.com/parametres/facebook/callback?temp_token=xyz789
```

#### Response 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "facebook.invalid_state"
  }
}
```

#### Response 400 Bad Request (OAuth Error)

```json
{
  "success": false,
  "error": {
    "code": "OAUTH_FAILED",
    "message": "facebook.oauth_failed",
    "details": {
      "facebook_error": "access_denied"
    }
  }
}
```

---

### 3. List User's Pages

Récupère la liste des Pages Facebook administrées par l'utilisateur.

```
GET /facebook/pages
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| temp_token | string | Yes | Token temporaire du callback OAuth |

#### Response 200 OK

```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "123456789",
        "name": "Agence Immobilière Conakry",
        "category": "Real Estate",
        "picture_url": "https://graph.facebook.com/123456789/picture",
        "fan_count": 1250,
        "is_published": true
      },
      {
        "id": "987654321",
        "name": "Villas de Luxe Guinée",
        "category": "Real Estate Agent",
        "picture_url": "https://graph.facebook.com/987654321/picture",
        "fan_count": 3400,
        "is_published": true
      }
    ]
  },
  "message": "facebook.pages_retrieved"
}
```

#### Response 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TEMP_TOKEN",
    "message": "facebook.invalid_temp_token"
  }
}
```

#### Response 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NO_PAGES_FOUND",
    "message": "facebook.no_pages"
  }
}
```

---

### 4. Select Page for Auto-Publish

Sélectionne une Page Facebook et active/désactive la publication automatique.

```
POST /facebook/select-page
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
  "temp_token": "xyz789",
  "page_id": "123456789",
  "auto_publish_enabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| temp_token | string | Yes | Token temporaire du callback OAuth |
| page_id | string | Yes | ID de la Page Facebook sélectionnée |
| auto_publish_enabled | boolean | Yes | Activer la publication automatique |

#### Response 201 Created

```json
{
  "success": true,
  "data": {
    "connection": {
      "id": "uuid-connection-id",
      "page_id": "123456789",
      "page_name": "Agence Immobilière Conakry",
      "auto_publish_enabled": true,
      "connected_at": "2026-01-05T14:30:00Z"
    }
  },
  "message": "facebook.page_connected"
}
```

#### Response 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAGE_ID",
    "message": "facebook.invalid_page_id"
  }
}
```

#### Response 422 Unprocessable Entity

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "validation.failed",
    "details": {
      "page_id": ["facebook.page_id_required"],
      "auto_publish_enabled": ["facebook.auto_publish_required"]
    }
  }
}
```

---

### 5. Get Connection Status

Récupère le statut de la connexion Facebook de l'utilisateur.

```
GET /facebook/status
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |

#### Response 200 OK (Connected)

```json
{
  "success": true,
  "data": {
    "connected": true,
    "connection": {
      "id": "uuid-connection-id",
      "page_id": "123456789",
      "page_name": "Agence Immobilière Conakry",
      "page_picture_url": "https://graph.facebook.com/123456789/picture",
      "auto_publish_enabled": true,
      "connected_at": "2026-01-05T14:30:00Z",
      "token_expires_at": "2026-03-05T14:30:00Z",
      "posts_count": 15,
      "last_post_at": "2026-01-04T10:15:00Z"
    }
  },
  "message": "facebook.status_retrieved"
}
```

#### Response 200 OK (Not Connected)

```json
{
  "success": true,
  "data": {
    "connected": false,
    "connection": null
  },
  "message": "facebook.not_connected"
}
```

#### Response 200 OK (Token Expired)

```json
{
  "success": true,
  "data": {
    "connected": true,
    "connection": {
      "id": "uuid-connection-id",
      "page_id": "123456789",
      "page_name": "Agence Immobilière Conakry",
      "auto_publish_enabled": true,
      "connected_at": "2026-01-05T14:30:00Z",
      "token_expired": true
    }
  },
  "message": "facebook.token_expired"
}
```

---

### 6. Update Auto-Publish Setting

Met à jour le paramètre de publication automatique.

```
PATCH /facebook/auto-publish
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
  "auto_publish_enabled": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| auto_publish_enabled | boolean | Yes | Activer/désactiver la publication automatique |

#### Response 200 OK

```json
{
  "success": true,
  "data": {
    "auto_publish_enabled": false
  },
  "message": "facebook.auto_publish_updated"
}
```

#### Response 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_CONNECTED",
    "message": "facebook.not_connected"
  }
}
```

---

### 7. Disconnect Facebook Page

Déconnecte la Page Facebook et révoque les tokens.

```
DELETE /facebook/disconnect
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer {access_token} | Yes |
| Accept | application/json | Yes |

#### Response 200 OK

```json
{
  "success": true,
  "data": {
    "disconnected": true,
    "posts_preserved": true
  },
  "message": "facebook.disconnected"
}
```

**Note**: Les posts Facebook existants ne sont PAS supprimés lors de la déconnexion.

#### Response 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_CONNECTED",
    "message": "facebook.not_connected"
  }
}
```

---

### 8. Data Deletion Callback (Meta Platform Policy)

Endpoint requis par Meta pour traiter les demandes de suppression de données utilisateur.

```
POST /facebook/data-deletion
```

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body (from Meta)

```json
{
  "signed_request": "encoded_signed_request_from_meta"
}
```

#### Response 200 OK

```json
{
  "url": "https://immoguinee.com/data-deletion-status?id=abc123",
  "confirmation_code": "abc123"
}
```

**Note**: Cet endpoint supprime la connexion Facebook et tous les tokens associés pour l'utilisateur.

---

## Internal Webhooks (Backend → n8n)

Ces webhooks sont déclenchés automatiquement par le backend Rust vers n8n.

### Webhook: Listing Approved

Déclenché quand une annonce passe au statut "approved".

```
POST https://n8n.immoguinee.com/webhook/facebook-auto-publish
```

#### Payload

```json
{
  "event": "listing.approved",
  "timestamp": "2026-01-05T14:30:00Z",
  "data": {
    "listing_id": "uuid-listing-id",
    "user_id": "uuid-user-id",
    "title": "Appartement 3 chambres à Kaloum",
    "price": 5000000,
    "price_formatted": "5 000 000 GNF",
    "location": "Kaloum, Conakry",
    "property_type": "APPARTEMENT",
    "url": "https://immoguinee.com/annonces/uuid-listing-id",
    "primary_image_url": "https://storage.immoguinee.com/listings/uuid/photo1.jpg",
    "auto_publish_to_facebook": true
  }
}
```

### Webhook: Listing Status Changed

Déclenché quand une annonce est marquée comme louée ou vendue.

```
POST https://n8n.immoguinee.com/webhook/facebook-post-cleanup
```

#### Payload

```json
{
  "event": "listing.status_changed",
  "timestamp": "2026-01-05T16:00:00Z",
  "data": {
    "listing_id": "uuid-listing-id",
    "user_id": "uuid-user-id",
    "old_status": "active",
    "new_status": "rented",
    "facebook_post_id": "123456789_987654321"
  }
}
```

---

## Data Models

### FacebookPageConnection

```typescript
interface FacebookPageConnection {
  id: string;                    // UUID
  user_id: string;               // UUID FK → users
  page_id: string;               // Facebook Page ID
  page_name: string;             // Facebook Page name
  page_access_token: string;     // Encrypted (never exposed in API)
  token_expires_at: string;      // ISO 8601 datetime
  auto_publish_enabled: boolean;
  connected_at: string;          // ISO 8601 datetime
  created_at: string;            // ISO 8601 datetime
  updated_at: string;            // ISO 8601 datetime
}
```

### FacebookPost

```typescript
interface FacebookPost {
  id: string;                              // UUID
  listing_id: string;                      // UUID FK → listings
  facebook_page_connection_id: string;     // UUID FK → facebook_page_connections
  facebook_post_id: string;                // Facebook Post ID
  status: 'published' | 'deleted' | 'failed';
  published_at: string | null;             // ISO 8601 datetime
  deleted_at: string | null;               // ISO 8601 datetime
  error_message: string | null;            // i18n key if failed
  created_at: string;                      // ISO 8601 datetime
  updated_at: string;                      // ISO 8601 datetime
}
```

---

## Error Codes

| Code | HTTP Status | i18n Key | Description |
|------|-------------|----------|-------------|
| UNAUTHENTICATED | 401 | auth.unauthenticated | Token d'accès manquant ou invalide |
| ALREADY_CONNECTED | 409 | facebook.already_connected | Une Page est déjà connectée |
| NOT_CONNECTED | 404 | facebook.not_connected | Aucune Page connectée |
| INVALID_STATE | 400 | facebook.invalid_state | State token CSRF invalide |
| INVALID_TEMP_TOKEN | 400 | facebook.invalid_temp_token | Token temporaire expiré/invalide |
| INVALID_PAGE_ID | 400 | facebook.invalid_page_id | Page ID non trouvé dans les pages de l'utilisateur |
| OAUTH_FAILED | 400 | facebook.oauth_failed | Échec de l'autorisation OAuth |
| TOKEN_EXPIRED | 401 | facebook.token_expired | Token Facebook expiré |
| PERMISSION_REVOKED | 403 | facebook.permission_revoked | Permissions Facebook révoquées |
| RATE_LIMITED | 429 | facebook.rate_limited | Limite de taux Facebook atteinte |
| PUBLISH_FAILED | 500 | facebook.publish_failed | Échec de publication |
| DELETE_FAILED | 500 | facebook.delete_failed | Échec de suppression |
| NO_PAGES_FOUND | 404 | facebook.no_pages | Aucune Page administrée trouvée |

---

## i18n Keys

### French (fr)

```json
{
  "facebook": {
    "connect": "Connecter ma Page Facebook",
    "disconnect": "Déconnecter",
    "connecting": "Connexion en cours...",
    "connect_initiated": "Redirection vers Facebook...",
    "select_page": "Sélectionner une Page",
    "page_connected": "Page {name} connectée avec succès",
    "pages_retrieved": "Pages récupérées",
    "no_pages": "Aucune Page Facebook trouvée. Vous devez être administrateur d'une Page.",
    "auto_publish_checkbox": "Publier automatiquement sur ma Page Facebook",
    "auto_publish_description": "L'annonce sera publiée sur {page} avec le logo ImmoGuinée",
    "auto_publish_updated": "Paramètre de publication automatique mis à jour",
    "publish_success": "Annonce publiée sur Facebook",
    "publish_failed": "Échec de la publication Facebook",
    "delete_success": "Publication Facebook supprimée",
    "delete_failed": "Échec de suppression du post Facebook",
    "token_expired": "Votre connexion Facebook a expiré. Veuillez vous reconnecter.",
    "permission_revoked": "Permissions Facebook révoquées. Veuillez vous reconnecter.",
    "connection_required": "Connectez votre Page Facebook pour activer la publication automatique",
    "already_connected": "Une Page Facebook est déjà connectée",
    "not_connected": "Aucune Page Facebook connectée",
    "disconnected": "Page Facebook déconnectée",
    "invalid_state": "Session expirée. Veuillez réessayer.",
    "invalid_temp_token": "Token expiré. Veuillez reconnecter votre Page.",
    "invalid_page_id": "Page non trouvée. Veuillez sélectionner une Page valide.",
    "oauth_failed": "Autorisation Facebook échouée",
    "rate_limited": "Trop de requêtes. Veuillez réessayer dans quelques minutes.",
    "status_retrieved": "Statut de connexion récupéré",
    "post_template": "🏠 {title}\n\n💰 Prix: {price}\n📍 {location}\n🏷️ {property_type}\n\n👉 Voir l'annonce: {url}\n\n#ImmoGuinée #Immobilier #Guinée"
  }
}
```

### English (en)

```json
{
  "facebook": {
    "connect": "Connect my Facebook Page",
    "disconnect": "Disconnect",
    "connecting": "Connecting...",
    "connect_initiated": "Redirecting to Facebook...",
    "select_page": "Select a Page",
    "page_connected": "Page {name} connected successfully",
    "pages_retrieved": "Pages retrieved",
    "no_pages": "No Facebook Pages found. You must be an administrator of a Page.",
    "auto_publish_checkbox": "Automatically publish to my Facebook Page",
    "auto_publish_description": "The listing will be published on {page} with ImmoGuinée logo",
    "auto_publish_updated": "Auto-publish setting updated",
    "publish_success": "Listing published to Facebook",
    "publish_failed": "Facebook publish failed",
    "delete_success": "Facebook post deleted",
    "delete_failed": "Failed to delete Facebook post",
    "token_expired": "Your Facebook connection has expired. Please reconnect.",
    "permission_revoked": "Facebook permissions revoked. Please reconnect.",
    "connection_required": "Connect your Facebook Page to enable auto-publish",
    "already_connected": "A Facebook Page is already connected",
    "not_connected": "No Facebook Page connected",
    "disconnected": "Facebook Page disconnected",
    "invalid_state": "Session expired. Please try again.",
    "invalid_temp_token": "Token expired. Please reconnect your Page.",
    "invalid_page_id": "Page not found. Please select a valid Page.",
    "oauth_failed": "Facebook authorization failed",
    "rate_limited": "Too many requests. Please try again in a few minutes.",
    "status_retrieved": "Connection status retrieved",
    "post_template": "🏠 {title}\n\n💰 Price: {price}\n📍 {location}\n🏷️ {property_type}\n\n👉 View listing: {url}\n\n#ImmoGuinée #RealEstate #Guinea"
  }
}
```

---

## Security Considerations

### Token Storage

- Tous les `page_access_token` sont chiffrés via **Vault Transit** (AES-256, la clé ne quitte jamais Vault)
- Les tokens ne sont JAMAIS:
  - Retournés dans les réponses API
  - Loggés dans les fichiers de log
  - Exposés dans les messages d'erreur

### Rate Limiting

| Endpoint | Limite | Window |
|----------|--------|--------|
| POST /facebook/connect | 5 | 1 minute |
| GET /facebook/pages | 10 | 1 minute |
| POST /facebook/select-page | 5 | 1 minute |
| GET /facebook/status | 30 | 1 minute |
| DELETE /facebook/disconnect | 3 | 1 minute |

### Meta Platform Compliance

- Data Deletion Callback obligatoire (`POST /facebook/data-deletion`)
- Privacy Policy mise à jour avec disclosure Facebook
- Terms of Service mis à jour avec termes de publication automatique
- App Review requis pour `pages_manage_posts` et `pages_read_engagement`

---

## Watermark Specifications

| Property | Value |
|----------|-------|
| Position | Bottom-right corner |
| Size | 10% of image width |
| Opacity | 70% |
| Margin | 20px from edges |
| Format | PNG with transparency |
| Source | `storage/app/watermarks/immoguinee-logo.png` |

**Important**: Les images originales ne sont JAMAIS modifiées. Le filigrane est appliqué sur une copie temporaire qui est supprimée après upload vers Facebook.

---

## Flow Diagrams

### OAuth Connection Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Frontend│     │ Backend │     │  Meta   │     │  n8n    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ POST /connect │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │ auth_url      │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ Redirect to FB│               │               │
     │───────────────────────────────>               │
     │               │               │               │
     │               │ Callback      │               │
     │               │<──────────────│               │
     │               │               │               │
     │ GET /pages    │               │               │
     │──────────────>│               │               │
     │               │ GET /me/accounts              │
     │               │──────────────>│               │
     │               │ pages list    │               │
     │               │<──────────────│               │
     │ pages list    │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ POST /select  │               │               │
     │──────────────>│               │               │
     │               │ Store encrypted token         │
     │ success       │               │               │
     │<──────────────│               │               │
     │               │               │               │
```

### Auto-Publish Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Backend │     │  n8n    │     │Watermark│     │  Meta   │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ Listing approved              │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ Check FB connection           │
     │               │──────────────>│               │
     │               │               │               │
     │               │ Apply watermark               │
     │               │──────────────>│               │
     │               │ temp image path               │
     │               │<──────────────│               │
     │               │               │               │
     │               │ POST /{page-id}/feed          │
     │               │───────────────────────────────>
     │               │ facebook_post_id              │
     │               │<───────────────────────────────
     │               │               │               │
     │               │ Store post_id │               │
     │               │──────────────>│               │
     │               │               │               │
     │               │ Cleanup temp  │               │
     │               │──────────────>│               │
     │               │               │               │
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-05 | Initial version |

---

**End of Contract**
