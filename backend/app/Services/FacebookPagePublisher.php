<?php

namespace App\Services;

use App\Models\FacebookPageConnection;
use App\Models\FacebookPost;
use App\Models\Listing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\App;
use Exception;

/**
 * Facebook Page Publisher Service
 *
 * Publishes listings to Facebook Pages with watermarked images.
 *
 * Features:
 * - Builds i18n post content from listing data
 * - Uploads watermarked images to Facebook
 * - Stores facebook_post_id for later deletion
 * - Handles errors gracefully with i18n error codes
 *
 * Security:
 * - Tokens NEVER logged
 * - Images watermarked before upload
 * - Cleanup of temp files after upload
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookPagePublisher
{
    /**
     * Facebook Graph API base URL.
     */
    protected const GRAPH_API_URL = 'https://graph.facebook.com';

    /**
     * Graph API version.
     */
    protected string $apiVersion;

    /**
     * Image watermark service.
     */
    protected ImageWatermarkService $watermarkService;

    /**
     * Storage service.
     */
    protected StorageService $storageService;

    /**
     * Maximum description length for Facebook post.
     */
    protected int $maxDescriptionLength;

    /**
     * Hashtags to append to posts.
     */
    protected array $hashtags;

    public function __construct(
        ImageWatermarkService $watermarkService,
        StorageService $storageService
    ) {
        $this->watermarkService = $watermarkService;
        $this->storageService = $storageService;
        $this->apiVersion = config('facebook.api_version', 'v18.0');
        $this->maxDescriptionLength = config('facebook.post.max_description_length', 500);
        $this->hashtags = config('facebook.post.hashtags', ['#ImmoGuinée', '#Immobilier', '#Guinée']);
    }

    /**
     * Publish a listing to Facebook Page.
     *
     * @param Listing $listing
     * @param FacebookPageConnection $connection
     * @param bool $withImage Include primary image with watermark
     * @return FacebookPost
     * @throws Exception
     */
    public function publish(Listing $listing, FacebookPageConnection $connection, bool $withImage = true): FacebookPost
    {
        // Check if already published
        $existingPost = FacebookPost::where('listing_id', $listing->id)
            ->where('facebook_page_connection_id', $connection->id)
            ->where('status', FacebookPost::STATUS_PUBLISHED)
            ->first();

        if ($existingPost) {
            Log::info('Listing already published to Facebook', [
                'listing_id' => $listing->id,
                'facebook_post_id' => $existingPost->facebook_post_id,
            ]);
            return $existingPost;
        }

        $tempImagePath = null;

        try {
            // Get decrypted page access token
            $pageAccessToken = $connection->page_access_token;
            $pageId = $connection->page_id;

            // Build post content
            $postContent = $this->buildPostContent($listing);

            // Publish with or without image
            if ($withImage && $this->hasImage($listing)) {
                $facebookPostId = $this->publishWithImage(
                    $pageId,
                    $pageAccessToken,
                    $postContent,
                    $listing,
                    $tempImagePath
                );
            } else {
                $facebookPostId = $this->publishTextOnly(
                    $pageId,
                    $pageAccessToken,
                    $postContent
                );
            }

            // Create Facebook post record
            $facebookPost = FacebookPost::create([
                'listing_id' => $listing->id,
                'facebook_page_connection_id' => $connection->id,
                'facebook_post_id' => $facebookPostId,
                'status' => FacebookPost::STATUS_PUBLISHED,
                'published_at' => now(),
            ]);

            Log::info('Listing published to Facebook', [
                'listing_id' => $listing->id,
                'page_id' => $pageId,
                'facebook_post_id' => $facebookPostId,
            ]);

            return $facebookPost;

        } catch (Exception $e) {
            // Create failed post record for tracking
            $facebookPost = FacebookPost::create([
                'listing_id' => $listing->id,
                'facebook_page_connection_id' => $connection->id,
                'facebook_post_id' => '',
                'status' => FacebookPost::STATUS_FAILED,
                'error_message' => $this->mapErrorToI18nKey($e->getMessage()),
            ]);

            Log::error('Facebook publish failed', [
                'listing_id' => $listing->id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('facebook.error.publish_failed');

        } finally {
            // Always cleanup temp watermarked image
            if ($tempImagePath) {
                $this->watermarkService->cleanup($tempImagePath);
            }
        }
    }

    /**
     * Build the post content from listing data.
     *
     * @param Listing $listing
     * @return string
     */
    public function buildPostContent(Listing $listing): string
    {
        $locale = App::getLocale();

        // Get translated property type
        $propertyType = $this->translatePropertyType($listing->type_bien, $locale);

        // Get translated transaction type
        $transactionType = $this->translateTransactionType($listing->type_transaction, $locale);

        // Format price
        $price = $this->formatPrice($listing);

        // Build location string
        $location = $this->buildLocationString($listing);

        // Build listing URL
        $url = $this->buildListingUrl($listing);

        // Get template based on locale
        if ($locale === 'en') {
            $content = $this->buildEnglishContent($listing, $propertyType, $transactionType, $price, $location, $url);
        } else {
            $content = $this->buildFrenchContent($listing, $propertyType, $transactionType, $price, $location, $url);
        }

        // Add hashtags
        $content .= "\n\n" . implode(' ', $this->hashtags);

        return $content;
    }

    /**
     * Build French post content.
     */
    protected function buildFrenchContent(
        Listing $listing,
        string $propertyType,
        string $transactionType,
        string $price,
        string $location,
        string $url
    ): string {
        $lines = [];

        // Title with emoji
        $lines[] = "🏠 {$listing->titre}";
        $lines[] = "";

        // Price
        $lines[] = "💰 Prix: {$price}";

        // Location
        $lines[] = "📍 {$location}";

        // Property type
        $lines[] = "🏷️ {$propertyType} - {$transactionType}";

        // Features (if available)
        $features = $this->buildFeaturesString($listing, 'fr');
        if ($features) {
            $lines[] = "✨ {$features}";
        }

        // Description (truncated)
        if ($listing->description) {
            $description = $this->truncateDescription($listing->description);
            if ($description) {
                $lines[] = "";
                $lines[] = $description;
            }
        }

        // Call to action
        $lines[] = "";
        $lines[] = "👉 Voir l'annonce: {$url}";

        return implode("\n", $lines);
    }

    /**
     * Build English post content.
     */
    protected function buildEnglishContent(
        Listing $listing,
        string $propertyType,
        string $transactionType,
        string $price,
        string $location,
        string $url
    ): string {
        $lines = [];

        // Title with emoji
        $lines[] = "🏠 {$listing->titre}";
        $lines[] = "";

        // Price
        $lines[] = "💰 Price: {$price}";

        // Location
        $lines[] = "📍 {$location}";

        // Property type
        $lines[] = "🏷️ {$propertyType} - {$transactionType}";

        // Features (if available)
        $features = $this->buildFeaturesString($listing, 'en');
        if ($features) {
            $lines[] = "✨ {$features}";
        }

        // Description (truncated)
        if ($listing->description) {
            $description = $this->truncateDescription($listing->description);
            if ($description) {
                $lines[] = "";
                $lines[] = $description;
            }
        }

        // Call to action
        $lines[] = "";
        $lines[] = "👉 View listing: {$url}";

        return implode("\n", $lines);
    }

    /**
     * Publish a text-only post to Facebook.
     */
    protected function publishTextOnly(string $pageId, string $accessToken, string $message): string
    {
        $response = Http::post(
            self::GRAPH_API_URL . '/' . $this->apiVersion . '/' . $pageId . '/feed',
            [
                'message' => $message,
                'access_token' => $accessToken,
            ]
        );

        if (!$response->successful()) {
            $error = $response->json('error.message', 'Unknown error');
            throw new Exception($error);
        }

        $postId = $response->json('id');

        if (!$postId) {
            throw new Exception('No post ID returned');
        }

        return $postId;
    }

    /**
     * Publish a post with image to Facebook.
     */
    protected function publishWithImage(
        string $pageId,
        string $accessToken,
        string $message,
        Listing $listing,
        ?string &$tempImagePath
    ): string {
        // Get primary image path
        $imagePath = $this->getPrimaryImagePath($listing);

        if (!$imagePath) {
            // Fall back to text-only if no image
            return $this->publishTextOnly($pageId, $accessToken, $message);
        }

        // Apply watermark
        $tempImagePath = $this->watermarkService->apply($imagePath);

        // Upload photo with message
        $response = Http::attach(
            'source',
            file_get_contents($tempImagePath),
            'listing_image.jpg'
        )->post(
            self::GRAPH_API_URL . '/' . $this->apiVersion . '/' . $pageId . '/photos',
            [
                'message' => $message,
                'access_token' => $accessToken,
            ]
        );

        if (!$response->successful()) {
            $error = $response->json('error.message', 'Unknown error');
            throw new Exception($error);
        }

        // For photo posts, the ID format is different
        $postId = $response->json('post_id') ?? $response->json('id');

        if (!$postId) {
            throw new Exception('No post ID returned');
        }

        return $postId;
    }

    /**
     * Check if listing has an image.
     */
    protected function hasImage(Listing $listing): bool
    {
        // Check for listing photos relation
        if ($listing->relationLoaded('listingPhotos') && $listing->listingPhotos->isNotEmpty()) {
            return true;
        }

        // Check for primary photo
        $primaryPhoto = $listing->listingPhotos()->where('is_primary', true)->first();
        if ($primaryPhoto) {
            return true;
        }

        // Check legacy photos array
        if (!empty($listing->photos) && is_array($listing->photos)) {
            return true;
        }

        return false;
    }

    /**
     * Get the primary image path for a listing.
     */
    protected function getPrimaryImagePath(Listing $listing): ?string
    {
        // Try to get from listingPhotos relation
        $primaryPhoto = $listing->listingPhotos()
            ->where('is_primary', true)
            ->first();

        if ($primaryPhoto && $primaryPhoto->path) {
            // Return the large version if available, otherwise original
            $path = $primaryPhoto->large_path ?? $primaryPhoto->path;

            // Resolve to full path
            $fullPath = storage_path('app/public/listings/' . $path);
            if (file_exists($fullPath)) {
                return $fullPath;
            }
        }

        // Try first photo if no primary
        $firstPhoto = $listing->listingPhotos()->orderBy('order')->first();
        if ($firstPhoto && $firstPhoto->path) {
            $path = $firstPhoto->large_path ?? $firstPhoto->path;
            $fullPath = storage_path('app/public/listings/' . $path);
            if (file_exists($fullPath)) {
                return $fullPath;
            }
        }

        return null;
    }

    /**
     * Translate property type.
     */
    protected function translatePropertyType(string $type, string $locale): string
    {
        $translations = [
            'fr' => [
                'STUDIO' => 'Studio',
                'CHAMBRE_SALON' => 'Chambre-Salon',
                'APPARTEMENT' => 'Appartement',
                'VILLA' => 'Villa',
                'DUPLEX' => 'Duplex',
                'MAISON' => 'Maison',
                'BUREAU' => 'Bureau',
                'MAGASIN' => 'Magasin',
                'ENTREPOT' => 'Entrepôt',
                'TERRAIN' => 'Terrain',
                'IMMEUBLE' => 'Immeuble',
            ],
            'en' => [
                'STUDIO' => 'Studio',
                'CHAMBRE_SALON' => 'One Bedroom',
                'APPARTEMENT' => 'Apartment',
                'VILLA' => 'Villa',
                'DUPLEX' => 'Duplex',
                'MAISON' => 'House',
                'BUREAU' => 'Office',
                'MAGASIN' => 'Shop',
                'ENTREPOT' => 'Warehouse',
                'TERRAIN' => 'Land',
                'IMMEUBLE' => 'Building',
            ],
        ];

        return $translations[$locale][$type] ?? $type;
    }

    /**
     * Translate transaction type.
     */
    protected function translateTransactionType(string $type, string $locale): string
    {
        $translations = [
            'fr' => [
                'LOCATION' => 'Location',
                'LOCATION_COURTE' => 'Location courte durée',
                'VENTE' => 'Vente',
            ],
            'en' => [
                'LOCATION' => 'For Rent',
                'LOCATION_COURTE' => 'Short-term Rental',
                'VENTE' => 'For Sale',
            ],
        ];

        return $translations[$locale][$type] ?? $type;
    }

    /**
     * Format price for display.
     */
    protected function formatPrice(Listing $listing): string
    {
        $price = $listing->loyer_mensuel ?? 0;

        // Format with thousand separators
        $formatted = number_format($price, 0, ',', ' ');

        // Add currency and period based on transaction type
        if ($listing->type_transaction === 'VENTE') {
            return "{$formatted} GNF";
        }

        return "{$formatted} GNF/mois";
    }

    /**
     * Build location string.
     */
    protected function buildLocationString(Listing $listing): string
    {
        $parts = [];

        if ($listing->quartier) {
            $parts[] = $listing->quartier;
        }

        if ($listing->commune) {
            $parts[] = $listing->commune;
        }

        if (empty($parts)) {
            $parts[] = 'Conakry';
        }

        return implode(', ', $parts);
    }

    /**
     * Build listing URL.
     */
    protected function buildListingUrl(Listing $listing): string
    {
        $baseUrl = config('app.frontend_url', config('app.url'));
        $slug = $listing->slug ?? $listing->id;

        return rtrim($baseUrl, '/') . '/annonces/' . $slug;
    }

    /**
     * Build features string.
     */
    protected function buildFeaturesString(Listing $listing, string $locale): string
    {
        $features = [];

        if ($listing->nombre_chambres) {
            $label = $locale === 'en' ? 'bedrooms' : 'chambres';
            $features[] = "{$listing->nombre_chambres} {$label}";
        }

        if ($listing->nombre_salles_bain) {
            $label = $locale === 'en' ? 'bathrooms' : 'SDB';
            $features[] = "{$listing->nombre_salles_bain} {$label}";
        }

        if ($listing->surface_m2) {
            $features[] = "{$listing->surface_m2} m²";
        }

        if ($listing->meuble) {
            $features[] = $locale === 'en' ? 'Furnished' : 'Meublé';
        }

        return implode(' • ', $features);
    }

    /**
     * Truncate description for Facebook post.
     */
    protected function truncateDescription(string $description): string
    {
        // Remove multiple spaces and newlines
        $clean = preg_replace('/\s+/', ' ', trim($description));

        if (strlen($clean) <= $this->maxDescriptionLength) {
            return $clean;
        }

        // Truncate and add ellipsis
        return substr($clean, 0, $this->maxDescriptionLength - 3) . '...';
    }

    /**
     * Map Facebook API error to i18n key.
     */
    protected function mapErrorToI18nKey(string $error): string
    {
        $errorLower = strtolower($error);

        if (str_contains($errorLower, 'token')) {
            return 'facebook.error.token_expired';
        }

        if (str_contains($errorLower, 'permission')) {
            return 'facebook.error.permission_revoked';
        }

        if (str_contains($errorLower, 'rate') || str_contains($errorLower, 'limit')) {
            return 'facebook.error.rate_limited';
        }

        if (str_contains($errorLower, 'page')) {
            return 'facebook.error.page_not_found';
        }

        return 'facebook.error.publish_failed';
    }

    /**
     * Get the API version being used.
     */
    public function getApiVersion(): string
    {
        return $this->apiVersion;
    }
}
