<?php

namespace App\Models;

use App\Models\Traits\HasFacebookPublication;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Listing extends Model
{
    use HasFactory, HasUuids, SoftDeletes, Searchable, HasFacebookPublication;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'titre',
        'description',
        'type_bien',
        'type_transaction',
        'quartier',
        'commune',
        'adresse_complete',
        'loyer_mensuel',
        'caution',
        'avance',
        'commission_mois',
        'duree_minimum_jours',
        'nombre_chambres',
        'nombre_salles_bain',
        'surface_m2',
        'meuble',
        'type_locataire_prefere',
        'commodites',
        'photos',
        'photo_principale',
        'statut',
        'disponible',
        'date_disponibilite',
        'slug',
        'publie_at',
        'expire_at',
        'raison_suspension',
        'moderated_by',
        'moderated_at',
        'vues_count',
        'favoris_count',
        'contacts_count',
        'renouvellements_count',
        'latitude',
        'longitude',
        'rented_via_immoguinee',
        'rented_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'photo_principale',
        'main_photo_url',
        'formatted_price',
        'photos', // Return listingPhotos relation as 'photos' for mobile app compatibility
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'searchable_keywords',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'loyer_mensuel' => 'decimal:2',
            'caution' => 'decimal:2',
            'avance' => 'decimal:2',
            'commission_mois' => 'integer',
            'duree_minimum_jours' => 'integer',
            'nombre_chambres' => 'integer',
            'nombre_salles_bain' => 'integer',
            'surface_m2' => 'integer',
            'meuble' => 'boolean',
            'commodites' => 'array',
            // Note: 'photos' is handled by getPhotosAttribute accessor, not a cast
            'searchable_keywords' => 'array',
            'disponible' => 'boolean',
            'rented_via_immoguinee' => 'boolean',
            'date_disponibilite' => 'date',
            'publie_at' => 'datetime',
            'expire_at' => 'datetime',
            'moderated_at' => 'datetime',
            'rented_at' => 'datetime',
            'vues_count' => 'integer',
            'favoris_count' => 'integer',
            'contacts_count' => 'integer',
            'renouvellements_count' => 'integer',
        ];
    }

    // ==================== ELASTICSEARCH CONFIGURATION ====================

    /**
     * Get the indexable data array for the model (Elasticsearch).
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'titre' => $this->titre,
            'description' => $this->description,
            'type_bien' => $this->type_bien,
            'quartier' => $this->quartier,
            'commune' => $this->commune,
            'loyer_mensuel' => $this->loyer_mensuel,
            'caution' => $this->caution,
            'nombre_chambres' => $this->nombre_chambres,
            'nombre_salles_bain' => $this->nombre_salles_bain,
            'surface_m2' => $this->surface_m2,
            'meuble' => $this->meuble,
            'commodites' => $this->commodites,
            'statut' => $this->statut,
            'disponible' => $this->disponible,
            'publie_at' => $this->publie_at?->timestamp,
            'location' => $this->getLocationForSearch(),
            'user_badge' => $this->user?->badge,
            'user_rating' => $this->user?->avg_rating,
        ];
    }

    /**
     * Get the index name for the model (Elasticsearch).
     */
    public function searchableAs(): string
    {
        return config('scout.prefix') . 'listings';
    }

    /**
     * Determine if the model should be searchable.
     */
    public function shouldBeSearchable(): bool
    {
        return $this->statut === 'ACTIVE' && $this->disponible;
    }

    /**
     * Get location data for Elasticsearch geo queries.
     */
    protected function getLocationForSearch(): ?array
    {
        // Format for Elasticsearch geo_point
        // Will be populated from PostGIS geometry column
        if ($this->location) {
            // Parse PostGIS POINT(longitude latitude)
            return [
                'lat' => $this->latitude,
                'lon' => $this->longitude,
            ];
        }

        return null;
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The user (landlord/owner) who owns this listing.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Contracts associated with this listing.
     */
    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * Get the Facebook posts for this listing.
     * Tracks posts published to Facebook for auto-deletion.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function facebookPosts()
    {
        return $this->hasMany(FacebookPost::class);
    }

    /**
     * Get the latest published Facebook post for this listing.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function latestFacebookPost()
    {
        return $this->hasOne(FacebookPost::class)
            ->where('status', 'published')
            ->latest('published_at');
    }

    /**
     * Conversations about this listing.
     */
    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * Users who favorited this listing.
     */
    public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'favorites')
            ->withTimestamps();
    }

    /**
     * Photos for this listing (stored in MinIO).
     */
    public function listingPhotos()
    {
        return $this->hasMany(ListingPhoto::class)->orderBy('order');
    }

    /**
     * Get the primary photo.
     */
    public function primaryPhoto()
    {
        return $this->hasOne(ListingPhoto::class)->where('is_primary', true);
    }

    /**
     * Views/analytics for this listing.
     */
    public function views()
    {
        return $this->hasMany(PropertyView::class);
    }

    /**
     * Moderator who moderated this listing.
     */
    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    /**
     * Transactions for this listing.
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Reports against this listing.
     */
    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Alias for photos relationship (used by ModeratorController).
     */
    public function photos()
    {
        return $this->listingPhotos();
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Active listings only.
     */
    public function scopeActive($query)
    {
        return $query->where('statut', 'ACTIVE')
            ->where('disponible', true)
            ->where('expire_at', '>', now());
    }

    /**
     * Scope: Available listings.
     */
    public function scopeAvailable($query)
    {
        return $query->where('disponible', true);
    }

    /**
     * Scope: Listings by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type_bien', $type);
    }

    /**
     * Scope: Listings in specific quartier.
     */
    public function scopeInQuartier($query, string $quartier)
    {
        return $query->where('quartier', $quartier);
    }

    /**
     * Scope: Listings within price range.
     */
    public function scopeWithinPriceRange($query, float $min, float $max)
    {
        return $query->whereBetween('loyer_mensuel', [$min, $max]);
    }

    /**
     * Scope: Listings with minimum number of rooms.
     */
    public function scopeWithMinRooms($query, int $rooms)
    {
        return $query->where('nombre_chambres', '>=', $rooms);
    }

    /**
     * Scope: Furnished listings only.
     */
    public function scopeFurnished($query)
    {
        return $query->where('meuble', true);
    }

    /**
     * Scope: Listings expiring soon (within days).
     */
    public function scopeExpiringSoon($query, int $days = 7)
    {
        return $query->where('expire_at', '<=', now()->addDays($days))
            ->where('expire_at', '>', now());
    }

    /**
     * Scope: Popular listings (by views).
     */
    public function scopePopular($query, int $minViews = 100)
    {
        return $query->where('vues_count', '>=', $minViews)
            ->orderByDesc('vues_count');
    }

    // ==================== ACCESSORS & MUTATORS ====================

    /**
     * Generate slug from title.
     */
    public function setTitreAttribute(string $value): void
    {
        $this->attributes['titre'] = $value;

        // Generate slug if not exists
        if (empty($this->attributes['slug'])) {
            $this->attributes['slug'] = \Str::slug($value) . '-' . \Str::random(6);
        }
    }

    /**
     * Get the main photo URL or placeholder.
     * Prioritizes the primary photo from listingPhotos relationship.
     * Uses already-loaded relationship when available (for eager loading optimization).
     */
    public function getMainPhotoUrlAttribute(): string
    {
        // Use already-loaded relationship if available (eager loading)
        if ($this->relationLoaded('listingPhotos')) {
            $photos = $this->listingPhotos;

            // Find primary photo
            $primaryPhoto = $photos->firstWhere('is_primary', true);
            if ($primaryPhoto) {
                return $primaryPhoto->medium_url ?? $primaryPhoto->url;
            }

            // Fallback to first photo
            $firstPhoto = $photos->sortBy('order')->first();
            if ($firstPhoto) {
                return $firstPhoto->medium_url ?? $firstPhoto->url;
            }
        } else {
            // Fallback to query if relationship not loaded
            $primaryPhoto = $this->listingPhotos()->where('is_primary', true)->first();
            if ($primaryPhoto) {
                return $primaryPhoto->medium_url ?? $primaryPhoto->url;
            }

            $firstPhoto = $this->listingPhotos()->orderBy('order')->first();
            if ($firstPhoto) {
                return $firstPhoto->medium_url ?? $firstPhoto->url;
            }
        }

        // Final fallback to legacy photo_principale column
        if (!empty($this->attributes['photo_principale']) && is_string($this->attributes['photo_principale'])) {
            return $this->attributes['photo_principale'];
        }

        // Fallback to photos array if it contains valid URLs
        if (!empty($this->photos) && is_array($this->photos)) {
            $firstPhoto = $this->photos[0] ?? null;
            if (is_string($firstPhoto) && filter_var($firstPhoto, FILTER_VALIDATE_URL)) {
                return $firstPhoto;
            }
        }

        // Default placeholder - return absolute URL
        return config('app.url', 'https://immoguinee.com') . '/images/placeholder.jpg';
    }

    /**
     * Get the photo_principale attribute (accessor).
     * Returns the primary photo URL from listingPhotos relationship.
     * Uses already-loaded relationship when available (for eager loading optimization).
     */
    public function getPhotoPrincipaleAttribute(): ?string
    {
        // Check if there's a stored value
        if (!empty($this->attributes['photo_principale']) && is_string($this->attributes['photo_principale'])) {
            return $this->attributes['photo_principale'];
        }

        // Use already-loaded relationship if available
        if ($this->relationLoaded('listingPhotos')) {
            $photos = $this->listingPhotos;

            $primaryPhoto = $photos->firstWhere('is_primary', true);
            if ($primaryPhoto) {
                return $primaryPhoto->medium_url ?? $primaryPhoto->url;
            }

            $firstPhoto = $photos->sortBy('order')->first();
            if ($firstPhoto) {
                return $firstPhoto->medium_url ?? $firstPhoto->url;
            }
        } else {
            // Fallback to query if relationship not loaded
            $primaryPhoto = $this->listingPhotos()->where('is_primary', true)->first();
            if ($primaryPhoto) {
                return $primaryPhoto->medium_url ?? $primaryPhoto->url;
            }

            $firstPhoto = $this->listingPhotos()->orderBy('order')->first();
            if ($firstPhoto) {
                return $firstPhoto->medium_url ?? $firstPhoto->url;
            }
        }

        return null;
    }

    /**
     * Get the photos attribute (accessor).
     * Returns the listingPhotos relation data as 'photos' for mobile app compatibility.
     * This overrides the legacy 'photos' database column.
     */
    public function getPhotosAttribute(): array
    {
        // Use already-loaded relationship if available (eager loading optimization)
        if ($this->relationLoaded('listingPhotos')) {
            $photos = $this->listingPhotos;
            if ($photos->isNotEmpty()) {
                return $photos->toArray();
            }
        } else {
            // Query relationship if not loaded
            $photos = $this->listingPhotos()->orderBy('order')->get();
            if ($photos->isNotEmpty()) {
                return $photos->toArray();
            }
        }

        // Fallback to legacy photos column if exists (for old data)
        $legacyPhotos = $this->attributes['photos'] ?? null;
        if ($legacyPhotos) {
            $decoded = is_string($legacyPhotos) ? json_decode($legacyPhotos, true) : $legacyPhotos;
            if (is_array($decoded) && !empty($decoded)) {
                // Convert legacy URL strings to photo-like objects for consistency
                return array_map(function ($url, $index) {
                    return [
                        'id' => null,
                        'url' => $url,
                        'thumbnail_url' => $url,
                        'medium_url' => $url,
                        'large_url' => $url,
                        'is_primary' => $index === 0,
                        'order' => $index,
                    ];
                }, $decoded, array_keys($decoded));
            }
        }

        return [];
    }

    /**
     * Check if listing is expired.
     */
    public function getIsExpiredAttribute(): bool
    {
        return $this->expire_at && $this->expire_at->isPast();
    }

    /**
     * Check if listing can be renewed (FR-013).
     */
    public function canRenew(): bool
    {
        return $this->statut === 'EXPIREE' ||
            ($this->expire_at && $this->expire_at->diffInDays(now()) <= 7);
    }

    /**
     * Renew listing for another 30 days (FR-013).
     */
    public function renew(): bool
    {
        if (!$this->canRenew()) {
            return false;
        }

        $this->statut = 'ACTIVE';
        $this->expire_at = now()->addDays(config('app.listing_duration_days', 30));
        $this->renouvellements_count++;

        return $this->save();
    }

    /**
     * Increment view count.
     */
    public function incrementViews(): void
    {
        $this->increment('vues_count');
    }

    /**
     * Increment favorites count.
     */
    public function incrementFavorites(): void
    {
        $this->increment('favoris_count');
    }

    /**
     * Decrement favorites count.
     */
    public function decrementFavorites(): void
    {
        $this->decrement('favoris_count');
    }

    /**
     * Increment contacts count.
     */
    public function incrementContacts(): void
    {
        $this->increment('contacts_count');
    }

    /**
     * Check if listing has specific amenity.
     */
    public function hasAmenity(string $amenity): bool
    {
        return in_array($amenity, $this->commodites ?? []);
    }

    /**
     * Get formatted price with currency.
     */
    public function getFormattedPriceAttribute(): string
    {
        return number_format($this->loyer_mensuel, 0, ',', ' ') . ' GNF';
    }

    // ==================== BOOT ====================

    protected static function booted(): void
    {
        // Delete photos from storage when listing is deleted (soft or force)
        static::deleting(function (Listing $listing) {
            // Delete all photos - this triggers ListingPhoto::deleting which removes from storage
            $listing->listingPhotos()->each(function (ListingPhoto $photo) {
                $photo->delete();
            });
        });
    }
}
