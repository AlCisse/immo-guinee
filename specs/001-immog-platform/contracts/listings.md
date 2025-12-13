# API Contract: Listings (Annonces Immobilières) - Laravel

**Domain**: Real Estate Listings CRUD, Search, Photo Upload
**Base URL**: `/api/listings`
**Version**: 1.0
**Last Updated**: 2025-01-28
**Backend**: Laravel 11 + Meilisearch

---

## Overview

This contract defines all endpoints for creating, reading, updating, and searching real estate listings (annonces immobilières).

**Key Requirements**:
- FR-006: Free unlimited publication (< 5 minutes)
- FR-007: 7 property types only
- FR-008: Pre-defined quartiers (no free-text location)
- FR-009: Unlimited photo uploads (min 3, optimized to WebP)
- FR-010: Auto-optimization (3 sizes: thumbnail/medium/large)
- FR-011: Mandatory fields validation
- FR-014: Auto-expiry after 90 days
- FR-016: Public search (no auth required)
- FR-017: 7 advanced filters
- FR-021: Result display format

---

## Laravel Routes Definition

```php
// routes/api.php
use App\Http\Controllers\Api\ListingController;

Route::prefix('listings')->group(function () {
    // Public routes
    Route::get('/search', [ListingController::class, 'search']);
    Route::get('/{id}', [ListingController::class, 'show']);
    Route::post('/{id}/views', [ListingController::class, 'incrementViews']);

    // Protected routes (require Sanctum authentication)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/', [ListingController::class, 'store']);
        Route::get('/me', [ListingController::class, 'myListings'])->name('listings.me');
        Route::patch('/{id}', [ListingController::class, 'update']);
        Route::delete('/{id}', [ListingController::class, 'destroy']);
        Route::post('/{id}/reactivate', [ListingController::class, 'reactivate']);
        Route::post('/{id}/premium', [ListingController::class, 'purchasePremium']);
    });
});
```

---

## Endpoints

### 1. Create Listing (Publish Annonce)

**Endpoint**: `POST /api/listings`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@store`

**Description**: Creates a new listing with photos. Target: < 5 minutes end-to-end (SC-001).

**Authentication**: Required (Sanctum)

**Request** (multipart/form-data):
```
type_operation: LOCATION
type_bien: APPARTEMENT
titre: Bel appartement 2 chambres vue mer
description: Magnifique appartement situé à Kaloum...
prix_gnf: 2500000
quartier: KALOUM
adresse_complete: Avenue de la République, Kaloum
superficie_m2: 85
nombre_chambres: 2
nombre_salons: 1
caution_mois: 3
equipements[]: Climatisation
equipements[]: Eau courante
photos[]: <file1.jpg>
photos[]: <file2.jpg>
photos[]: <file3.jpg>
```

**Laravel Validation Rules** (`StoreListingRequest`):
```php
// app/Http/Requests/Listing/StoreListingRequest.php
public function rules(): array
{
    return [
        'type_operation' => ['required', 'in:LOCATION,VENTE'],
        'type_bien' => ['required', 'in:VILLA,APPARTEMENT,STUDIO,TERRAIN,COMMERCE,BUREAU,ENTREPOT'],
        'titre' => ['required', 'string', 'min:50', 'max:100'],
        'description' => ['required', 'string', 'min:200', 'max:2000'],
        'prix_gnf' => ['required', 'integer', 'min:1', 'max:999999999999'],
        'quartier' => ['required', 'in:KALOUM,DIXINN,RATOMA,MATAM,MATOTO,DUBREKA_CENTRE,DUBREKA_PERIPHERIE,COYAH_CENTRE,COYAH_PERIPHERIE'],
        'adresse_complete' => ['nullable', 'string', 'max:500'],
        'superficie_m2' => ['nullable', 'integer', 'min:1'],
        'nombre_chambres' => ['nullable', 'integer', 'min:0'],
        'nombre_salons' => ['nullable', 'integer', 'min:0'],
        'caution_mois' => ['nullable', 'integer', 'min:1', 'max:6'],
        'equipements' => ['nullable', 'array'],
        'equipements.*' => ['string', 'max:100'],
        'photos' => ['required', 'array', 'min:3'],
        'photos.*' => ['file', 'image', 'max:5120', 'mimes:jpeg,png,webp', 'dimensions:min_width=800,min_height=600'],
    ];
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Annonce publiée avec succès",
  "data": {
    "listing": {
      "id": "uuid-v4",
      "createur_id": "uuid-v4",
      "type_operation": "LOCATION",
      "type_bien": "APPARTEMENT",
      "titre": "Bel appartement 2 chambres vue mer",
      "description": "Magnifique appartement...",
      "prix_gnf": "2500000",
      "quartier": "KALOUM",
      "adresse_complete": "Avenue de la République, Kaloum",
      "superficie_m2": 85,
      "nombre_chambres": 2,
      "nombre_salons": 1,
      "caution_mois": 3,
      "equipements": ["Climatisation", "Eau courante", "Électricité", "Internet"],
      "photos": [
        {
          "original": "https://s3.../listings/uuid/original/photo1.jpg",
          "large": "https://s3.../listings/uuid/large/photo1.webp",
          "medium": "https://s3.../listings/uuid/medium/photo1.webp",
          "thumbnail": "https://s3.../listings/uuid/thumbnail/photo1.webp"
        }
      ],
      "statut": "DISPONIBLE",
      "nombre_vues": 0,
      "options_premium": {
        "badge_urgent": false,
        "remontee_48h": false,
        "photos_pro": false
      },
      "date_publication": "2025-01-28T14:30:00Z",
      "date_expiration": "2025-04-28T14:30:00Z"
    }
  }
}
```

**Laravel Controller Implementation**:
```php
// app/Http/Controllers/Api/ListingController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Listing\StoreListingRequest;
use App\Http\Resources\ListingResource;
use App\Jobs\OptimizeListingPhotosJob;
use App\Models\Listing;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ListingController extends Controller
{
    public function store(StoreListingRequest $request)
    {
        // Create listing
        $listing = Listing::create([
            'createur_id' => $request->user()->id,
            'type_operation' => $request->type_operation,
            'type_bien' => $request->type_bien,
            'titre' => $request->titre,
            'description' => $request->description,
            'prix_gnf' => $request->prix_gnf,
            'quartier' => $request->quartier,
            'adresse_complete' => $request->adresse_complete,
            'superficie_m2' => $request->superficie_m2,
            'nombre_chambres' => $request->nombre_chambres,
            'nombre_salons' => $request->nombre_salons,
            'caution_mois' => $request->caution_mois,
            'equipements' => $request->equipements ?? [],
            'statut' => 'DISPONIBLE',
            'date_expiration' => now()->addDays(90),
        ]);

        // Upload photos to S3
        $photos = [];
        foreach ($request->file('photos') as $index => $photo) {
            $photoId = Str::uuid();
            $extension = $photo->getClientOriginalExtension();

            // Upload original to S3
            $originalPath = "listings/{$listing->id}/original/{$photoId}.{$extension}";
            Storage::disk('s3')->put($originalPath, file_get_contents($photo));

            $photos[] = [
                'id' => $photoId,
                'original' => Storage::disk('s3')->url($originalPath),
            ];
        }

        $listing->update(['photos' => $photos]);

        // Dispatch job to optimize photos asynchronously (FR-010)
        OptimizeListingPhotosJob::dispatch($listing);

        // Trigger n8n workflow (optional)
        // event(new ListingCreatedEvent($listing));

        return response()->json([
            'success' => true,
            'message' => 'Annonce publiée avec succès',
            'data' => ['listing' => new ListingResource($listing)],
        ], 201);
    }
}
```

**Photo Optimization Job** (`OptimizeListingPhotosJob`):
```php
// app/Jobs/OptimizeListingPhotosJob.php
namespace App\Jobs;

use App\Models\Listing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Facades\Image;

class OptimizeListingPhotosJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Listing $listing) {}

    public function handle(): void
    {
        $photos = $this->listing->photos;

        foreach ($photos as &$photo) {
            $originalUrl = $photo['original'];
            $originalContent = file_get_contents($originalUrl);

            // Generate thumbnail (200x150px WebP)
            $thumbnail = Image::make($originalContent)->fit(200, 150)->encode('webp', 85);
            $thumbnailPath = "listings/{$this->listing->id}/thumbnail/{$photo['id']}.webp";
            Storage::disk('s3')->put($thumbnailPath, $thumbnail);
            $photo['thumbnail'] = Storage::disk('s3')->url($thumbnailPath);

            // Generate medium (800x600px WebP)
            $medium = Image::make($originalContent)->fit(800, 600)->encode('webp', 85);
            $mediumPath = "listings/{$this->listing->id}/medium/{$photo['id']}.webp";
            Storage::disk('s3')->put($mediumPath, $medium);
            $photo['medium'] = Storage::disk('s3')->url($mediumPath);

            // Generate large (1920x1440px WebP)
            $large = Image::make($originalContent)->fit(1920, 1440)->encode('webp', 85);
            $largePath = "listings/{$this->listing->id}/large/{$photo['id']}.webp";
            Storage::disk('s3')->put($largePath, $large);
            $photo['large'] = Storage::disk('s3')->url($largePath);
        }

        $this->listing->update(['photos' => $photos]);
    }
}
```

**Errors**:
- `400 Bad Request`: Missing required fields, invalid photo format/size
- `401 Unauthorized`: Not authenticated
- `413 Payload Too Large`: Photo > 5 MB
- `422 Unprocessable Entity`: Validation errors

**Side Effects**:
1. Upload photos to S3 bucket `listings/{listing_id}/`
2. Dispatch queue job to optimize photos (FR-010)
3. Set `date_expiration` = `date_publication + 90 days`
4. Index in Meilisearch for fast search
5. Log audit event: `LISTING_CREATED`

---

### 2. Get Listing by ID (Public)

**Endpoint**: `GET /api/listings/{id}`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@show`

**Description**: Retrieves a single listing by ID. Public endpoint (no auth).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "uuid-v4",
      "createur": {
        "id": "uuid-v4",
        "nom_complet": "Mamadou Diallo",
        "badge_certification": "OR",
        "note_moyenne": 4.5,
        "nombre_transactions": 8,
        "photo_profil_url": "https://s3.../profile.jpg"
      },
      "type_operation": "LOCATION",
      "titre": "Bel appartement 2 chambres vue mer",
      "prix_gnf": "2500000",
      "quartier": "KALOUM",
      "nombre_chambres": 2,
      "photos": [ /* ... */ ],
      "statut": "DISPONIBLE",
      "nombre_vues": 150,
      "date_publication": "2025-01-28T14:30:00Z"
    }
  }
}
```

**Laravel Controller Implementation**:
```php
public function show(string $id)
{
    $cacheKey = "listing:{$id}";

    // Try cache first (FR-095)
    $listing = Cache::remember($cacheKey, 300, function () use ($id) {
        return Listing::with('creator')->findOrFail($id);
    });

    if ($listing->statut === 'ARCHIVE') {
        abort(404, 'Listing not found');
    }

    return response()->json([
        'success' => true,
        'data' => ['listing' => new ListingResource($listing)],
    ]);
}
```

**Errors**:
- `404 Not Found`: Listing ID doesn't exist or is archived

**Side Effects**:
1. Cache result in Redis (key: `listing:{id}`, TTL: 5 minutes)

---

### 3. Search Listings (Public) with Meilisearch

**Endpoint**: `GET /api/listings/search`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@search`

**Description**: Searches listings with advanced filters (FR-017). Target: < 500ms (FR-094).

**Authentication**: Not required (public)

**Query Parameters**:
```
?type_operation=LOCATION
&type_bien=APPARTEMENT
&quartier=KALOUM
&prix_min=2000000
&prix_max=3000000
&superficie_min=70
&superficie_max=100
&chambres_min=2
&chambres_max=3
&caution_max=3
&q=vue+mer
&sort_by=date_publication
&sort_order=desc
&page=1
&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "uuid-v4",
        "titre": "Bel appartement 2 chambres vue mer",
        "photo_principale": "https://s3.../thumbnail/photo1.webp",
        "prix_gnf": "2500000",
        "quartier": "KALOUM",
        "type_bien": "APPARTEMENT",
        "nombre_chambres": 2,
        "nombre_vues": 150,
        "date_publication": "2025-01-28T14:30:00Z",
        "createur": {
          "badge_certification": "OR",
          "note_moyenne": 4.5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_results": 156,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

**Laravel Controller Implementation with Meilisearch**:
```php
use Laravel\Scout\Builder;

public function search(Request $request)
{
    $validated = $request->validate([
        'type_operation' => 'nullable|in:LOCATION,VENTE',
        'type_bien' => 'nullable|in:VILLA,APPARTEMENT,STUDIO,TERRAIN,COMMERCE,BUREAU,ENTREPOT',
        'quartier' => 'nullable|string',
        'prix_min' => 'nullable|integer|min:0',
        'prix_max' => 'nullable|integer|max:999999999999',
        'superficie_min' => 'nullable|integer|min:0',
        'superficie_max' => 'nullable|integer',
        'chambres_min' => 'nullable|integer|min:0',
        'chambres_max' => 'nullable|integer',
        'caution_max' => 'nullable|integer|max:6',
        'q' => 'nullable|string|max:200',
        'sort_by' => 'nullable|in:date_publication,prix_gnf,nombre_vues',
        'sort_order' => 'nullable|in:asc,desc',
        'page' => 'nullable|integer|min:1',
        'limit' => 'nullable|integer|min:1|max:100',
    ]);

    $page = $validated['page'] ?? 1;
    $limit = $validated['limit'] ?? 20;

    // Build Meilisearch query
    $query = $validated['q'] ?? '';

    $search = Listing::search($query, function ($meilisearch, $query, $options) use ($validated) {
        // Add filters
        $filters = ['statut = DISPONIBLE'];

        if (isset($validated['type_operation'])) {
            $filters[] = "type_operation = {$validated['type_operation']}";
        }

        if (isset($validated['type_bien'])) {
            $filters[] = "type_bien = {$validated['type_bien']}";
        }

        if (isset($validated['quartier'])) {
            $filters[] = "quartier = {$validated['quartier']}";
        }

        if (isset($validated['prix_min'])) {
            $filters[] = "prix_gnf >= {$validated['prix_min']}";
        }

        if (isset($validated['prix_max'])) {
            $filters[] = "prix_gnf <= {$validated['prix_max']}";
        }

        if (isset($validated['chambres_min'])) {
            $filters[] = "nombre_chambres >= {$validated['chambres_min']}";
        }

        if (isset($validated['chambres_max'])) {
            $filters[] = "nombre_chambres <= {$validated['chambres_max']}";
        }

        $options['filter'] = implode(' AND ', $filters);

        // Sorting
        $sortBy = $validated['sort_by'] ?? 'date_publication';
        $sortOrder = $validated['sort_order'] ?? 'desc';
        $options['sort'] = ["{$sortBy}:{$sortOrder}"];

        return $meilisearch->search($query, $options);
    });

    // Paginate
    $results = $search->paginate($limit, 'page', $page);

    return response()->json([
        'success' => true,
        'data' => [
            'listings' => ListingResource::collection($results->items()),
            'pagination' => [
                'page' => $results->currentPage(),
                'limit' => $results->perPage(),
                'total_results' => $results->total(),
                'total_pages' => $results->lastPage(),
                'has_next' => $results->hasMorePages(),
                'has_prev' => $results->currentPage() > 1,
            ],
        ],
    ]);
}
```

**Meilisearch Configuration** (`config/scout.php`):
```php
'meilisearch' => [
    'host' => env('MEILISEARCH_HOST', 'http://localhost:7700'),
    'key' => env('MEILISEARCH_KEY'),
],
```

**Listing Model Scout Configuration**:
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
            'type_operation' => $this->type_operation,
            'type_bien' => $this->type_bien,
            'quartier' => $this->quartier,
            'prix_gnf' => $this->prix_gnf,
            'nombre_chambres' => $this->nombre_chambres,
            'nombre_vues' => $this->nombre_vues,
            'statut' => $this->statut,
            'date_publication' => $this->date_publication->timestamp,
        ];
    }
}
```

**Performance** (FR-094):
- Meilisearch provides < 50ms response times for typo-tolerant searches
- Auto-caching popular queries
- Filters executed in Meilisearch engine

---

### 4. Get My Listings (Authenticated)

**Endpoint**: `GET /api/listings/me`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@myListings`

**Middleware**: `auth:sanctum`

**Description**: Retrieves authenticated user's listings.

**Query Parameters**:
```
?statut=DISPONIBLE
&page=1
&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "uuid-v4",
        "titre": "Bel appartement 2 chambres vue mer",
        "statut": "DISPONIBLE",
        "nombre_vues": 150,
        "date_publication": "2025-01-28T14:30:00Z",
        "date_expiration": "2025-04-28T14:30:00Z",
        "jours_restants": 89,
        "options_premium": { /* ... */ }
      }
    ],
    "stats": {
      "total": 15,
      "disponible": 10,
      "loue_vendu": 3,
      "expire": 2
    }
  }
}
```

**Laravel Controller Implementation**:
```php
public function myListings(Request $request)
{
    $validated = $request->validate([
        'statut' => 'nullable|in:DISPONIBLE,EN_NEGOCIATION,LOUE_VENDU,EXPIRE,ARCHIVE',
        'page' => 'nullable|integer|min:1',
        'limit' => 'nullable|integer|min:1|max:100',
    ]);

    $query = $request->user()->listings();

    if (isset($validated['statut'])) {
        $query->where('statut', $validated['statut']);
    }

    $listings = $query->orderBy('date_publication', 'desc')
                      ->paginate($validated['limit'] ?? 20);

    // Calculate stats
    $stats = [
        'total' => $request->user()->listings()->count(),
        'disponible' => $request->user()->listings()->where('statut', 'DISPONIBLE')->count(),
        'loue_vendu' => $request->user()->listings()->where('statut', 'LOUE_VENDU')->count(),
        'expire' => $request->user()->listings()->where('statut', 'EXPIRE')->count(),
    ];

    return response()->json([
        'success' => true,
        'data' => [
            'listings' => ListingResource::collection($listings->items()),
            'stats' => $stats,
        ],
    ]);
}
```

---

### 5. Update Listing

**Endpoint**: `PATCH /api/listings/{id}`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@update`

**Middleware**: `auth:sanctum`

**Description**: Updates listing fields. **Limited fields editable** (FR-013).

**Request Body**:
```json
{
  "titre": "Nouveau titre",
  "description": "Nouvelle description...",
  "photos": [<file1.jpg>, <file2.jpg>]
}
```

**Editable Fields** (FR-013):
- ✅ `titre`
- ✅ `description`
- ✅ `photos` (add only, cannot delete)
- ❌ `prix_gnf` (immutable)
- ❌ `quartier` (immutable)
- ❌ `type_bien` (immutable)

**Laravel Controller Implementation**:
```php
public function update(Request $request, string $id)
{
    $listing = Listing::findOrFail($id);

    // Check ownership
    if ($listing->createur_id !== $request->user()->id) {
        abort(403, 'Not authorized to update this listing');
    }

    $validated = $request->validate([
        'titre' => 'sometimes|string|min:50|max:100',
        'description' => 'sometimes|string|min:200|max:2000',
        'photos' => 'sometimes|array',
        'photos.*' => 'file|image|max:5120|mimes:jpeg,png,webp',
    ]);

    // Prevent editing immutable fields
    if ($request->has(['prix_gnf', 'quartier', 'type_bien'])) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'IMMUTABLE_FIELDS', 'message' => 'Cannot modify prix, quartier, or type_bien after publication'],
        ], 400);
    }

    // Update allowed fields
    if (isset($validated['titre'])) {
        $listing->titre = $validated['titre'];
    }

    if (isset($validated['description'])) {
        $listing->description = $validated['description'];
    }

    // Add new photos
    if ($request->hasFile('photos')) {
        $existingPhotos = $listing->photos ?? [];

        foreach ($request->file('photos') as $photo) {
            $photoId = Str::uuid();
            $extension = $photo->getClientOriginalExtension();

            $originalPath = "listings/{$listing->id}/original/{$photoId}.{$extension}";
            Storage::disk('s3')->put($originalPath, file_get_contents($photo));

            $existingPhotos[] = [
                'id' => $photoId,
                'original' => Storage::disk('s3')->url($originalPath),
            ];
        }

        $listing->photos = $existingPhotos;

        // Dispatch optimization job
        OptimizeListingPhotosJob::dispatch($listing);
    }

    $listing->date_derniere_maj = now();
    $listing->save();

    // Invalidate cache
    Cache::forget("listing:{$listing->id}");

    return response()->json([
        'success' => true,
        'message' => 'Annonce mise à jour',
        'data' => ['listing' => new ListingResource($listing)],
    ]);
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not the listing owner
- `400 Bad Request`: Attempting to modify immutable fields

---

### 6. Delete Listing

**Endpoint**: `DELETE /api/listings/{id}`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@destroy`

**Middleware**: `auth:sanctum`

**Description**: Soft deletes listing (sets `statut: ARCHIVE`).

**Laravel Controller Implementation**:
```php
public function destroy(Request $request, string $id)
{
    $listing = Listing::findOrFail($id);

    // Check ownership or admin
    if ($listing->createur_id !== $request->user()->id && !$request->user()->isAdmin()) {
        abort(403, 'Not authorized');
    }

    // Check for active contracts
    if ($listing->contracts()->whereIn('statut', ['EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE', 'SIGNE_ARCHIVE'])->exists()) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'HAS_ACTIVE_CONTRACTS', 'message' => 'Cannot delete listing with active contracts'],
        ], 409);
    }

    // Soft delete
    $listing->update(['statut' => 'ARCHIVE']);

    // Invalidate cache
    Cache::forget("listing:{$listing->id}");

    // Remove from Meilisearch
    $listing->unsearchable();

    return response()->json([
        'success' => true,
        'message' => 'Annonce archivée',
    ]);
}
```

**Errors**:
- `403 Forbidden`: Not owner and not admin
- `409 Conflict`: Listing has active contracts

---

### 7. Reactivate Expired Listing

**Endpoint**: `POST /api/listings/{id}/reactivate`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@reactivate`

**Middleware**: `auth:sanctum`

**Description**: Reactivates expired listing (extends expiry by 90 days).

**Laravel Controller Implementation**:
```php
public function reactivate(Request $request, string $id)
{
    $listing = Listing::findOrFail($id);

    if ($listing->createur_id !== $request->user()->id) {
        abort(403, 'Not authorized');
    }

    if ($listing->statut !== 'EXPIRE') {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'NOT_EXPIRED', 'message' => 'Listing is not expired'],
        ], 400);
    }

    $listing->update([
        'statut' => 'DISPONIBLE',
        'date_expiration' => now()->addDays(90),
    ]);

    // Re-index in Meilisearch
    $listing->searchable();

    return response()->json([
        'success' => true,
        'message' => 'Annonce réactivée pour 90 jours',
        'data' => ['nouvelle_date_expiration' => $listing->date_expiration->toIso8601String()],
    ]);
}
```

---

### 8. Purchase Premium Option

**Endpoint**: `POST /api/listings/{id}/premium`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@purchasePremium`

**Middleware**: `auth:sanctum`

**Description**: Adds premium option to listing (FR-015).

**Request Body**:
```json
{
  "option": "BADGE_URGENT",
  "methode_paiement": "ORANGE_MONEY"
}
```

**Premium Options Pricing**:
- `BADGE_URGENT`: 50,000 GNF (7 days top placement)
- `REMONTEE_48H`: 30,000 GNF (auto-bump every 48h for 30 days)
- `PHOTOS_PRO`: 100,000 GNF (professional photographer visit)

**Laravel Controller Implementation**:
```php
public function purchasePremium(Request $request, string $id)
{
    $listing = Listing::findOrFail($id);

    if ($listing->createur_id !== $request->user()->id) {
        abort(403, 'Not authorized');
    }

    $validated = $request->validate([
        'option' => 'required|in:BADGE_URGENT,REMONTEE_48H,PHOTOS_PRO',
        'methode_paiement' => 'required|in:ORANGE_MONEY,MTN_MOMO',
    ]);

    $pricing = [
        'BADGE_URGENT' => 50000,
        'REMONTEE_48H' => 30000,
        'PHOTOS_PRO' => 100000,
    ];

    $montant = $pricing[$validated['option']];

    // Create payment record
    $payment = Payment::create([
        'payeur_id' => $request->user()->id,
        'beneficiaire_id' => config('app.platform_account_id'),
        'type_paiement' => 'FRAIS_PREMIUM',
        'montant_gnf' => $montant,
        'montant_total_gnf' => $montant,
        'methode_paiement' => $validated['methode_paiement'],
        'statut' => 'INITIE',
    ]);

    // Generate payment URL (Orange Money or MTN)
    $paymentUrl = $this->generateMobileMoneyUrl($payment, $validated['methode_paiement']);

    return response()->json([
        'success' => true,
        'message' => 'Redirection vers paiement',
        'data' => [
            'payment_url' => $paymentUrl,
            'montant_gnf' => $montant,
            'option' => $validated['option'],
        ],
    ]);
}
```

---

### 9. Increment View Counter

**Endpoint**: `POST /api/listings/{id}/views`

**Laravel Controller**: `App\Http\Controllers\Api\ListingController@incrementViews`

**Description**: Increments view counter (rate limited by IP).

**Laravel Controller Implementation**:
```php
public function incrementViews(Request $request, string $id)
{
    $rateKey = "listing:views:{$id}:ip:{$request->ip()}";

    // Rate limit: 1 view per IP per listing per 5 minutes
    if (Cache::has($rateKey)) {
        return response()->json(['success' => true, 'data' => ['nombre_vues' => null]]);
    }

    $listing = Listing::findOrFail($id);
    $listing->increment('nombre_vues');

    // Set rate limit
    Cache::put($rateKey, true, now()->addMinutes(5));

    // Invalidate cache
    Cache::forget("listing:{$id}");

    return response()->json([
        'success' => true,
        'data' => ['nombre_vues' => $listing->nombre_vues],
    ]);
}
```

---

## Listing Resource (API Response Transformer)

```php
// app/Http/Resources/ListingResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ListingResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'createur' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'nom_complet' => $this->creator->nom_complet,
                    'badge_certification' => $this->creator->badge_certification,
                    'note_moyenne' => $this->creator->note_moyenne,
                    'nombre_transactions' => $this->creator->nombre_transactions,
                    'photo_profil_url' => $this->creator->photo_profil_url,
                ];
            }),
            'type_operation' => $this->type_operation,
            'type_bien' => $this->type_bien,
            'titre' => $this->titre,
            'description' => $this->description,
            'prix_gnf' => (string) $this->prix_gnf,
            'quartier' => $this->quartier,
            'adresse_complete' => $this->adresse_complete,
            'superficie_m2' => $this->superficie_m2,
            'nombre_chambres' => $this->nombre_chambres,
            'nombre_salons' => $this->nombre_salons,
            'caution_mois' => $this->caution_mois,
            'equipements' => $this->equipements,
            'photos' => $this->photos,
            'photo_principale' => $this->photos[0]['thumbnail'] ?? null,
            'statut' => $this->statut,
            'nombre_vues' => $this->nombre_vues,
            'options_premium' => $this->options_premium,
            'date_publication' => $this->date_publication->toIso8601String(),
            'date_expiration' => $this->date_expiration->toIso8601String(),
            'jours_restants' => $this->date_expiration->diffInDays(now()),
        ];
    }
}
```

---

## Automated Expiry (Artisan Command)

```php
// app/Console/Commands/ExpireListingsCommand.php
namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;

class ExpireListingsCommand extends Command
{
    protected $signature = 'listings:expire';
    protected $description = 'Mark listings as expired after 90 days';

    public function handle()
    {
        $expired = Listing::where('statut', 'DISPONIBLE')
                          ->where('date_expiration', '<', now())
                          ->update(['statut' => 'EXPIRE']);

        $this->info("Marked {$expired} listings as expired.");
    }
}
```

**Schedule in `app/Console/Kernel.php`**:
```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('listings:expire')->daily();
}
```

---

## Testing Checklist

- [ ] Create listing with 5 photos completes in < 5 minutes (SC-001)
- [ ] Photos are optimized to WebP with 3 sizes via queue job (FR-010)
- [ ] Meilisearch search with all 7 filters returns results in < 50ms (FR-094)
- [ ] Full-text search on "vue mer" returns relevant listings (typo-tolerant)
- [ ] Pagination works correctly (20 per page)
- [ ] Expired listings (>90 days) auto-expire via daily cron (FR-014)
- [ ] Reactivation extends expiry by 90 days
- [ ] Immutable fields (prix, quartier, type_bien) cannot be edited (FR-013)
- [ ] View counter increments correctly with IP rate limiting
- [ ] Premium options payment flow works
- [ ] Public search works without authentication (FR-016)
- [ ] Only owner can edit/delete their listings (authorization checks)

**PHPUnit Test Example**:
```php
// tests/Feature/Listing/CreateListingTest.php
public function test_authenticated_user_can_create_listing()
{
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')
                     ->postJson('/api/listings', [
                         'type_operation' => 'LOCATION',
                         'type_bien' => 'APPARTEMENT',
                         'titre' => 'Test listing with exactly 50 characters here!!',
                         'description' => Str::repeat('Test description. ', 20),
                         'prix_gnf' => 2500000,
                         'quartier' => 'KALOUM',
                         'nombre_chambres' => 2,
                         'photos' => [
                             UploadedFile::fake()->image('photo1.jpg', 800, 600),
                             UploadedFile::fake()->image('photo2.jpg', 800, 600),
                             UploadedFile::fake()->image('photo3.jpg', 800, 600),
                         ],
                     ]);

    $response->assertStatus(201)
             ->assertJsonStructure(['success', 'message', 'data' => ['listing']]);

    $this->assertDatabaseHas('listings', [
        'createur_id' => $user->id,
        'statut' => 'DISPONIBLE',
    ]);
}
```

---

**Contract Status**: ✅ Complete (Laravel 11 + Meilisearch + Scout)
**Next Contract**: `contracts.md` (Contract Generation & Signatures)
