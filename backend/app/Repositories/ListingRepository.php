<?php

namespace App\Repositories;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ListingRepository
{
    protected int $cacheTtl = 300; // 5 minutes

    /**
     * Find listing by ID
     *
     * @param string $id
     * @return Listing|null
     */
    public function findById(string $id): ?Listing
    {
        return Cache::remember("listing:{$id}", $this->cacheTtl, function () use ($id) {
            return Listing::with(['user', 'listingPhotos'])->find($id);
        });
    }

    /**
     * Invalidate listing cache
     */
    public function invalidateCache(string $id): void
    {
        Cache::forget("listing:{$id}");
        Cache::forget('listings:latest');
    }

    /**
     * Create a new listing
     *
     * @param array $data
     * @return Listing
     */
    public function create(array $data): Listing
    {
        return Listing::create($data);
    }

    /**
     * Update listing
     *
     * @param string $id
     * @param array $data
     * @return Listing
     */
    public function update(string $id, array $data): Listing
    {
        $listing = $this->findById($id);
        $listing->update($data);
        return $listing->fresh();
    }

    /**
     * Delete listing (soft delete)
     *
     * @param string $id
     * @return bool
     */
    public function delete(string $id): bool
    {
        $listing = $this->findById($id);
        return $listing->delete();
    }

    /**
     * Get all listings with pagination and filters
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function getAllPaginated(int $perPage = 20, array $filters = []): LengthAwarePaginator
    {
        $query = Listing::query()->with(['user', 'listingPhotos']);

        // Apply filters
        if (isset($filters['type_bien'])) {
            // Support multiple types (comma-separated) for "Commerces" filter
            $types = is_array($filters['type_bien'])
                ? $filters['type_bien']
                : explode(',', $filters['type_bien']);

            if (count($types) === 1) {
                $query->where('type_bien', $types[0]);
            } else {
                $query->whereIn('type_bien', array_map('trim', $types));
            }
        }

        if (isset($filters['type_transaction'])) {
            $query->where('type_transaction', strtoupper($filters['type_transaction']));
        }

        if (isset($filters['prix_min'])) {
            $query->where('prix', '>=', $filters['prix_min']);
        }

        if (isset($filters['prix_max'])) {
            $query->where('prix', '<=', $filters['prix_max']);
        }

        if (isset($filters['nb_chambres'])) {
            $query->where('nb_chambres', '>=', $filters['nb_chambres']);
        }

        if (isset($filters['quartier'])) {
            // Support multiple quartiers (comma-separated) for nearby search
            $quartiers = is_array($filters['quartier'])
                ? $filters['quartier']
                : explode(',', $filters['quartier']);

            if (count($quartiers) === 1) {
                // Single quartier - use unaccent for accent-insensitive search (kipe = kipé)
                $query->whereRaw('unaccent(LOWER(quartier)) LIKE unaccent(LOWER(?))', ['%' . $quartiers[0] . '%']);
            } else {
                // Multiple quartiers - search for any match
                $query->where(function($q) use ($quartiers) {
                    foreach ($quartiers as $quartier) {
                        $q->orWhereRaw('unaccent(LOWER(quartier)) LIKE unaccent(LOWER(?))', ['%' . trim($quartier) . '%']);
                    }
                });
            }
        }

        if (isset($filters['commune'])) {
            $query->where('commune', $filters['commune']);
        }

        // Text search across multiple fields
        if (isset($filters['q']) && !empty($filters['q'])) {
            $searchTerm = '%' . $filters['q'] . '%';
            $query->where(function($q) use ($searchTerm) {
                $q->whereRaw('LOWER(titre) LIKE LOWER(?)', [$searchTerm])
                  ->orWhereRaw('LOWER(description) LIKE LOWER(?)', [$searchTerm])
                  ->orWhereRaw('LOWER(commune) LIKE LOWER(?)', [$searchTerm])
                  ->orWhereRaw('LOWER(quartier) LIKE LOWER(?)', [$searchTerm]);
            });
        }

        // Support both prix and loyer_mensuel for price filters
        if (isset($filters['prix_min']) && !isset($filters['prix'])) {
            $query->where('loyer_mensuel', '>=', $filters['prix_min']);
        }
        if (isset($filters['prix_max']) && !isset($filters['prix'])) {
            $query->where('loyer_mensuel', '<=', $filters['prix_max']);
        }

        // Support chambres_min filter
        if (isset($filters['chambres_min'])) {
            $query->where('nombre_chambres', '>=', $filters['chambres_min']);
        }

        // Filter by user_id (for "my listings")
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
            // Don't apply status filter for user's own listings - show all statuses
        } elseif (isset($filters['statut'])) {
            $query->where('statut', $filters['statut']);
        } else {
            // By default, only show active/published listings (for public view)
            $query->whereIn('statut', ['ACTIVE', 'publie', 'published']);
        }

        if (isset($filters['meuble'])) {
            $query->where('meuble', $filters['meuble']);
        }

        if (isset($filters['badge'])) {
            $query->whereHas('user', function($q) use ($filters) {
                $q->where('badge', $filters['badge']);
            });
        }

        // Search by title or description
        if (isset($filters['search'])) {
            $query->where(function($q) use ($filters) {
                $q->where('titre', 'ILIKE', "%{$filters['search']}%")
                  ->orWhere('description', 'ILIKE', "%{$filters['search']}%");
            });
        }

        // Geolocation filter (within radius)
        if (isset($filters['latitude']) && isset($filters['longitude']) && isset($filters['radius_km'])) {
            $lat = $filters['latitude'];
            $lng = $filters['longitude'];
            $radius = $filters['radius_km'];

            $query->whereRaw("ST_DWithin(
                geolocalisation::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                ?
            )", [$lng, $lat, $radius * 1000]); // Convert km to meters
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        switch ($sortBy) {
            case 'prix':
            case 'loyer_mensuel':
                $query->orderBy('loyer_mensuel', $sortOrder);
                break;
            case 'surface_m2':
            case 'surface':
                $query->orderBy('surface_m2', $sortOrder);
                break;
            case 'vues':
                $query->orderBy('nb_vues', 'desc');
                break;
            case 'pertinence':
                // TODO: Implement relevance scoring with Elasticsearch
                $query->orderBy('created_at', 'desc');
                break;
            default:
                $query->orderBy('created_at', $sortOrder);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get listings by user
     *
     * @param User $user
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByUser(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return $user->listings()
            ->with(['listingPhotos'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get active listings by user
     *
     * @param User $user
     * @return Collection
     */
    public function getActiveByUser(User $user): Collection
    {
        return $user->listings()
            ->whereIn('statut', ['ACTIVE', 'publie', 'published'])
            ->with(['listingPhotos'])
            ->get();
    }

    /**
     * Increment view counter
     *
     * @param string $id
     * @return void
     */
    public function incrementViews(string $id): void
    {
        // Use direct DB update to avoid cache issues
        Listing::where('id', $id)->increment('vues_count');
    }

    /**
     * Increment contact counter
     *
     * @param string $id
     * @return void
     */
    public function incrementContacts(string $id): void
    {
        // Use direct DB update to avoid cache issues
        Listing::where('id', $id)->increment('contacts_count');
    }

    /**
     * Apply premium badge to listing
     *
     * @param string $id
     * @param bool $urgent
     * @param int $durationHours
     * @return Listing
     */
    public function applyPremiumBadge(string $id, bool $urgent = false, int $durationHours = 48): Listing
    {
        $listing = $this->findById($id);
        $listing->badge_premium = $urgent ? 'urgent' : 'premium';
        $listing->publie_at = now();
        $listing->expire_at = now()->addHours($durationHours);
        $listing->save();

        return $listing;
    }

    /**
     * Get expired listings (> 90 days)
     *
     * @return Collection
     */
    public function getExpiredListings(): Collection
    {
        return Listing::where('statut', 'publie')
            ->where('created_at', '<', now()->subDays(90))
            ->get();
    }

    /**
     * Expire listing
     *
     * @param Listing $listing
     * @return Listing
     */
    public function expireListing(Listing $listing): Listing
    {
        $listing->statut = 'expire';
        $listing->save();
        return $listing;
    }

    /**
     * Get listings with expired premium badges
     *
     * @return Collection
     */
    public function getExpiredPremiumListings(): Collection
    {
        return Listing::whereNotNull('premium_expires_at')
            ->where('premium_expires_at', '<', now())
            ->whereNotNull('badge_premium')
            ->get();
    }

    /**
     * Remove premium badge
     *
     * @param Listing $listing
     * @return Listing
     */
    public function removePremiumBadge(Listing $listing): Listing
    {
        $listing->badge_premium = null;
        $listing->premium_expires_at = null;
        $listing->save();
        return $listing;
    }

    /**
     * Get similar listings
     *
     * @param string $id
     * @param int $limit
     * @return Collection
     */
    public function getSimilarListings(string $id, int $limit = 5): Collection
    {
        $listing = $this->findById($id);

        return Listing::where('id', '!=', $listing->id)
            ->where('type_bien', $listing->type_bien)
            ->where('commune', $listing->commune)
            ->where('statut', 'disponible')
            ->whereBetween('loyer_mensuel', [
                $listing->loyer_mensuel * 0.7,
                $listing->loyer_mensuel * 1.3
            ])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get listings near location
     *
     * @param float $latitude
     * @param float $longitude
     * @param int $radiusKm
     * @param int $limit
     * @return Collection
     */
    public function getNearbyListings(float $latitude, float $longitude, int $radiusKm = 5, int $limit = 10): Collection
    {
        return Listing::whereRaw("ST_DWithin(
                geolocalisation::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                ?
            )", [$longitude, $latitude, $radiusKm * 1000])
            ->where('statut', 'publie')
            ->orderByRaw("ST_Distance(
                geolocalisation::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
            )", [$longitude, $latitude])
            ->limit($limit)
            ->get();
    }

    /**
     * Get popular listings (most viewed)
     *
     * @param int $limit
     * @return Collection
     */
    public function getPopularListings(int $limit = 10): Collection
    {
        return Listing::where('statut', 'publie')
            ->orderBy('nb_vues', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get latest listings (cached)
     *
     * @param int $limit
     * @return Collection
     */
    public function getLatestListings(int $limit = 20): Collection
    {
        return Cache::remember("listings:latest:{$limit}", $this->cacheTtl, function () use ($limit) {
            return Listing::whereIn('statut', ['ACTIVE', 'publie', 'published'])
                ->with(['user', 'listingPhotos'])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();
        });
    }

    /**
     * Publish listing
     *
     * @param Listing $listing
     * @return Listing
     */
    public function publish(Listing $listing): Listing
    {
        $listing->statut = 'publie';
        $listing->date_publication = now();
        $listing->save();
        return $listing;
    }

    /**
     * Unpublish listing
     *
     * @param Listing $listing
     * @return Listing
     */
    public function unpublish(Listing $listing): Listing
    {
        $listing->statut = 'brouillon';
        $listing->save();
        return $listing;
    }

    /**
     * Suspend listing
     *
     * @param Listing $listing
     * @param string $reason
     * @return Listing
     */
    public function suspend(Listing $listing, string $reason = null): Listing
    {
        $listing->statut = 'suspendu';
        $listing->suspension_reason = $reason;
        $listing->save();
        return $listing;
    }
}
