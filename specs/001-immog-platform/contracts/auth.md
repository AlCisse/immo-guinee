# API Contract: Authentication & User Management (Rust / Axum)

**Domain**: Authentication, User Registration, 2FA, Profile
**Base URL**: `/api/auth`
**Version**: 1.0
**Backend**: Rust (Axum) — JWT access/refresh, bcrypt, TOTP 2FA
**Status**: ✅ Implemented (`src/domain/auth/`)

---

## Overview

Phone + password registration and login, TOTP two-factor authentication (RFC 6238),
profile and notification preferences. Tokens are stateless JWTs; logout revokes a
token via a Redis deny-list.

**Key requirements**:
- FR-002 — auto-assign Bronze badge on registration
- FR-003 — phone + password (min 8, ≥1 uppercase, ≥1 digit, ≥1 special)
- FR-005 — manage 4 notification channels (push/sms/email/whatsapp, WhatsApp opt-in)
- FR-045 — TOTP 2FA (admins, and sensitive actions)

**Auth method**: `Authorization: Bearer {access_token}` (JWT). Handlers resolve the
caller via the `AuthUser` extractor (verifies signature, expiry, and a Redis
deny-list of revoked tokens).

> **Note (design)**: registration is password-based and delivers a 6-digit phone
> **verification OTP over WhatsApp** (Evolution API); the client confirms it via
> `POST /auth/otp/verify` to obtain tokens (register → OTP → tokens). Password reset
> (tasks T083a/b) is still **planned**. A dedicated `/refresh` endpoint is also planned
> (login already issues a refresh token).

---

## Axum Routes (`domain::auth::routes`)

```rust
Router::new()
    .route("/auth/register", post(register))
    .route("/auth/login", post(login))
    .route("/auth/otp", post(otp))                   // TOTP 2nd factor (login)
    .route("/auth/otp/send", post(otp_send))         // (re)send phone OTP (WhatsApp)
    .route("/auth/otp/verify", post(otp_verify))     // verify phone OTP → tokens
    .route("/auth/me", get(me).patch(update_me))
    .route("/auth/logout", post(logout))
// mounted under /api
```

Envelope: success → `{ "success": true, "data": ... }`; error → see "Error Format".

---

## Endpoints

### 1. Register — `POST /api/auth/register`

Creates an account (Bronze badge, statut ACTIF, NON_VERIFIE). Validated by the
`ValidatedJson<RegisterRequest>` extractor; rate-limited per phone.

**Request**:
```json
{
  "telephone": "+224622123456",
  "nom_complet": "Mamadou Diallo",
  "email": "mamadou@example.com",
  "mot_de_passe": "SecurePass123!",
  "type_compte": "PARTICULIER"
}
```

**Validation** (`RegisterRequest`): `telephone` 8–20; `email` optional, RFC email;
`mot_de_passe` length 8–72 **+ complexity** (uppercase/digit/special, FR-003);
`nom_complet` 2–255; `type_compte` ∈ {PARTICULIER, AGENCE, DIASPORA} (default PARTICULIER).

**Response** (200): `data` = the public user.
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "telephone": "+224622123456",
    "email": "mamadou@example.com",
    "nom_complet": "Mamadou Diallo",
    "bio": null,
    "type_compte": "PARTICULIER",
    "badge_certification": "BRONZE",
    "statut_verification": "NON_VERIFIE",
    "statut_compte": "ACTIF",
    "preferences_notification": { "push": true, "sms": true, "email": true, "whatsapp": false },
    "date_inscription": "2025-01-28T14:30:00Z"
  }
}
```

**Handler** (`src/domain/auth/handlers.rs`):
```rust
async fn register(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<RegisterRequest>,
) -> AppResult<Json<Envelope<UserPublic>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;
    if user::Entity::find().filter(user::Column::Telephone.eq(&req.telephone)).one(&state.db).await?.is_some() {
        return Err(AppError::Conflict("Téléphone déjà enregistré".into()));
    }
    let hash = bcrypt::hash(req.mot_de_passe.as_bytes(), 12)?;
    let model = user::ActiveModel { /* id, telephone, hash, nom_complet, email, type_compte, .. */ }
        .insert(&state.db).await?;
    Ok(Json(Envelope { success: true, data: UserPublic::from(model) }))
}
```

**Errors**: 400 (validation/weak password), 409 (phone already registered), 429 (rate limit).

---

### 2. Login — `POST /api/auth/login`

Verifies phone + password (bcrypt), checks the account is ACTIF. If 2FA is enabled,
returns a `requires_2fa` marker; otherwise returns a JWT pair.

**Request**:
```json
{ "telephone": "+224622123456", "mot_de_passe": "SecurePass123!" }
```

**Response — no 2FA** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

**Response — 2FA required** (200):
```json
{ "success": true, "data": { "requires_2fa": true, "telephone": "+224622123456" } }
```

**Handler**:
```rust
async fn login(State(state), ValidatedJson(req): ValidatedJson<LoginRequest>) -> AppResult<Json<Envelope<LoginResponse>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;
    let user = user::Entity::find().filter(user::Column::Telephone.eq(&req.telephone)).one(&state.db).await?
        .ok_or(AppError::Unauthorized)?;                       // generic 401 (no account enumeration)
    if !bcrypt::verify(req.mot_de_passe.as_bytes(), &user.mot_de_passe_hash)? { return Err(AppError::Unauthorized); }
    if !matches!(user.statut_compte, StatutCompte::Actif) { return Err(AppError::Forbidden("Compte suspendu ou banni".into())); }
    if user.two_factor_secret.is_some() { /* LoginResponse::Requires2Fa */ }
    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, role_for(user.type_compte))?;
    // LoginResponse::Tokens
}
```

**Errors**: 401 (invalid credentials), 403 (suspended/banned), 429 (brute-force limit 5/min).

---

### 3. Two-Factor (TOTP) — `POST /api/auth/otp`

Completes login when 2FA is enabled: verifies a 6-digit TOTP against the user's
stored base32 secret, then issues the JWT pair (FR-045).

**Request**:
```json
{ "telephone": "+224622123456", "code": "123456" }
```

**Response** (200): same token pair as login.

**Handler**:
```rust
async fn otp(State(state), ValidatedJson(req): ValidatedJson<OtpRequest>) -> AppResult<Json<Envelope<LoginSuccess>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;
    let user = user::Entity::find().filter(user::Column::Telephone.eq(&req.telephone)).one(&state.db).await?
        .ok_or(AppError::Unauthorized)?;
    let secret = user.two_factor_secret.as_ref().ok_or_else(|| AppError::Forbidden("2FA non activée".into()))?;
    if !auth::totp::verify(secret, &user.telephone, &req.code)? { return Err(AppError::Validation("Code TOTP incorrect".into())); }
    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, role_for(user.type_compte))?;
    // ...
}
```

**Errors**: 400 (bad code), 401 (unknown phone), 403 (2FA not enabled), 429.

---

### 3b. Phone OTP — send `POST /api/auth/otp/send`, verify `POST /api/auth/otp/verify`

Phone-verification OTP delivered over **WhatsApp** (Evolution API). `register`
auto-sends the first code; `/otp/send` resends it; `/otp/verify` confirms it and issues
the JWT pair (register → OTP → tokens). Distinct from `/auth/otp` (TOTP login 2FA).

Delivery is handled by `services::notify` (bridges `services::otp` + `services::whatsapp`).
When Evolution API is not configured (dev/tests), the code is **logged** instead of sent,
so the flow runs without a live WhatsApp instance.

**Anti-fraud** (`services::otp`, FR-001/FR-029): code valid 5 min; 60 s resend throttle
(429); 3 wrong tries → 5 min block (429).

**`POST /auth/otp/send`** — request/resend a code.
```json
{ "telephone": "+224622123456" }
```
Response (200): `{ "success": true, "data": { "message": "Si ce numéro est enregistré, un code a été envoyé par WhatsApp." } }`
(identical whether or not the number is registered — anti-enumeration; a code is only
issued/sent for an existing account).

**`POST /auth/otp/verify`** — confirm a code, receive tokens.
```json
{ "telephone": "+224622123456", "code": "123456" }
```
Response (200): the same token pair as login.

```rust
async fn otp_verify(State(state), ValidatedJson(req): ValidatedJson<OtpRequest>)
    -> AppResult<Json<Envelope<LoginSuccess>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;
    services::otp::verify(&state.redis, &req.telephone, &req.code).await?;   // 400 / 429 (block)
    let user = /* find by telephone */.ok_or(AppError::Unauthorized)?;
    if !matches!(user.statut_compte, StatutCompte::Actif) { return Err(AppError::Forbidden(..)); }
    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, role_for(user.type_compte))?;
    // ...
}
```

**Errors**: 400 (wrong/expired code), 401 (unknown phone on verify), 403 (suspended),
429 (resend throttle or 3-try block).

---

### 4. Current profile — `GET /api/auth/me`

Requires a valid access token (`AuthUser`). Returns the caller's public profile.

**Response** (200): same `UserPublic` shape as register (incl. `bio`,
`preferences_notification`).

```rust
async fn me(auth: AuthUser, State(state)) -> AppResult<Json<Envelope<UserPublic>>> {
    let user = user::Entity::find_by_id(auth.id).one(&state.db).await?.ok_or(AppError::Unauthorized)?;
    Ok(Json(Envelope { success: true, data: UserPublic::from(user) }))
}
```

**Errors**: 401 (missing/invalid/revoked token).

---

### 5. Update profile & preferences — `PATCH /api/auth/me`

Updates `nom_complet` / `bio` / `email` and merges partial notification toggles
(FR-005). All fields optional.

**Request**:
```json
{
  "nom_complet": "Mamadou Diallo (Agence)",
  "bio": "Nouvelle bio...",
  "email": "newemail@example.com",
  "notifications": { "sms": false, "whatsapp": true }
}
```

**Response** (200): updated `UserPublic`. Toggles not present keep their current value.

```rust
async fn update_me(auth: AuthUser, State(state), ValidatedJson(req): ValidatedJson<UpdateProfileRequest>)
    -> AppResult<Json<Envelope<UserPublic>>> {
    let user = user::Entity::find_by_id(auth.id).one(&state.db).await?.ok_or(AppError::Unauthorized)?;
    // merge req.notifications into user.preferences_notification (JSONB), set changed fields, update
}
```

**Errors**: 400 (invalid email/length), 401.

---

### 6. Logout — `POST /api/auth/logout`

Revokes the current access token by adding its `jti` to a Redis deny-list (TTL =
the token's remaining lifetime). Subsequent requests with that token get 401.

**Response** (200):
```json
{ "success": true, "data": { "message": "Déconnecté" } }
```

```rust
async fn logout(auth: AuthUser, State(state)) -> AppResult<Json<Envelope<serde_json::Value>>> {
    let ttl = auth.exp.saturating_sub(jsonwebtoken::get_current_timestamp()).max(1);
    state.redis.clone().set_ex(revoked_key(auth.jti), 1, ttl).await?;
    // ...
}
```

---

## Rate Limiting (native Redis)

| Endpoint | Limit | Window | Identifier | Preset |
|---|---|---|---|---|
| register / login / otp | 5 | 1 min | phone | `limit_login` |
| authenticated (me, PATCH me, logout) | 60 | 1 min | user id | `limit_user` |

`limit_login` also guards brute-force on login/2FA. See `middleware::rate_limit`.

---

## Security

1. **Passwords**: bcrypt (cost 12); complexity enforced at validation (FR-003).
2. **2FA**: TOTP RFC 6238 (`totp-rs`); secret stored per user (`two_factor_secret`).
3. **JWT**: HS256, access 24h / refresh 7d; secret from Vault (env in dev). `jti`
   revocation via Redis deny-list checked by `AuthUser`.
4. **HTTPS only** in production (FR-091) via Traefik + HSTS security-headers layer.
5. **CSRF**: stateful (cookie) flows use tower-sessions; the token API is stateless.
6. **Input sanitization**: `validator` + typed extractors; SQLx/SeaORM parameterize
   all queries (no SQL injection).

---

## Error Format

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Authentification requise", "details": null } }
```

Produced by `AppError` (`src/error.rs`). Relevant codes: `VALIDATION` (400),
`UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409),
`RATE_LIMITED` (429, + `Retry-After`), `INTERNAL`/`DB_ERROR`/`CACHE_ERROR` (500),
`EXTERNAL` (502).

---

## Testing

Covered by unit tests (`domain::auth::dto` — validation, password strength, role
mapping) and an end-to-end integration test (`tests/listings_e2e.rs`) that exercises
`register → login → me → PATCH me → logout` against Postgres + Redis (testcontainers):

```rust
#[tokio::test]
async fn me_and_logout_revoke_token() {
    let app = setup().await;
    app.server.post("/api/auth/register").json(&json!({ /* ... */ })).await.assert_status_ok();
    let login = app.server.post("/api/auth/login").json(&json!({ /* ... */ })).await;
    let token = login.json::<Value>()["data"]["access_token"].as_str().unwrap().to_owned();
    // /me ok → logout → /me now 401 (revoked)
}
```

**Checklist**:
- [x] Register with valid Guinea phone + strong password → Bronze badge
- [x] Login (correct creds) returns JWT; wrong creds → 401
- [x] Suspended account → 403
- [x] TOTP 2FA path issues tokens
- [x] `me` returns profile; logout revokes token (deny-list)
- [x] `PATCH /me` updates profile + notification toggles
- [ ] Password reset via OTP SMS (planned — T083a/b)
- [ ] Dedicated `/refresh` endpoint (planned)

---

**Contract Status**: ✅ Implemented (Rust / Axum, JWT + TOTP)
**Next Contract**: `listings.md` (Listings CRUD and Search)
