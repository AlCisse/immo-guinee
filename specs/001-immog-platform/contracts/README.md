# API Contracts Directory — Rust / Axum

This directory contains the REST API specification for the ImmoGuinée platform. The
backend is **Rust (Axum + Tokio, SeaORM)**. All routes are mounted under `/api`.

## Contracts Overview

| Contract | Domain | Key User Stories | Status |
|----------|--------|------------------|--------|
| [auth.md](./auth.md) | Authentication & User Management | Registration, Login, OTP/2FA | ✅ Implemented (JWT) |
| [listings.md](./listings.md) | Listings CRUD & Search | US1: Publish Listing | ✅ Implemented (SeaORM + Postgres search) |
| [payments.md](./payments.md) | Payments, Escrow, Commissions | **US4: Commission on Caution Day** | ⏳ Planned (apalis jobs) |
| [contracts.md](./contracts.md) | Contract Generation & Signatures | US2: Contract Gen, US3: E-Signatures | ⏳ Planned (headless-chrome PDF) |
| messaging.md | Real-Time Messaging | US6: Secure Messaging | 📝 See Below (Axum WS) |
| certifications.md | Certification Documents | US5: Certification Program | 📝 See Below |
| admin.md | Admin Panel Operations | Moderation, Analytics, Disputes | 📝 See Below |

---

## Quick Reference: Additional Endpoints

### Messaging (Real-Time via Axum WebSocket, pusher-compat)

The backend broadcasts events over an Axum WebSocket endpoint (Pusher-compatible),
backed by Redis pub/sub so events fan out across replicas. The Next.js frontend
keeps its existing `laravel-echo` / `socket.io` client — it now points at the Axum
WS endpoint.

**Backend (domain events → WS)**:
```rust
// domain::messaging::events
broadcast(NewMessage { conversation_id, message });
broadcast(TypingIndicator { conversation_id, user_id });
broadcast(MessageRead { message_id });
```

**Frontend client** (unchanged, targets Axum WS):
```typescript
import Echo from 'laravel-echo';
window.Echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_WS_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_WS_HOST, // Axum WS (pusher-compat)
    wsPort: 8000,
    forceTLS: false,
    auth: { headers: { Authorization: `Bearer ${accessToken}` } },
});
window.Echo.private(`conversation.${conversationId}`)
    .listen('NewMessage', (e) => console.log('New message:', e.message));
```

**REST endpoints**:
- `GET /api/messaging/conversations` — list conversations
- `GET /api/messaging/{id}/messages` — get messages (pagination)
- `POST /api/messaging/{id}/messages` — send message (also the fallback if WS fails)
- `POST /api/messaging/{id}/report` — report inappropriate message (FR-064)

**Axum router** (`domain::messaging`):
```rust
Router::new()
    .route("/messaging/conversations", get(conversations))
    .route("/messaging/{id}/messages", get(messages).post(send_message))
    .route("/messaging/{id}/report", post(report_message))
// mounted under /api; handlers take the `AuthUser` extractor
```

**Key requirements**: FR-059 (text/vocal/photo), FR-060 (phone masking), FR-061 (4-channel notifications: Push/SMS/Email/WhatsApp), FR-063 (history), FR-064 (reporting), FR-065 (fraud detection), FR-066 (anti-spam).

---

### Certifications

**Endpoints**:
- `POST /api/certifications/upload` — upload CNI or titre foncier (FR-054)
- `GET /api/certifications/me` — my certification status and progress (FR-057)
- `POST /api/certifications/{id}/verify` — admin verifies a document (FR-054)

**Axum router** (`domain::certifications`, `AuthUser` + RBAC guard for admin):
```rust
Router::new()
    .route("/certifications/upload", post(upload))
    .route("/certifications/me", get(my))
    .route("/certifications/{id}/verify", post(verify)) // require_permission(ManageCertifications)
```

**Badge progression** (FR-053): Bronze 🥉 (default) → Argent 🥈 (1 transaction + CNI verified) → Or 🥇 (5+ transactions + titre foncier + avg ≥ 4) → Diamant 💎 (20+ transactions + avg ≥ 4.5 + zero disputes).

**Advantages** (FR-056): Argent = priority messaging; Or = −10% commission + "Trusted Seller"; Diamant = −20% commission + priority WhatsApp support + homepage rotation.

---

### Admin Panel

**Endpoints**:
- `GET /api/admin/analytics` — dashboard KPIs (15 metrics, FR-084)
- `GET /api/admin/moderation/listings` — moderation queue (FR-081)
- `PATCH /api/admin/moderation/listings/{id}` — suspend/approve listing (FR-082)
- `GET /api/admin/users` — user management (FR-083)
- `PATCH /api/admin/users/{id}` — suspend/ban/downgrade user (FR-083)
- `GET /api/admin/disputes` — dispute mediation queue (FR-073)
- `PATCH /api/admin/disputes/{id}/assign` — assign mediator (FR-073)
- `PATCH /api/admin/disputes/{id}/resolve` — record mediation result (FR-074)
- `GET /api/admin/logs` — audit logs (FR-085)

**Axum router** (`domain::admin`, all guarded by the native RBAC extractor):
```rust
Router::new()
    .route("/admin/analytics", get(analytics))              // require_permission(ViewAnalytics)
    .route("/admin/moderation/listings", get(moderation_queue))
    .route("/admin/moderation/listings/{id}", patch(moderate_listing))
    .route("/admin/users", get(users))
    .route("/admin/users/{id}", patch(manage_user))         // require_permission(ManageUsers)
    .route("/admin/disputes", get(disputes))
    .route("/admin/disputes/{id}/assign", patch(assign_mediator))
    .route("/admin/disputes/{id}/resolve", patch(resolve_dispute))
    .route("/admin/logs", get(audit_logs))                  // require_permission(ViewAnalytics)
```

**Analytics KPIs** (FR-084): (1) total listings, (2) total/active users, (3) transactions completed, (4) commission revenue, (5) conversion rate, (6) avg time to rental, (7) user satisfaction, (8) dispute rate, (9) mediation success rate, (10) geographic distribution, (11) property-type distribution, (12–14) monthly trends (listings/users/revenue), (15) top 10 landlords.

---

## Authentication Pattern (JWT)

All authenticated endpoints require a JWT **access token** in the header:
```
Authorization: Bearer {access_token}
```

Handlers request the caller via the `AuthUser` extractor (verifies the JWT signature,
expiry, and a Redis deny-list for revoked/logged-out tokens):
```rust
async fn handler(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<...>> {
    let user_id = auth.id;                 // Uuid
    auth.require_permission(Permission::ManageListings)?; // RBAC (staff only)
    // ...
}
```

Tokens: access (24h) + refresh (7d), HS256 over a secret loaded from Vault (env in dev).
`POST /api/auth/logout` revokes the current token via a Redis deny-list.

---

## Error Response Format

All endpoints use a consistent envelope produced by `AppError` (`src/error.rs`):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION",
    "message": "Message lisible en français",
    "details": { "field": "erreur" }
  }
}
```

Success responses use `{ "success": true, "data": ... }`.

| `AppError` variant | HTTP | `code` |
|---|---|---|
| `Validation(msg)` | 400 | `VALIDATION` |
| `Unauthorized` | 401 | `UNAUTHORIZED` |
| `Forbidden(msg)` | 403 | `FORBIDDEN` |
| `NotFound` | 404 | `NOT_FOUND` |
| `Conflict(msg)` | 409 | `CONFLICT` |
| `RateLimited { retry_after_secs }` | 429 | `RATE_LIMITED` (+ `Retry-After` header) |
| `Database` / `Cache` / `Internal` | 500 | `DB_ERROR` / `CACHE_ERROR` / `INTERNAL` |
| `External` (reqwest) | 502 | `EXTERNAL` |

---

## Rate Limiting (native Redis, fixed window)

Implemented in `middleware::rate_limit` (no external crate). Handlers call the preset
that fits the endpoint; exceeding a limit yields `429` with a `Retry-After` header.

| Endpoint type | Limit | Window | Identifier | Preset |
|---|---|---|---|---|
| Public (search, listing detail) | 100 req/min | 1 min | IP | `limit_public_ip` |
| Authenticated (CRUD) | 60 req/min | 1 min | user id | `limit_user` |
| Payment | 10 req/hour | 1 hour | user id | `limit_payment` |
| Login / OTP (brute-force) | 5 req/min | 1 min | phone/IP | `limit_login` |

```rust
rate_limit::limit_public_ip(&state.redis, ip).await?;
rate_limit::limit_user(&state.redis, auth.id).await?;
```

---

## Real-Time Configuration (Axum WebSocket)

Broadcasting is served by the backend itself (no separate Echo server): an Axum WS
route (`/api/ws`, pusher-compatible) backed by Redis pub/sub. The frontend connects
with its existing pusher-protocol client. No Node.js broadcasting process to run.

---

## Development Workflow

1. **Start dependencies** (Postgres + Redis + MinIO) via Docker Compose.
2. **Apply migrations** (schema source of truth):
   ```bash
   cargo run --bin immog-migrate -- up
   ```
3. **Run the API server**:
   ```bash
   cargo run          # immog-backend on 0.0.0.0:8000
   ```
4. **Test an endpoint**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"telephone":"+224622123456","nom_complet":"Test User","mot_de_passe":"Test123!","type_compte":"PARTICULIER"}'
   ```
5. **Run tests**:
   ```bash
   cargo test                     # unit + integration (testcontainers)
   cargo test --test listings_e2e # a specific integration suite
   ```

---

## API Versioning Strategy

**Phase 1** (MVP): no versioning, rapid iteration (routes under `/api`).

**Phase 2** (stable): version via URL prefix using Axum nesting:
```rust
Router::new()
    .nest("/api/v1", v1_router)
    .nest("/api/v2", v2_router)
```

**Deprecation policy**: v1 supported 6 months after v2; consumers warned 3 months
prior; response headers `X-API-Version`, `X-API-Deprecated`, `X-API-Sunset`.

---

**Status**: US1 (auth + listings) implemented; other domains planned.

**Coverage**:
- ✅ Authentication (JWT: register / login / otp / me / logout / PATCH me)
- ✅ Listings (search + detail + create + photos→S3 + edit + soft-delete)
- ⏳ Payments (escrow, Orange/MTN MoMo, commission) — apalis jobs
- ⏳ Contracts (generation + e-signature) — headless-chrome PDF
- ⏳ Messaging (Axum WebSocket + REST fallback)
- ⏳ Certifications (upload + verify + badge progression)
- ⏳ Admin (analytics + moderation + disputes)

**Total endpoints**: ~52 REST endpoints + Axum WebSocket real-time events.

**Next step**: keep `quickstart.md` and `research.md` aligned with the Rust stack.
