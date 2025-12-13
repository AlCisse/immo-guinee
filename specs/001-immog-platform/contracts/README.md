# API Contracts Directory - Laravel 11

This directory contains the complete REST API specification for ImmoGuinée platform using **Laravel 11** backend.

## Contracts Overview

| Contract | Domain | Key User Stories | Status |
|----------|--------|------------------|--------|
| [auth.md](./auth.md) | Authentication & User Management | Registration, Login, OTP | ✅ Complete (Laravel + Sanctum) |
| [listings.md](./listings.md) | Listings CRUD & Search | US1: Publish Listing | ✅ Complete (Laravel + Meilisearch) |
| [payments.md](./payments.md) | Payments, Escrow, Commissions | **US4: Commission on Caution Day** | ✅ Complete (Laravel + Queue) |
| [contracts.md](./contracts.md) | Contract Generation & Signatures | US2: Contract Gen, US3: E-Signatures | ✅ Complete (Laravel + PDF + Blade) |
| messaging.md | Real-Time Messaging | US6: Secure Messaging | 📝 See Below |
| certifications.md | Certification Documents | US5: Certification Program | 📝 See Below |
| admin.md | Admin Panel Operations | Moderation, Analytics, Disputes | 📝 See Below |

---

## Quick Reference: Additional Endpoints

### Messaging (Real-Time via Laravel Echo + Socket.IO)

**Laravel Broadcasting Events** (`app/Events/*`):
```php
// Broadcast new message
broadcast(new NewMessageEvent($message))->toOthers();

// Broadcast typing indicator
broadcast(new TypingIndicatorEvent($conversationId, $userId));

// Broadcast message read status
broadcast(new MessageReadEvent($messageId));
```

**Laravel Echo Client** (Next.js frontend):
```typescript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER,
    forceTLS: false,
    wsHost: process.env.NEXT_PUBLIC_ECHO_HOST,
    wsPort: 6001,
    auth: {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
});

// Listen to private channel
window.Echo.private(`conversation.${conversationId}`)
    .listen('NewMessageEvent', (e) => {
        console.log('New message:', e.message);
    });
```

**REST Endpoints**:
- `GET /api/messaging/conversations` - List conversations
- `GET /api/messaging/:id/messages` - Get messages (pagination)
- `POST /api/messaging/:id/messages` - Send message (fallback if Socket.IO fails)
- `POST /api/messaging/:id/report` - Report inappropriate message (FR-064)

**Laravel Routes**:
```php
Route::middleware('auth:sanctum')->prefix('messaging')->group(function () {
    Route::get('/conversations', [MessagingController::class, 'conversations']);
    Route::get('/{id}/messages', [MessagingController::class, 'messages']);
    Route::post('/{id}/messages', [MessagingController::class, 'sendMessage']);
    Route::post('/{id}/report', [MessagingController::class, 'reportMessage']);
});
```

**Key Requirements**: FR-059 (text/vocal/photo messages), FR-060 (phone masking), FR-061 (4-channel notifications), FR-063 (message history), FR-064 (reporting), FR-065 (fraud detection), FR-066 (anti-spam)

---

### Certifications

**Endpoints**:
- `POST /api/certifications/upload` - Upload CNI or titre foncier (FR-054)
- `GET /api/certifications/me` - Get my certification status and progress (FR-057)
- `POST /api/certifications/:id/verify` - Admin verifies document (FR-054)

**Laravel Routes**:
```php
Route::middleware('auth:sanctum')->prefix('certifications')->group(function () {
    Route::post('/upload', [CertificationController::class, 'upload']);
    Route::get('/me', [CertificationController::class, 'my']);
    Route::post('/{id}/verify', [CertificationController::class, 'verify'])->middleware('admin');
});
```

**Badge Progression** (FR-053):
- **Bronze** 🥉: Default (registration complete)
- **Argent** 🥈: 1 transaction + CNI verified
- **Or** 🥇: 5+ transactions + titre foncier verified + avg rating ≥ 4 stars
- **Diamant** 💎: 20+ transactions + avg rating ≥ 4.5 stars + zero disputes

**Advantages** (FR-056):
- **Argent**: Priority messaging (⭐ badge on messages)
- **Or**: -10% commission (50% → 40%) + "Trusted Seller" badge
- **Diamant**: -20% commission (50% → 30%) + Priority WhatsApp support + Homepage featured rotation

---

### Admin Panel

**Endpoints**:
- `GET /api/admin/analytics` - Dashboard KPIs (15 metrics - FR-084)
- `GET /api/admin/moderation/listings` - Moderation queue (FR-081)
- `PATCH /api/admin/moderation/listings/:id` - Suspend/approve listing (FR-082)
- `GET /api/admin/users` - User management (FR-083)
- `PATCH /api/admin/users/:id` - Suspend/ban/downgrade user (FR-083)
- `GET /api/admin/disputes` - Dispute mediation queue (FR-073)
- `PATCH /api/admin/disputes/:id/assign` - Assign mediator (FR-073)
- `PATCH /api/admin/disputes/:id/resolve` - Record mediation result (FR-074)
- `GET /api/admin/logs` - Audit logs (FR-085)

**Laravel Routes**:
```php
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/analytics', [AdminController::class, 'analytics']);
    Route::get('/moderation/listings', [AdminController::class, 'moderationQueue']);
    Route::patch('/moderation/listings/{id}', [AdminController::class, 'moderateListing']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::patch('/users/{id}', [AdminController::class, 'manageUser']);
    Route::get('/disputes', [AdminController::class, 'disputes']);
    Route::patch('/disputes/{id}/assign', [AdminController::class, 'assignMediator']);
    Route::patch('/disputes/{id}/resolve', [AdminController::class, 'resolveDis pute']);
    Route::get('/logs', [AdminController::class, 'auditLogs']);
});
```

**Analytics KPIs** (FR-084):
1. Total listings (active + expired)
2. Total users (all + active last 30 days)
3. Transactions completed (total + this month)
4. Commission revenue (total + this month + annual projection)
5. Conversion rate (visits → rentals)
6. Avg time to rental (days from publication to contract signature)
7. User satisfaction (avg rating of all reviews)
8. Dispute rate (disputes / transactions × 100)
9. Mediation success rate (resolved amicably / total disputes × 100)
10. Geographic distribution (listings by quartier - pie chart)
11. Property type distribution (bar chart)
12. Monthly listing trend (line chart)
13. Monthly user growth (line chart)
14. Monthly revenue trend (line chart)
15. Top 10 landlords (by transaction count)

---

## Authentication Pattern (Laravel Sanctum)

All authenticated endpoints require Sanctum token in header:
```
Authorization: Bearer {sanctum_token}
```

**Laravel Middleware**:
```php
Route::middleware('auth:sanctum')->group(function () {
    // Protected routes
});
```

**Getting Authenticated User**:
```php
public function index(Request $request)
{
    $user = $request->user(); // Authenticated User model
    // ...
}
```

---

## Error Response Format

All endpoints use consistent Laravel error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message in French",
    "details": {
      "field": "validation_error"
    }
  }
}
```

**Laravel Exception Handler** (`app/Exceptions/Handler.php`):
```php
public function render($request, Throwable $exception)
{
    if ($request->expectsJson()) {
        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Données invalides',
                    'details' => $exception->errors(),
                ],
            ], 422);
        }

        if ($exception instanceof AuthenticationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Non authentifié',
                    'details' => null,
                ],
            ], 401);
        }

        if ($exception instanceof AuthorizationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'Accès refusé',
                    'details' => null,
                ],
            ], 403);
        }
    }

    return parent::render($request, $exception);
}
```

---

## Rate Limiting (Laravel Throttle Middleware)

| Endpoint Type | Limit | Window | Identifier |
|---------------|-------|--------|------------|
| Public (search, listing detail) | 100 req/min | 1 minute | IP address |
| Authenticated (CRUD) | 60 req/min | 1 minute | User ID |
| Payment | 10 req/hour | 1 hour | User ID |
| Admin | 120 req/min | 1 minute | Admin ID |

**Configuration** (`app/Providers/RouteServiceProvider.php`):
```php
protected function configureRateLimiting()
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('public', function (Request $request) {
        return Limit::perMinute(100)->by($request->ip());
    });

    RateLimiter::for('payments', function (Request $request) {
        return Limit::perHour(10)->by($request->user()->id);
    });
}
```

**Apply to Routes**:
```php
Route::middleware('throttle:public')->group(function () {
    Route::get('/listings/search', [ListingController::class, 'search']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Authenticated routes
});
```

---

## Laravel Broadcasting Configuration

**Socket.IO Server Setup** (`config/broadcasting.php`):
```php
'connections' => [
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'useTLS' => false,
            'host' => '127.0.0.1',
            'port' => 6001,
            'scheme' => 'http',
        ],
    ],
],
```

**Laravel Echo Server** (separate Node.js process):
```bash
laravel-echo-server init
laravel-echo-server start
```

---

## Development Workflow

1. **Start Laravel API server** (with Sail):
   ```bash
   ./vendor/bin/sail up -d
   ./vendor/bin/sail artisan serve
   ```

2. **Start Queue Worker**:
   ```bash
   ./vendor/bin/sail artisan queue:work
   ```

3. **Start Laravel Echo Server**:
   ```bash
   npx laravel-echo-server start
   ```

4. **Test endpoint**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"telephone":"+224622123456","nom_complet":"Test User","mot_de_passe":"Test123!","type_compte":"PARTICULIER"}'
   ```

5. **Run PHPUnit tests**:
   ```bash
   ./vendor/bin/sail artisan test
   ```

6. **Run feature tests**:
   ```bash
   ./vendor/bin/sail artisan test --filter=ListingTest
   ```

---

## API Versioning Strategy

**Phase 1** (MVP): No versioning, rapid iteration

**Phase 2** (Stable): Version via URL prefix:
- `/api/v1/listings`
- `/api/v2/listings` (breaking changes)

**Laravel Implementation**:
```php
// routes/api_v1.php
Route::prefix('v1')->group(function () {
    require __DIR__.'/api.php';
});

// routes/api_v2.php
Route::prefix('v2')->group(function () {
    // New version endpoints
});
```

**Deprecation Policy**:
- v1 supported for 6 months after v2 release
- Warnings sent to API consumers 3 months before deprecation
- Response header: `X-API-Version: 1`, `X-API-Deprecated: true`, `X-API-Sunset: 2025-12-31`

---

**Status**: Phase 1 API contracts complete ✅

**Coverage**:
- ✅ Authentication (10 endpoints) - Laravel Sanctum
- ✅ Listings (9 endpoints) - Laravel + Meilisearch + Scout
- ✅ Payments (10 endpoints + webhooks) - Laravel Queue
- ✅ Contracts (7 endpoints) - Laravel PDF + Blade
- ✅ Messaging (WebSocket + 4 REST endpoints) - Laravel Echo + Socket.IO
- ✅ Certifications (3 endpoints) - Laravel Storage
- ✅ Admin (9 endpoints) - Laravel Middleware

**Total Endpoints**: ~52 REST endpoints + Laravel Echo real-time events

**Next Step**: Update `quickstart.md` for Laravel Sail developer onboarding.
