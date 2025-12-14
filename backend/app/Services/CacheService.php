<?php

namespace App\Services;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

/**
 * T262: Redis Caching Service (FR-095)
 *
 * Handles caching strategies for:
 * - Popular listings
 * - User profiles
 * - Search results
 * - Static data (quartiers, types)
 */
class CacheService
{
    /**
     * Cache TTL configurations (in seconds)
     */
    private const TTL = [
        'popular_listings' => 3600,      // 1 hour
        'listing_detail' => 1800,        // 30 minutes
        'user_profile' => 900,           // 15 minutes
        'search_results' => 600,         // 10 minutes
        'quartiers' => 86400,            // 24 hours
        'statistics' => 300,             // 5 minutes
    ];

    /**
     * Cache tags for easy invalidation
     */
    private const TAGS = [
        'listings' => 'listings',
        'users' => 'users',
        'search' => 'search',
        'static' => 'static',
    ];

    // ==================== LISTINGS CACHE ====================

    /**
     * Get popular listings from cache or database
     */
    public function getPopularListings(int $limit = 20): array
    {
        $cacheKey = "popular_listings:{$limit}";

        return Cache::tags([self::TAGS['listings']])
            ->remember($cacheKey, self::TTL['popular_listings'], function () use ($limit) {
                return Listing::query()
                    ->where('statut', 'PUBLIE')
                    ->withCount('views')
                    ->orderByDesc('views_count')
                    ->orderByDesc('created_at')
                    ->limit($limit)
                    ->get()
                    ->toArray();
            });
    }

    /**
     * Get listing detail from cache
     */
    public function getListingDetail(string $listingId): ?array
    {
        $cacheKey = "listing:{$listingId}";

        return Cache::tags([self::TAGS['listings']])
            ->remember($cacheKey, self::TTL['listing_detail'], function () use ($listingId) {
                $listing = Listing::with(['proprietaire', 'photos', 'quartier'])
                    ->find($listingId);

                return $listing?->toArray();
            });
    }

    /**
     * Invalidate listing cache
     */
    public function invalidateListing(string $listingId): void
    {
        Cache::tags([self::TAGS['listings']])->forget("listing:{$listingId}");
    }

    /**
     * Invalidate all listings cache
     */
    public function invalidateAllListings(): void
    {
        Cache::tags([self::TAGS['listings']])->flush();
    }

    // ==================== USER CACHE ====================

    /**
     * Get user profile from cache
     */
    public function getUserProfile(string $userId): ?array
    {
        $cacheKey = "user:{$userId}";

        return Cache::tags([self::TAGS['users']])
            ->remember($cacheKey, self::TTL['user_profile'], function () use ($userId) {
                $user = User::with(['roles'])
                    ->withCount(['listings', 'contracts', 'ratings'])
                    ->find($userId);

                return $user?->toArray();
            });
    }

    /**
     * Invalidate user cache
     */
    public function invalidateUser(string $userId): void
    {
        Cache::tags([self::TAGS['users']])->forget("user:{$userId}");
    }

    // ==================== SEARCH CACHE ====================

    /**
     * Cache search results
     */
    public function cacheSearchResults(string $queryHash, array $results): void
    {
        Cache::tags([self::TAGS['search']])
            ->put("search:{$queryHash}", $results, self::TTL['search_results']);
    }

    /**
     * Get cached search results
     */
    public function getCachedSearchResults(string $queryHash): ?array
    {
        return Cache::tags([self::TAGS['search']])
            ->get("search:{$queryHash}");
    }

    /**
     * Generate hash for search query
     */
    public function generateSearchHash(array $params): string
    {
        ksort($params);
        return md5(json_encode($params));
    }

    /**
     * Invalidate search cache
     */
    public function invalidateSearchCache(): void
    {
        Cache::tags([self::TAGS['search']])->flush();
    }

    // ==================== STATIC DATA CACHE ====================

    /**
     * Get quartiers list
     */
    public function getQuartiers(): array
    {
        return Cache::tags([self::TAGS['static']])
            ->remember('quartiers', self::TTL['quartiers'], function () {
                return \DB::table('quartiers')
                    ->select('id', 'nom', 'ville', 'commune')
                    ->orderBy('ville')
                    ->orderBy('nom')
                    ->get()
                    ->toArray();
            });
    }

    /**
     * Get property types
     */
    public function getPropertyTypes(): array
    {
        return Cache::tags([self::TAGS['static']])
            ->remember('property_types', self::TTL['quartiers'], function () {
                return [
                    'APPARTEMENT' => 'Appartement',
                    'MAISON' => 'Maison',
                    'STUDIO' => 'Studio',
                    'VILLA' => 'Villa',
                    'BUREAU' => 'Bureau',
                    'MAGASIN' => 'Magasin',
                    'TERRAIN' => 'Terrain',
                    'DUPLEX' => 'Duplex',
                ];
            });
    }

    // ==================== STATISTICS CACHE ====================

    /**
     * Get platform statistics
     */
    public function getStatistics(): array
    {
        return Cache::remember('platform_statistics', self::TTL['statistics'], function () {
            return [
                'total_listings' => Listing::where('statut', 'PUBLIE')->count(),
                'total_users' => User::count(),
                'average_rent' => Listing::where('statut', 'PUBLIE')->avg('prix_loyer_gnf'),
                'listings_by_type' => Listing::where('statut', 'PUBLIE')
                    ->groupBy('type_bien')
                    ->selectRaw('type_bien, count(*) as count')
                    ->pluck('count', 'type_bien')
                    ->toArray(),
            ];
        });
    }

    // ==================== RATE LIMITING ====================

    /**
     * Check if request should be rate limited
     */
    public function isRateLimited(string $key, int $maxAttempts, int $decaySeconds): bool
    {
        $attempts = Redis::get("rate_limit:{$key}") ?? 0;

        if ($attempts >= $maxAttempts) {
            return true;
        }

        Redis::multi();
        Redis::incr("rate_limit:{$key}");
        Redis::expire("rate_limit:{$key}", $decaySeconds);
        Redis::exec();

        return false;
    }

    /**
     * Get remaining rate limit attempts
     */
    public function getRateLimitRemaining(string $key, int $maxAttempts): int
    {
        $attempts = Redis::get("rate_limit:{$key}") ?? 0;
        return max(0, $maxAttempts - $attempts);
    }

    // ==================== CACHE WARMING ====================

    /**
     * Warm up critical caches
     */
    public function warmUp(): void
    {
        // Popular listings
        $this->getPopularListings(20);

        // Quartiers
        $this->getQuartiers();

        // Property types
        $this->getPropertyTypes();

        // Statistics
        $this->getStatistics();
    }

    /**
     * Clear all caches
     */
    public function clearAll(): void
    {
        Cache::flush();
    }
}
