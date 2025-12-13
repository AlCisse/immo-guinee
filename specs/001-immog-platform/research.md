# Research & Technology Decisions: ImmoGuinée Platform (Laravel + Next.js)

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28 (Updated with Laravel stack)
**Phase**: 0 (Research)

---

## Executive Summary

This document resolves all technology decisions for the ImmoGuinée platform with a **decoupled API-first architecture**: Laravel 11 backend + Next.js 14 frontend.

**Key Architectural Decision**: Separate backend (Laravel REST API) and frontend (Next.js PWA) for:
- **Scalability**: Independent scaling of API and UI
- **Team Specialization**: PHP backend team + TypeScript frontend team
- **Mobile Apps**: Future React Native apps can consume same Laravel API
- **Performance**: Laravel Octane for high-throughput API requests

**Key Decisions**:
- **Backend**: Laravel 11 (PHP 8.2+), Eloquent ORM, Laravel Sanctum (auth)
- **Frontend**: Next.js 14 App Router, React 18, TypeScript, TailwindCSS
- **Database**: PostgreSQL 15+ with Eloquent ORM
- **Search**: Meilisearch (typo-tolerance, instant search)
- **Cache/Queue**: Redis 7+ (cache, queue, sessions, broadcasting)
- **Real-Time**: Laravel Echo (broadcasting) + Socket.IO (client)
- **Automation**: n8n (workflows) + Laravel Queue (async jobs)
- **Messaging**: WAHA (WhatsApp), Twilio (SMS), Telegram Bot API
- **Payments**: Orange Money API + MTN Mobile Money API
- **PDF**: Laravel PDF (DomPDF or Snappy/wkhtmltopdf)
- **AI/ML**: Ollama (LLM for recommendations), TensorFlow.js (fraud detection), Hugging Face (content moderation)
- **Monitoring**: Laravel Telescope, Grafana, Prometheus, Sentry, Logrocket, OSSEC (HIDS)
- **DevOps**: Docker, Docker Compose, Traefik (reverse proxy), Nginx, Certbot (Let's Encrypt)

---

## 1. Architecture Overview: Decoupled API-First

### Decision: Laravel 11 (Backend API) + Next.js 14 (Frontend PWA)

**Rationale**:
- **Best of Both Worlds**: Laravel's mature ecosystem (auth, queue, events, ORM) + Next.js's modern frontend (SSR, PWA, React)
- **API-First**: Mobile apps (React Native/Flutter) can consume same API later
- **Scalability**: Backend can scale independently (Laravel Octane + Swoole)
- **Developer Experience**: Laravel's conventions + artisan CLI + Eloquent vs raw SQL
- **Ecosystem**: Laravel has packages for everything (payments, PDF, queue, broadcasting)

**Architecture Diagram**:
```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  TRAEFIK (Reverse Proxy)                     │
│  - SSL Termination (Let's Encrypt)                          │
│  - Load Balancing                                            │
│  - Request Routing                                            │
└───────────────┬─────────────────────────┬───────────────────┘
                ↓                         ↓
    ┌───────────────────┐     ┌───────────────────┐
    │   NGINX (HTTPS)   │     │   NGINX (HTTPS)   │
    │  Next.js Frontend │     │  Laravel Backend  │
    │   (Port 3000)     │     │    (Port 8000)    │
    └─────────┬─────────┘     └─────────┬─────────┘
              ↓                         ↓
    ┌─────────────────────┐   ┌─────────────────────┐
    │   Next.js 16 Server │   │  Laravel 12 API     │
    │  - SSR Pages        │   │  - REST Endpoints   │
    │  - PWA Service      │   │  - Sanctum Auth     │
    │  - Socket.IO Client │   │  - Eloquent ORM     │
    │  - React 18         │   │  - Queue Workers    │
    └─────────┬─────────┘     └─────────┬───────────┘
              │                         │
              │        ┌────────────────┴────────┬──────────┬───────────┐
              │        ↓                         ↓          ↓           ↓
              │  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌──────────┐  ┌────────┐
              │  │PostgreSQL│  │  Redis   │  │ n8n  │  │Meilisearch│ │ MinIO │
              │  │  (Main)  │  │ (Cache/  │  │(Auto)│  │ (Search) │  │  (S3)  │
              │  │          │  │  Queue)  │  │      │  │          │  │        │
              └──┴──────────┴──┴──────────┴──┴──────┴──┴──────────┴──┴────────┘
```

**Communication Flow**:
1. User browser → Traefik → Nginx → Next.js SSR
2. Next.js → API call → Traefik → Nginx → Laravel API
3. Laravel → PostgreSQL (via Eloquent)
4. Laravel → Redis (cache, queue, sessions)
5. Laravel → Meilisearch (search indexing)
6. Laravel → MinIO/S3 (file uploads)
7. Laravel Queue → Process async jobs (PDF generation, emails, etc.)
8. n8n → Trigger Laravel webhooks (automation workflows)

---

## 2. Backend: Laravel 11 (PHP 8.2+)

### Decision: Laravel 11 with Laravel Octane

**Rationale**:
- **Mature Framework**: 10+ years of development, battle-tested
- **Eloquent ORM**: Best-in-class ORM (better than Prisma for complex queries)
- **Built-in Features**:
  - **Laravel Sanctum**: SPA + API token authentication (replaces JWT manual setup)
  - **Laravel Queue**: Background jobs (Redis driver)
  - **Laravel Echo**: Real-time broadcasting (WebSocket server)
  - **Laravel Notifications**: Multi-channel (SMS, Email, WhatsApp, Telegram)
  - **Laravel PDF**: PDF generation (DomPDF or Snappy)
  - **Laravel Socialite**: OAuth (future Google/Facebook login)
  - **Laravel Telescope**: Debug/monitoring dashboard
- **Performance**: Laravel Octane (Swoole/RoadRunner) for 2000+ req/s
- **Ecosystem**: 18,000+ packages on Packagist

**Laravel 11 New Features** (Released March 2024):
- Slimmer application skeleton
- Streamlined directory structure
- Per-second rate limiting
- Health check endpoint built-in
- Model casts improvements

**Installation**:
```bash
composer create-project laravel/laravel immog-backend "11.*"
cd immog-backend
php artisan serve  # http://localhost:8000
```

---

## 3. Frontend: Next.js 16 + React 19

### Decision: Next.js 16 App Router with TypeScript

**Rationale** (unchanged from previous plan):
- **SSR + SSG**: Pre-render pages for SEO (public listings)
- **PWA Support**: next-pwa plugin for offline capability
- **Image Optimization**: Next.js `<Image>` component
- **Code Splitting**: Automatic route-based code splitting
- **TypeScript**: Type safety across frontend

**API Communication**:
- **React Query** (TanStack Query v5): Data fetching, caching, synchronization
- **Axios**: HTTP client with interceptors (auto-add Sanctum token)

**Example API Call**:
```typescript
// lib/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,  // http://localhost:8000/api
  withCredentials: true  // Laravel Sanctum cookies
})

// Auto-add CSRF token
apiClient.interceptors.request.use(async (config) => {
  await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sanctum/csrf-cookie`)
  return config
})

export default apiClient
```

```typescript
// hooks/useListings.ts
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'

export function useListings(filters: SearchFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/listings/search', { params: filters })
      return data.data
    },
    staleTime: 5 * 60 * 1000  // 5 minutes
  })
}
```

---

## 4. Database: PostgreSQL 15+ with Eloquent ORM

### Decision: Eloquent ORM (Laravel's Default)

**Rationale**:
- **Eloquent > Prisma**: Better for complex queries, eager loading, relationship management
- **Active Record Pattern**: Intuitive model-centric approach
- **Laravel Integration**: Seamless with migrations, seeders, factories
- **Query Builder**: Fluent interface for complex queries
- **Events & Observers**: Model lifecycle hooks (e.g., auto-send notification on payment)

**Migration Example**:
```php
// database/migrations/2025_01_28_create_listings_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('createur_id')->constrained('users')->onDelete('cascade');
            $table->enum('type_operation', ['LOCATION', 'VENTE']);
            $table->enum('type_bien', ['VILLA', 'APPARTEMENT', 'STUDIO', 'TERRAIN', 'COMMERCE', 'BUREAU', 'ENTREPOT']);
            $table->string('titre', 100);
            $table->text('description');
            $table->unsignedBigInteger('prix_gnf');
            $table->enum('quartier', ['KALOUM', 'DIXINN', 'RATOMA', 'MATAM', 'MATOTO', 'DUBREKA_CENTRE', 'DUBREKA_PERIPHERIE', 'COYAH_CENTRE', 'COYAH_PERIPHERIE']);
            $table->string('adresse_complete', 500)->nullable();
            $table->integer('superficie_m2')->nullable();
            $table->integer('nombre_chambres')->nullable();
            $table->integer('nombre_salons')->nullable();
            $table->integer('caution_mois')->nullable();
            $table->json('equipements')->nullable();
            $table->json('photos');
            $table->enum('statut', ['DISPONIBLE', 'EN_NEGOCIATION', 'LOUE_VENDU', 'EXPIRE', 'ARCHIVE', 'SUSPENDU'])->default('DISPONIBLE');
            $table->integer('nombre_vues')->default(0);
            $table->json('options_premium')->default('{"badge_urgent":false,"remontee_48h":false,"photos_pro":false}');
            $table->timestampTz('date_publication')->useCurrent();
            $table->timestampTz('date_derniere_maj')->nullable();
            $table->timestampTz('date_expiration');  // publication + 90 days
            $table->timestamps();

            // Indexes for performance (FR-094: <500ms)
            $table->index(['quartier', 'statut']);
            $table->index(['type_bien', 'statut']);
            $table->index(['prix_gnf', 'statut']);
            $table->index(['date_publication']);
            $table->index(['nombre_vues']);
        });

        // Full-text search index (PostgreSQL)
        DB::statement('CREATE INDEX listings_fulltext_idx ON listings USING GIN(to_tsvector(\'french\', titre || \' \' || description))');
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
```

**Model Example**:
```php
// app/Models/Listing.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Listing extends Model
{
    use HasUuids;

    protected $fillable = [
        'createur_id', 'type_operation', 'type_bien', 'titre', 'description',
        'prix_gnf', 'quartier', 'adresse_complete', 'superficie_m2',
        'nombre_chambres', 'nombre_salons', 'caution_mois', 'equipements',
        'photos', 'statut', 'options_premium', 'date_expiration'
    ];

    protected $casts = [
        'equipements' => 'array',
        'photos' => 'array',
        'options_premium' => 'array',
        'date_publication' => 'datetime',
        'date_expiration' => 'datetime',
    ];

    // Relationships
    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'createur_id');
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class, 'annonce_id');
    }

    // Auto-set expiration date
    protected static function booted(): void
    {
        static::creating(function (Listing $listing) {
            $listing->date_expiration = now()->addDays(90);
        });
    }

    // Scope for active listings
    public function scopeActive($query)
    {
        return $query->where('statut', 'DISPONIBLE');
    }

    // Full-text search
    public function scopeSearch($query, string $term)
    {
        return $query->whereRaw(
            "to_tsvector('french', titre || ' ' || description) @@ plainto_tsquery('french', ?)",
            [$term]
        );
    }
}
```

**Query Examples**:
```php
// Simple query
$listings = Listing::where('quartier', 'KALOUM')
    ->where('statut', 'DISPONIBLE')
    ->orderBy('date_publication', 'desc')
    ->paginate(20);

// Complex query with relationships (eager loading)
$listings = Listing::with('createur:id,nom_complet,badge_certification,note_moyenne')
    ->where('quartier', 'KALOUM')
    ->where('prix_gnf', '>=', 2000000)
    ->where('prix_gnf', '<=', 3000000)
    ->active()
    ->orderBy('nombre_vues', 'desc')
    ->paginate(20);

// Full-text search
$results = Listing::search('vue mer')
    ->where('quartier', 'KALOUM')
    ->paginate(20);
```

---

## 5. Advanced Search: Meilisearch

### Decision: Meilisearch (Open Source Search Engine)

**Rationale**:
- **Typo-Tolerance**: "appartemen" finds "appartement"
- **Instant Search**: <50ms search response time
- **Faceted Search**: Aggregate filters (e.g., count by quartier)
- **Ranking**: Relevance-based ranking algorithm
- **Highlights**: Search term highlighting in results
- **Multi-Language**: French + Arabic support
- **Open Source**: MIT license, self-hosted

**Laravel Integration** (Laravel Scout):
```bash
composer require laravel/scout
composer require meilisearch/meilisearch-php
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

**Configure** (`config/scout.php`):
```php
'driver' => env('SCOUT_DRIVER', 'meilisearch'),

'meilisearch' => [
    'host' => env('MEILISEARCH_HOST', 'http://localhost:7700'),
    'key' => env('MEILISEARCH_KEY'),
],
```

**Make Model Searchable**:
```php
// app/Models/Listing.php
use Laravel\Scout\Searchable;

class Listing extends Model
{
    use Searchable;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'titre' => $this->titre,
            'description' => $this->description,
            'quartier' => $this->quartier,
            'type_bien' => $this->type_bien,
            'prix_gnf' => $this->prix_gnf,
            'statut' => $this->statut,
        ];
    }

    public function searchableAs(): string
    {
        return 'listings_index';
    }
}
```

**Search Usage**:
```php
// Controller: app/Http/Controllers/Api/ListingController.php
public function search(Request $request)
{
    $results = Listing::search($request->q)
        ->where('statut', 'DISPONIBLE')
        ->where('quartier', $request->quartier)  // Facet filter
        ->paginate(20);

    return response()->json([
        'success' => true,
        'data' => ListingResource::collection($results),
        'meta' => [
            'total' => $results->total(),
            'per_page' => $results->perPage(),
            'current_page' => $results->currentPage(),
        ]
    ]);
}
```

**Index Settings** (Facets, Sortable):
```bash
curl -X PATCH 'http://localhost:7700/indexes/listings_index/settings' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "filterableAttributes": ["quartier", "type_bien", "statut", "prix_gnf"],
    "sortableAttributes": ["prix_gnf", "date_publication", "nombre_vues"],
    "rankingRules": [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness"
    ]
  }'
```

---

## 6. Authentication: Laravel Sanctum

### Decision: Laravel Sanctum (SPA + API Tokens)

**Rationale**:
- **Built for SPAs**: Cookie-based auth for same-domain Next.js
- **API Tokens**: For mobile apps (future React Native)
- **CSRF Protection**: Built-in CSRF token handling
- **Simple Setup**: No JWT library needed
- **Laravel Native**: Fully integrated with Laravel auth

**Setup**:
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

**Configure** (`config/sanctum.php`):
```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:3000,::1',
    env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
))),
```

**API Routes** (`routes/api.php`):
```php
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/otp/send', [AuthController::class, 'sendOtp']);
Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp']);

// Protected routes (Sanctum middleware)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::patch('/auth/me', [AuthController::class, 'updateProfile']);

    // Listings
    Route::apiResource('listings', ListingController::class);
    Route::post('/listings/{id}/views', [ListingController::class, 'incrementViews']);

    // Contracts
    Route::post('/contracts/generate', [ContractController::class, 'generate']);
    Route::post('/contracts/{id}/sign', [ContractController::class, 'sign']);

    // Payments
    Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
    Route::post('/payments/escrow/{id}/validate', [PaymentController::class, 'validateEscrow']);
});
```

**AuthController Example**:
```php
// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'telephone' => 'required|regex:/^\+224\s?6[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/|unique:users',
            'nom_complet' => 'required|string|min:3|max:255',
            'email' => 'nullable|email|unique:users',
            'mot_de_passe' => 'required|string|min:8|regex:/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            'type_compte' => 'required|in:PARTICULIER,AGENCE,DIASPORA',
        ]);

        $user = User::create([
            'telephone' => $request->telephone,
            'nom_complet' => $request->nom_complet,
            'email' => $request->email,
            'mot_de_passe_hash' => Hash::make($request->mot_de_passe),
            'type_compte' => $request->type_compte,
            'badge_certification' => 'BRONZE',  // FR-002
        ]);

        // Generate OTP and send SMS (via Laravel Notification)
        $otp = rand(100000, 999999);
        Cache::put("otp:{$user->telephone}:register", $otp, now()->addMinutes(5));

        $user->notify(new OtpNotification($otp));  // Twilio SMS

        return response()->json([
            'success' => true,
            'message' => "OTP envoyé à {$user->telephone}",
            'data' => [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'otp_expires_at' => now()->addMinutes(5)->toIso8601String(),
            ]
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'telephone' => 'required',
            'otp_code' => 'required|digits:6',
        ]);

        $cachedOtp = Cache::get("otp:{$request->telephone}:register");

        if (!$cachedOtp || $cachedOtp !== (int)$request->otp_code) {
            throw ValidationException::withMessages([
                'otp_code' => ['Code OTP invalide ou expiré.'],
            ]);
        }

        $user = User::where('telephone', $request->telephone)->firstOrFail();

        // Delete OTP
        Cache::forget("otp:{$request->telephone}:register");

        // Create Sanctum token
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Inscription réussie. Bienvenue sur ImmoGuinée!',
            'data' => [
                'user' => $user,
                'access_token' => $token,
            ]
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'telephone' => 'required',
            'mot_de_passe' => 'required',
        ]);

        $user = User::where('telephone', $request->telephone)->first();

        if (!$user || !Hash::check($request->mot_de_passe, $user->mot_de_passe_hash)) {
            throw ValidationException::withMessages([
                'telephone' => ['Numéro de téléphone ou mot de passe incorrect.'],
            ]);
        }

        if ($user->statut_compte !== 'ACTIF') {
            throw ValidationException::withMessages([
                'telephone' => ['Compte suspendu ou banni.'],
            ]);
        }

        $user->update(['derniere_connexion' => now()]);

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie',
            'data' => [
                'user' => $user,
                'access_token' => $token,
            ]
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie',
        ]);
    }
}
```

---

## 7. Real-Time: Laravel Echo + Socket.IO

### Decision: Laravel Echo Server (Broadcasting) + Socket.IO Client

**Rationale**:
- **Laravel Native**: Laravel Broadcasting events → Echo Server → Socket.IO
- **Redis Driver**: Use Redis for pub/sub (same Redis as cache/queue)
- **Presence Channels**: Know who's online in a conversation
- **Private Channels**: Secure user-specific notifications

**Setup**:

1. **Install Laravel Broadcasting**:
```bash
composer require pusher/pusher-php-server
```

2. **Configure** (`config/broadcasting.php`):
```php
'default' => env('BROADCAST_DRIVER', 'redis'),

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
    ],
],
```

3. **Install Laravel Echo Server** (Node.js):
```bash
npm install -g laravel-echo-server
laravel-echo-server init
```

`laravel-echo-server.json`:
```json
{
  "authHost": "http://localhost:8000",
  "authEndpoint": "/broadcasting/auth",
  "clients": [
    {
      "appId": "immog",
      "key": "immog-secret-key"
    }
  ],
  "database": "redis",
  "databaseConfig": {
    "redis": {
      "host": "127.0.0.1",
      "port": "6379"
    }
  },
  "devMode": true,
  "host": null,
  "port": "6001",
  "protocol": "http",
  "socketio": {},
  "secureOptions": 67108864,
  "sslCertPath": "",
  "sslKeyPath": "",
  "sslCertChainPath": "",
  "sslPassphrase": "",
  "subscribers": {
    "http": true,
    "redis": true
  },
  "apiOriginAllow": {
    "allowCors": true,
    "allowOrigin": "http://localhost:3000",
    "allowMethods": "GET, POST",
    "allowHeaders": "Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept, Authorization, X-CSRF-TOKEN, X-Socket-Id"
  }
}
```

4. **Define Event** (`app/Events/NewMessage.php`):
```php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("conversation.{$this->message->conversation_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.new';
    }

    public function broadcastWith(): array
    {
        return [
            'message' => $this->message->load('expediteur:id,nom_complet,photo_profil_url'),
        ];
    }
}
```

5. **Dispatch Event**:
```php
// app/Http/Controllers/Api/MessageController.php
public function send(Request $request, string $conversationId)
{
    $message = Message::create([
        'conversation_id' => $conversationId,
        'expediteur_id' => $request->user()->id,
        'type_message' => 'TEXTE',
        'contenu_texte' => $request->contenu,
    ]);

    // Broadcast to all conversation participants
    broadcast(new NewMessage($message))->toOthers();

    return response()->json([
        'success' => true,
        'data' => $message,
    ]);
}
```

6. **Frontend Setup** (Next.js):
```bash
npm install laravel-echo socket.io-client
```

```typescript
// lib/echo.ts
import Echo from 'laravel-echo'
import io from 'socket.io-client'

window.io = io

export const echo = new Echo({
  broadcaster: 'socket.io',
  host: process.env.NEXT_PUBLIC_ECHO_SERVER_URL,  // http://localhost:6001
  auth: {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  },
})
```

```typescript
// components/MessageThread.tsx
import { useEffect } from 'react'
import { echo } from '@/lib/echo'

export function MessageThread({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    echo
      .private(`conversation.${conversationId}`)
      .listen('.message.new', (event: { message: Message }) => {
        console.log('New message:', event.message)
        // Update UI with new message
      })

    return () => {
      echo.leave(`conversation.${conversationId}`)
    }
  }, [conversationId])

  return <div>...</div>
}
```

---

## 8. Background Jobs: Laravel Queue (Redis Driver)

### Decision: Laravel Queue with Redis Driver + Horizon Dashboard

**Rationale**:
- **Async Processing**: PDF generation, email sending, image optimization (don't block HTTP response)
- **Redis Driver**: Fast, reliable, same Redis as cache
- **Horizon**: Beautiful dashboard for monitoring queues
- **Retry Logic**: Auto-retry failed jobs
- **Priority Queues**: High priority for payment confirmations, low priority for emails

**Setup**:
```bash
composer require laravel/horizon
php artisan horizon:install
php artisan migrate
```

**Configure** (`config/queue.php`):
```php
'default' => env('QUEUE_CONNECTION', 'redis'),

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
    ],
],
```

**Job Example** (`app/Jobs/GenerateContractPDF.php`):
```php
namespace App\Jobs;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class GenerateContractPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Contract $contract) {}

    public function handle(): void
    {
        // Load contract data with relationships
        $this->contract->load(['proprietaire', 'locataire', 'annonce']);

        // Generate PDF from Blade template
        $pdf = Pdf::loadView('contracts.bail-location', [
            'contract' => $this->contract,
            'landlord' => $this->contract->proprietaire,
            'tenant' => $this->contract->locataire,
            'listing' => $this->contract->annonce,
        ]);

        // Save to S3
        $fileName = "contracts/{$this->contract->id}.pdf";
        Storage::disk('s3')->put($fileName, $pdf->output(), 'private');

        // Update contract with PDF URL and hash
        $this->contract->update([
            'fichier_pdf_url' => Storage::disk('s3')->url($fileName),
            'hash_sha256' => hash('sha256', $pdf->output()),
        ]);

        // Fire event (will trigger n8n workflow for notifications)
        event(new ContractGenerated($this->contract));
    }

    public function failed(\Throwable $exception): void
    {
        // Log error, notify admin
        \Log::error("Contract PDF generation failed for {$this->contract->id}: {$exception->getMessage()}");
    }
}
```

**Dispatch Job**:
```php
// app/Http/Controllers/Api/ContractController.php
public function generate(Request $request)
{
    $contract = Contract::create([
        'type_contrat' => $request->type_contrat,
        'annonce_id' => $request->annonce_id,
        'proprietaire_id' => $request->proprietaire_id,
        'locataire_acheteur_id' => $request->user()->id,
        'donnees_personnalisees' => $request->donnees,
        'statut' => 'BROUILLON',
    ]);

    // Dispatch job to queue (don't wait for PDF generation)
    GenerateContractPDF::dispatch($contract);

    return response()->json([
        'success' => true,
        'message' => 'Contrat en cours de génération...',
        'data' => $contract,
    ], 201);
}
```

**Queue Priorities** (`config/horizon.php`):
```php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'processes' => 10,
            'tries' => 3,
        ],
    ],
],
```

**Start Horizon**:
```bash
php artisan horizon
# Dashboard: http://localhost:8000/horizon
```

---

## 9. PDF Generation: Laravel PDF (DomPDF / Snappy)

### Decision: Barryvdh/laravel-dompdf (Simple) or Snappy/wkhtmltopdf (Advanced)

**Option 1: DomPDF** (Simpler, Pure PHP):
```bash
composer require barryvdh/laravel-dompdf
```

**Option 2: Snappy + wkhtmltopdf** (Better rendering, requires binary):
```bash
composer require barryvdh/laravel-snappy
# Install wkhtmltopdf binary:
sudo apt-get install wkhtmltopdf
```

**Recommendation**: Start with DomPDF, migrate to Snappy if needed for complex layouts.

**Blade Template** (`resources/views/contracts/bail-location.blade.php`):
```blade
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Contrat de Location - {{ $contract->id }}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 2cm; }
        .article { margin-bottom: 1.5cm; }
        .signature-block { margin-top: 3cm; page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RÉPUBLIQUE DE GUINÉE</h1>
        <p>Loi 2016/037 sur les signatures électroniques</p>
        <h2>CONTRAT DE LOCATION RÉSIDENTIEL</h2>
    </div>

    <div class="article">
        <h3>Article 1 - PARTIES</h3>
        <p><strong>Propriétaire:</strong> {{ $landlord->nom_complet }}, CNI {{ $landlord->cni ?? 'N/A' }}</p>
        <p><strong>Locataire:</strong> {{ $tenant->nom_complet }}, CNI {{ $tenant->cni ?? 'N/A' }}</p>
    </div>

    <div class="article">
        <h3>Article 2 - DESCRIPTION DU BIEN</h3>
        <p>{{ $listing->type_bien }} situé à {{ $listing->adresse_complete }}</p>
        <p>Superficie: {{ $listing->superficie_m2 }} m²</p>
        <p>Équipements: {{ implode(', ', $listing->equipements ?? []) }}</p>
    </div>

    <div class="article">
        <h3>Article 3 - LOYER ET CAUTION</h3>
        <p>Loyer mensuel: {{ number_format($contract->donnees_personnalisees['montant_loyer_gnf'], 0, ',', ' ') }} GNF</p>
        <p>Caution ({{ $contract->donnees_personnalisees['caution_mois'] }} mois): {{ number_format($contract->donnees_personnalisees['montant_caution_gnf'], 0, ',', ' ') }} GNF</p>
    </div>

    <!-- Articles 4-8... -->

    <div class="signature-block">
        <p><strong>Fait à Conakry, le {{ $contract->date_signature_complete?->format('d/m/Y') ?? '__/__/____' }}</strong></p>
        <div style="display: flex; justify-content: space-between;">
            <div>
                <p>Le Propriétaire</p>
                <p>{{ $landlord->nom_complet }}</p>
                @if($contract->isSignedBy($landlord->id))
                    <p>Signé le {{ $contract->getSignatureDate($landlord->id)->format('d/m/Y à H:i:s') }}</p>
                @else
                    <p>_______________________</p>
                @endif
            </div>
            <div>
                <p>Le Locataire</p>
                <p>{{ $tenant->nom_complet }}</p>
                @if($contract->isSignedBy($tenant->id))
                    <p>Signé le {{ $contract->getSignatureDate($tenant->id)->format('d/m/Y à H:i:s') }}</p>
                @else
                    <p>_______________________</p>
                @endif
            </div>
        </div>
        <p style="text-align: center; margin-top: 2cm; font-size: 9pt;">
            <em>Cachet électronique ImmoGuinée</em><br>
            Hash SHA-256: {{ substr($contract->hash_sha256 ?? 'En cours...', 0, 16) }}...
        </p>
    </div>
</body>
</html>
```

**Generate PDF**:
```php
use Barryvdh\DomPDF\Facade\Pdf;

$pdf = Pdf::loadView('contracts.bail-location', compact('contract', 'landlord', 'tenant', 'listing'));
$pdfOutput = $pdf->output();  // Binary PDF data

// Save to S3
Storage::disk('s3')->put("contracts/{$contract->id}.pdf", $pdfOutput, 'private');
```

---

## 10. Notifications: Laravel Notifications (Multi-Channel)

### Decision: Laravel Notifications with Custom Channels

**Channels**:
1. **SMS**: Twilio (via `laravel-twilio-channel`)
2. **Email**: Laravel Mail (SMTP or Resend API)
3. **WhatsApp**: WAHA (custom channel)
4. **Telegram**: Telegram Bot API (custom channel)
5. **Push**: Firebase Cloud Messaging (web push)
6. **Database**: Store in `notifications` table for in-app

**Setup**:
```bash
composer require laravel-notification-channels/twilio
composer require laravel-notification-channels/telegram
```

**Notification Example** (`app/Notifications/PaymentConfirmed.php`):
```php
namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioSmsMessage;
use App\Channels\WahaChannel;
use App\Channels\TelegramChannel;

class PaymentConfirmed extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Payment $payment) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];  // Always store in DB

        // Check user preferences (FR-005, FR-062)
        $prefs = $notifiable->preferences_notification;

        if ($prefs['sms'] ?? true) $channels[] = 'twilio';
        if ($prefs['email'] ?? true) $channels[] = 'mail';
        if ($prefs['whatsapp'] ?? false) $channels[] = WahaChannel::class;
        if ($prefs['telegram'] ?? false) $channels[] = TelegramChannel::class;

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Paiement confirmé - ImmoGuinée')
            ->greeting("Bonjour {$notifiable->nom_complet},")
            ->line("Votre paiement de {$this->payment->montant_gnf} GNF a été confirmé.")
            ->action('Voir la quittance', url("/payments/{$this->payment->id}/quittance"))
            ->line('Merci d\'utiliser ImmoGuinée!');
    }

    public function toTwilio(object $notifiable): TwilioSmsMessage
    {
        return (new TwilioSmsMessage())
            ->content("ImmoGuinée: Paiement confirmé ({$this->payment->montant_gnf} GNF). Quittance disponible sur votre dashboard.");
    }

    public function toWaha(object $notifiable): string
    {
        return "✅ Paiement confirmé: {$this->payment->montant_gnf} GNF\n\nVoir la quittance: " . url("/payments/{$this->payment->id}/quittance");
    }

    public function toTelegram(object $notifiable): array
    {
        return [
            'text' => "✅ Paiement confirmé\n\nMontant: {$this->payment->montant_gnf} GNF\n\n[Voir la quittance](" . url("/payments/{$this->payment->id}/quittance") . ")",
            'parse_mode' => 'Markdown',
        ];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'payment_id' => $this->payment->id,
            'montant_gnf' => $this->payment->montant_gnf,
            'type' => 'payment_confirmed',
        ];
    }
}
```

**Custom WAHA Channel** (`app/Channels/WahaChannel.php`):
```php
namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class WahaChannel
{
    public function send($notifiable, Notification $notification)
    {
        $message = $notification->toWaha($notifiable);

        Http::withHeaders([
            'X-Api-Key' => config('services.waha.api_key'),
        ])->post(config('services.waha.url') . '/api/sendText', [
            'chatId' => $notifiable->telephone . '@c.us',  // WhatsApp format
            'text' => $message,
        ]);
    }
}
```

**Send Notification**:
```php
// After payment confirmation
$user->notify(new PaymentConfirmed($payment));

// Or notify multiple users
Notification::send([$landlord, $tenant], new ContractSigned($contract));
```

---

## 11. Automation: n8n Workflows

**Decision**: n8n (Self-Hosted) with Laravel Webhooks

**Integration**:
1. Laravel fires events (e.g., `PaymentConfirmed`)
2. Event listener calls n8n webhook
3. n8n workflow executes (send notifications, update external systems, etc.)

**n8n Workflow Example** (Payment Confirmed):
```json
{
  "name": "Payment Confirmed Workflow",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "payment-confirmed",
      "parameters": {
        "path": "payment-confirmed",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Extract Commission",
      "type": "n8n-nodes-base.set",
      "position": [450, 300],
      "parameters": {
        "values": {
          "number": [
            {
              "name": "commission_gnf",
              "value": "={{$json.payment.commission_plateforme_gnf}}"
            }
          ]
        }
      }
    },
    {
      "name": "Update ImmoG Account",
      "type": "n8n-nodes-base.postgres",
      "position": [650, 300],
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE users SET balance = balance + {{$json.commission_gnf}} WHERE id = '{{$env.IMMOG_ACCOUNT_ID}}'"
      }
    },
    {
      "name": "Notify Landlord (WhatsApp)",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 400],
      "parameters": {
        "url": "{{$env.WAHA_URL}}/api/sendText",
        "method": "POST",
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Api-Key",
              "value": "={{$env.WAHA_API_KEY}}"
            }
          ]
        },
        "bodyParameters": {
          "parameters": [
            {
              "name": "chatId",
              "value": "={{$json.landlord.telephone}}@c.us"
            },
            {
              "name": "text",
              "value": "Caution reçue: {{$json.payment.montant_gnf}} GNF. Validez la réception sur ImmoGuinée."
            }
          ]
        }
      }
    }
  ]
}
```

**Laravel Event Listener**:
```php
// app/Listeners/TriggerN8nWorkflow.php
namespace App\Listeners;

use App\Events\PaymentConfirmed;
use Illuminate\Support\Facades\Http;

class TriggerN8nWorkflow
{
    public function handle(PaymentConfirmed $event): void
    {
        Http::post(config('services.n8n.webhook_url') . '/payment-confirmed', [
            'payment' => $event->payment->load(['payeur', 'beneficiaire', 'contrat']),
            'landlord' => $event->payment->beneficiaire,
            'tenant' => $event->payment->payeur,
        ]);
    }
}
```

---

## 12. AI/ML Integration

### Decision: Multi-Tool Approach

**1. Ollama (Local LLM for Recommendations)**

**Use Case**: Recommend properties based on user search history and preferences.

**Setup**:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model (e.g., Llama 3 8B)
ollama pull llama3
```

**Laravel Integration**:
```php
// app/Services/RecommendationService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class RecommendationService
{
    public function recommend(User $user): array
    {
        $searchHistory = $user->searches()->latest()->take(10)->get();

        $prompt = "Based on user search history:\n";
        foreach ($searchHistory as $search) {
            $prompt .= "- {$search->quartier} {$search->type_bien} around {$search->prix_gnf} GNF\n";
        }
        $prompt .= "\nRecommend 5 similar properties.";

        $response = Http::post('http://localhost:11434/api/generate', [
            'model' => 'llama3',
            'prompt' => $prompt,
            'stream' => false,
        ]);

        return json_decode($response->json()['response'], true);
    }
}
```

**2. TensorFlow.js (Browser-Side Fraud Detection)**

**Use Case**: Detect duplicate/spam listings on the frontend before submission.

**Implementation** (Next.js component):
```typescript
// components/ListingForm.tsx
import * as tf from '@tensorflow/tfjs'
import { useEffect, useState } from 'react'

export function ListingForm() {
  const [model, setModel] = useState<tf.LayersModel | null>(null)

  useEffect(() => {
    // Load pre-trained fraud detection model
    tf.loadLayersModel('/models/fraud-detection/model.json').then(setModel)
  }, [])

  const detectFraud = async (listingData: ListingFormData) => {
    if (!model) return { fraud: false, confidence: 0 }

    // Extract features: title length, description length, price, etc.
    const features = tf.tensor2d([[
      listingData.titre.length,
      listingData.description.length,
      listingData.prix_gnf,
      listingData.photos.length,
    ]])

    const prediction = model.predict(features) as tf.Tensor
    const fraudProbability = await prediction.data()

    return {
      fraud: fraudProbability[0] > 0.8,
      confidence: fraudProbability[0],
    }
  }

  // Usage in form submit
  const handleSubmit = async (data: ListingFormData) => {
    const { fraud, confidence } = await detectFraud(data)

    if (fraud) {
      alert(`Cette annonce semble suspecte (confiance: ${(confidence * 100).toFixed(1)}%). Veuillez vérifier.`)
      return
    }

    // Submit to API
    await apiClient.post('/listings', data)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**3. Hugging Face Transformers (Content Moderation)**

**Use Case**: Auto-moderate user-generated content (listings descriptions, messages) for inappropriate language.

**Setup**:
```bash
pip install transformers torch
```

**Laravel Integration** (via Python microservice or direct PHP client):

**Option A: Python Microservice**:
```python
# ml_services/moderation.py
from transformers import pipeline
from flask import Flask, request, jsonify

app = Flask(__name__)
classifier = pipeline("text-classification", model="facebook/roberta-hate-speech-dynabench-r4-target")

@app.route('/moderate', methods=['POST'])
def moderate():
    text = request.json['text']
    result = classifier(text)[0]

    return jsonify({
        'is_inappropriate': result['label'] == 'hate',
        'confidence': result['score']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**Laravel Call**:
```php
// app/Services/ModerationService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class ModerationService
{
    public function moderate(string $text): array
    {
        $response = Http::post('http://localhost:5000/moderate', [
            'text' => $text,
        ]);

        return $response->json();
    }
}

// Usage in controller
$moderation = app(ModerationService::class)->moderate($request->description);

if ($moderation['is_inappropriate'] && $moderation['confidence'] > 0.9) {
    return response()->json([
        'success' => false,
        'error' => [
            'code' => 'INAPPROPRIATE_CONTENT',
            'message' => 'Votre description contient du contenu inapproprié. Veuillez reformuler.',
        ]
    ], 422);
}
```

**Option B: PHP Client** (Limited, for simple tasks):
```bash
composer require codewithkyrian/transformers
```

---

## 13. Monitoring & Observability

### Laravel Telescope (Development Debugging)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

Dashboard: `http://localhost:8000/telescope`

**Features**:
- Request/Response logging
- Database queries with explain
- Queue job monitoring
- Exceptions tracking
- Scheduled tasks
- Cache operations

### Sentry (Production Error Tracking)

```bash
composer require sentry/sentry-laravel
php artisan sentry:publish --dsn=YOUR_DSN
```

**Automatic Error Reporting**:
```php
// All exceptions automatically sent to Sentry
throw new \Exception('Something went wrong!');
```

### Grafana + Prometheus (Metrics)

**Laravel Prometheus Exporter**:
```bash
composer require superbalist/laravel-prometheus-exporter
```

**Expose Metrics** (`routes/web.php`):
```php
Route::get('/metrics', function () {
    return app(\Prometheus\CollectorRegistry::class)->getMetricFamilySamples();
});
```

**Custom Metrics**:
```php
use Prometheus\CollectorRegistry;

$registry = app(CollectorRegistry::class);

// Counter: Total listings created
$counter = $registry->getOrRegisterCounter('immog', 'listings_created_total', 'Total listings created');
$counter->inc();

// Gauge: Active users
$gauge = $registry->getOrRegisterGauge('immog', 'active_users', 'Number of active users');
$gauge->set(User::where('statut_compte', 'ACTIF')->count());

// Histogram: API response time
$histogram = $registry->getOrRegisterHistogram('immog', 'api_response_time_seconds', 'API response time', ['endpoint']);
$histogram->observe(0.123, ['/api/listings/search']);
```

### Logrocket (Session Replay)

**Frontend Integration** (Next.js):
```bash
npm install logrocket
```

```typescript
// app/layout.tsx
import LogRocket from 'logrocket'

if (process.env.NODE_ENV === 'production') {
  LogRocket.init('your-app-id')
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html>{children}</html>
}
```

**Identify Users**:
```typescript
LogRocket.identify(user.id, {
  name: user.nom_complet,
  email: user.email,
  badge: user.badge_certification,
})
```

### OSSEC (Host-Based Intrusion Detection)

**Setup** (Ubuntu server):
```bash
wget -q -O - https://updates.atomicorp.com/installers/atomic | sudo bash
sudo apt-get install ossec-hids-server
```

**Monitor**:
- SSH brute force attempts
- File integrity (config files, .env)
- Web server attacks (SQL injection, XSS)
- Rootkit detection

---

## 14. DevOps & Deployment

### Docker Compose (Development/Staging)

**File: `docker-compose.yml`**:
```yaml
version: '3.9'

services:
  # Laravel Backend (PHP-FPM + Nginx)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: immog-backend
    volumes:
      - ./backend:/var/www/html
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - MEILISEARCH_HOST=http://meilisearch:7700
    depends_on:
      - postgres
      - redis
      - meilisearch
    networks:
      - immog-network

  # Nginx for Laravel
  nginx-backend:
    image: nginx:alpine
    container_name: immog-nginx-backend
    ports:
      - "8000:80"
    volumes:
      - ./backend:/var/www/html
      - ./docker/nginx/backend.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
    networks:
      - immog-network

  # Next.js Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: immog-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
      - NEXT_PUBLIC_ECHO_SERVER_URL=http://localhost:6001
    depends_on:
      - backend
    networks:
      - immog-network

  # PostgreSQL 15
  postgres:
    image: postgres:15-alpine
    container_name: immog-postgres
    environment:
      POSTGRES_DB: immoguinee
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - immog-network

  # Redis 7
  redis:
    image: redis:7-alpine
    container_name: immog-redis
    command: redis-server --appendonly yes --maxmemory 2gb
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - immog-network

  # Meilisearch
  meilisearch:
    image: getmeili/meilisearch:v1.6
    container_name: immog-meilisearch
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
    volumes:
      - meilisearch_data:/meili_data
    ports:
      - "7700:7700"
    networks:
      - immog-network

  # Laravel Echo Server
  echo-server:
    image: node:20-alpine
    container_name: immog-echo
    working_dir: /app
    volumes:
      - ./backend:/app
    command: npx laravel-echo-server start
    ports:
      - "6001:6001"
    depends_on:
      - redis
      - backend
    networks:
      - immog-network

  # n8n Automation
  n8n:
    image: n8nio/n8n:latest
    container_name: immog-n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_URL=https://immoguinee.com/n8n
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - immog-network

  # WAHA (WhatsApp)
  waha:
    image: devlikeapro/waha:latest
    container_name: immog-waha
    ports:
      - "3001:3000"
    environment:
      - WAHA_API_KEY=${WAHA_SECRET}
    volumes:
      - waha_sessions:/app/.sessions
    networks:
      - immog-network

  # MinIO (S3-compatible)
  minio:
    image: minio/minio:latest
    container_name: immog-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - immog-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: immog-grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - immog-network

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: immog-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - immog-network

  # Laravel Horizon (Queue Worker)
  horizon:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: immog-horizon
    command: php artisan horizon
    volumes:
      - ./backend:/var/www/html
    depends_on:
      - redis
      - postgres
    networks:
      - immog-network

  # Traefik (Reverse Proxy - Production only)
  # traefik:
  #   image: traefik:v2.11
  #   command:
  #     - "--api.insecure=true"
  #     - "--providers.docker=true"
  #     - "--entrypoints.web.address=:80"
  #     - "--entrypoints.websecure.address=:443"
  #     - "--certificatesresolvers.letsencrypt.acme.email=admin@immoguinee.com"
  #     - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
  #     - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #     - "8080:8080"  # Traefik dashboard
  #   volumes:
  #     - "/var/run/docker.sock:/var/run/docker.sock:ro"
  #     - traefik_letsencrypt:/letsencrypt
  #   networks:
  #     - immog-network

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
  n8n_data:
  waha_sessions:
  minio_data:
  grafana_data:
  prometheus_data:
  traefik_letsencrypt:

networks:
  immog-network:
    driver: bridge
```

### Laravel Dockerfile

**File: `backend/Dockerfile`**:
```dockerfile
FROM php:8.2-fpm-alpine

# Install dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    zip \
    unzip \
    postgresql-dev \
    redis

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg
RUN docker-php-ext-install pdo pdo_pgsql pgsql gd exif pcntl bcmath opcache

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port 9000 for PHP-FPM
EXPOSE 9000

CMD ["php-fpm"]
```

### Next.js Dockerfile

**File: `frontend/Dockerfile`**:
```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 15. Final Stack Summary

| Layer | Technology | Version | License | Notes |
|-------|-----------|---------|---------|-------|
| **Backend Framework** | Laravel | 11 | MIT | PHP 8.2+, Eloquent ORM |
| **Frontend Framework** | Next.js | 14 | MIT | React 18, App Router |
| **Language (Backend)** | PHP | 8.2+ | PHP License | Type hints, enums, attributes |
| **Language (Frontend)** | TypeScript | 5+ | Apache 2.0 | Strict mode |
| **Database** | PostgreSQL | 15+ | PostgreSQL | ACID, JSONB, full-text search |
| **ORM** | Eloquent | Built-in | MIT | Active Record pattern |
| **Search Engine** | Meilisearch | 1.6+ | MIT | Typo-tolerance, instant search |
| **Cache/Queue** | Redis | 7+ | BSD-3 | In-memory data structure store |
| **Auth** | Laravel Sanctum | Built-in | MIT | SPA + API token auth |
| **Real-Time** | Laravel Echo + Socket.IO | Latest | MIT | WebSocket + polling fallback |
| **Queue Dashboard** | Laravel Horizon | Latest | MIT | Redis queue monitoring |
| **API Data Fetching** | React Query | 5+ | MIT | Server state management |
| **UI Library** | TailwindCSS | 3+ | MIT | Utility-first CSS |
| **Animations** | Framer Motion | 11+ | MIT | React animations |
| **PWA** | next-pwa | 5+ | MIT | Service worker, offline |
| **PDF Generation** | Laravel PDF (DomPDF) | Latest | LGPL | Or Snappy (wkhtmltopdf) |
| **SMS** | Twilio | N/A | Proprietary | OTP, notifications |
| **Email** | Resend | N/A | Proprietary | Transactional emails |
| **WhatsApp** | WAHA | Latest | MIT | Self-hosted WhatsApp API |
| **Telegram** | Telegram Bot API | N/A | Proprietary | Notifications |
| **Payments (Guinea)** | Orange Money + MTN MoMo | N/A | Proprietary | Mobile Money APIs |
| **Automation** | n8n | Latest | Fair-code | Workflow automation |
| **AI (LLM)** | Ollama | Latest | MIT | Local LLM (Llama 3) |
| **AI (Browser)** | TensorFlow.js | 4+ | Apache 2.0 | Client-side ML |
| **AI (Moderation)** | Hugging Face Transformers | Latest | Apache 2.0 | Content moderation |
| **Debug (Dev)** | Laravel Telescope | Latest | MIT | Request/query inspection |
| **Errors (Prod)** | Sentry | N/A | Proprietary | Error tracking + performance |
| **Session Replay** | Logrocket | N/A | Proprietary | Frontend session recording |
| **Metrics** | Prometheus + Grafana | Latest | Apache 2.0 | Time-series metrics |
| **HIDS** | OSSEC | Latest | GPL v3 | Intrusion detection |
| **Reverse Proxy** | Traefik | 2.11 | MIT | Auto SSL (Let's Encrypt) |
| **Web Server** | Nginx | 1.25+ | BSD-2 | Static files, proxying |
| **Containerization** | Docker | 24+ | Apache 2.0 | Containers |
| **Orchestration (Prod)** | Kubernetes | 1.28+ | Apache 2.0 | Cloud-native orchestration |
| **Storage (S3)** | MinIO | Latest | AGPL v3 | Self-hosted S3-compatible |
| **Testing (Backend)** | PHPUnit / Pest | Latest | BSD-3 | Laravel testing |
| **Testing (Frontend)** | Vitest + Playwright | Latest | MIT | Unit + E2E |
| **Load Testing** | k6 | Latest | AGPL v3 | Performance testing |

**Open Source Percentage**: ~85% (15% proprietary: Twilio, Resend, Sentry, Logrocket, Mobile Money APIs)

---

## 16. Migration Path from Old Stack

**Old Stack** (Initial plan):
- Monolith Next.js (frontend + backend API Routes)
- Prisma ORM
- Manual JWT auth
- Puppeteer PDF
- No Meilisearch

**New Stack** (Current plan):
- Decoupled Laravel backend + Next.js frontend
- Eloquent ORM
- Laravel Sanctum auth
- Laravel PDF (DomPDF)
- Meilisearch for advanced search

**Why the Change?**:
1. **Team Skills**: If team has PHP/Laravel expertise, leverage it
2. **Ecosystem**: Laravel's mature packages (Sanctum, Horizon, Telescope, Echo, Notifications)
3. **Scalability**: Laravel Octane for high-throughput APIs
4. **Separation of Concerns**: Backend logic in Laravel, UI in Next.js
5. **Future Mobile Apps**: React Native/Flutter can consume same Laravel API

**Trade-offs**:
- ✅ **Pros**: Mature ecosystem, better ORM, built-in features (queue, broadcasting, PDF, notifications)
- ❌ **Cons**: Two codebases to maintain, slightly more complex deployment, PHP vs full TypeScript

---

## 17. Development Workflow

**Backend (Laravel)**:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve  # http://localhost:8000
```

**Frontend (Next.js)**:
```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev  # http://localhost:3000
```

**Queue Worker**:
```bash
php artisan horizon  # Dashboard: http://localhost:8000/horizon
```

**Run Tests**:
```bash
# Backend
php artisan test

# Frontend
pnpm test
```

---

**Research Complete**: ✅ All technology decisions resolved for Laravel + Next.js stack.

**Next Steps**:
1. Rewrite `data-model.md` with Eloquent migrations
2. Rewrite API contracts for Laravel routes/controllers
3. Update `quickstart.md` with Laravel Sail setup
