<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class RssFeedController extends Controller
{
    /**
     * Generate RSS feed for latest listings
     */
    public function listings(): Response
    {
        $feed = Cache::remember('rss:listings', 900, function () {
            $listings = Listing::with(['user', 'listingPhotos'])
                ->whereIn('statut', ['ACTIVE', 'publie', 'published'])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            return $this->generateRssFeed($listings);
        });

        return response($feed, 200)
            ->header('Content-Type', 'application/rss+xml; charset=utf-8');
    }

    /**
     * Generate RSS feed for listings by type (location/vente)
     */
    public function listingsByType(string $type): Response
    {
        $type = strtoupper($type);

        if (!in_array($type, ['LOCATION', 'VENTE', 'LOCATION_COURTE'])) {
            return response('Invalid type', 400);
        }

        $feed = Cache::remember("rss:listings:{$type}", 900, function () use ($type) {
            $listings = Listing::with(['user', 'listingPhotos'])
                ->whereIn('statut', ['ACTIVE', 'publie', 'published'])
                ->where('type_transaction', $type)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            $title = $type === 'LOCATION' ? 'Locations' : ($type === 'VENTE' ? 'Ventes' : 'Locations courtes');
            return $this->generateRssFeed($listings, "ImmoGuinee - {$title}");
        });

        return response($feed, 200)
            ->header('Content-Type', 'application/rss+xml; charset=utf-8');
    }

    /**
     * Generate RSS feed for listings by commune
     */
    public function listingsByCommune(string $commune): Response
    {
        $feed = Cache::remember("rss:listings:commune:{$commune}", 900, function () use ($commune) {
            $listings = Listing::with(['user', 'listingPhotos'])
                ->whereIn('statut', ['ACTIVE', 'publie', 'published'])
                ->where('commune', $commune)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            return $this->generateRssFeed($listings, "ImmoGuinee - {$commune}");
        });

        return response($feed, 200)
            ->header('Content-Type', 'application/rss+xml; charset=utf-8');
    }

    /**
     * Generate RSS XML from listings
     */
    private function generateRssFeed($listings, string $title = 'ImmoGuinee - Nouvelles annonces'): string
    {
        $baseUrl = config('app.frontend_url', 'https://immoguinee.com');
        $now = now()->toRfc2822String();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">' . PHP_EOL;
        $xml .= '<channel>' . PHP_EOL;
        $xml .= '  <title>' . $this->escapeXml($title) . '</title>' . PHP_EOL;
        $xml .= '  <link>' . $baseUrl . '</link>' . PHP_EOL;
        $xml .= '  <description>Les dernieres annonces immobilieres en Guinee - Appartements, maisons, villas a louer et a vendre</description>' . PHP_EOL;
        $xml .= '  <language>fr</language>' . PHP_EOL;
        $xml .= '  <lastBuildDate>' . $now . '</lastBuildDate>' . PHP_EOL;
        $xml .= '  <atom:link href="' . $baseUrl . '/rss/listings" rel="self" type="application/rss+xml"/>' . PHP_EOL;
        $xml .= '  <image>' . PHP_EOL;
        $xml .= '    <url>' . $baseUrl . '/images/logo.png</url>' . PHP_EOL;
        $xml .= '    <title>' . $this->escapeXml($title) . '</title>' . PHP_EOL;
        $xml .= '    <link>' . $baseUrl . '</link>' . PHP_EOL;
        $xml .= '  </image>' . PHP_EOL;

        foreach ($listings as $listing) {
            $xml .= $this->generateItemXml($listing, $baseUrl);
        }

        $xml .= '</channel>' . PHP_EOL;
        $xml .= '</rss>';

        return $xml;
    }

    /**
     * Generate XML for a single listing item
     */
    private function generateItemXml(Listing $listing, string $baseUrl): string
    {
        $link = "{$baseUrl}/bien/{$listing->id}";
        $pubDate = $listing->created_at->toRfc2822String();

        // Get price
        $isLocation = in_array($listing->type_transaction, ['LOCATION', 'location', 'LOCATION_COURTE', 'location_courte']);
        $price = $isLocation ? $listing->loyer_mensuel : $listing->prix_vente;
        $priceFormatted = number_format((float)$price, 0, ',', ' ') . ' GNF';
        if ($isLocation) {
            $priceFormatted .= '/mois';
        }

        // Get transaction type label
        $transactionLabel = match($listing->type_transaction) {
            'LOCATION', 'location' => 'A louer',
            'VENTE', 'vente' => 'A vendre',
            'LOCATION_COURTE', 'location_courte' => 'Location courte duree',
            default => $listing->type_transaction,
        };

        // Get property type label
        $typeLabel = match($listing->type_bien) {
            'APPARTEMENT' => 'Appartement',
            'MAISON' => 'Maison',
            'VILLA' => 'Villa',
            'STUDIO' => 'Studio',
            'BUREAU' => 'Bureau',
            'MAGASIN' => 'Magasin',
            'TERRAIN' => 'Terrain',
            default => $listing->type_bien,
        };

        // Build short summary
        $summary = "{$transactionLabel} - {$typeLabel}";
        if ($listing->nombre_chambres > 0) {
            $summary .= " - {$listing->nombre_chambres} chambre(s)";
        }
        if ($listing->surface_m2 > 0) {
            $summary .= " - {$listing->surface_m2} m2";
        }
        $summary .= " - {$listing->quartier}, {$listing->commune}";
        $summary .= " - {$priceFormatted}";

        // Use actual listing description if available, otherwise use summary
        $description = !empty($listing->description) ? $listing->description : $summary;

        // Collect all photos from various sources
        // Priority: 1) listingPhotos relation, 2) photos JSON column, 3) photo_principale
        $allPhotos = collect();
        $primaryPhotoUrl = null;

        // Try listingPhotos relation first (new system)
        if ($listing->listingPhotos->isNotEmpty()) {
            $allPhotos = $listing->listingPhotos->sortBy('order')->values()->map(fn($p) => [
                'url' => $p->url,
                'thumbnail_url' => $p->thumbnail_url,
                'is_primary' => (bool) $p->is_primary,
            ]);
            $primary = $allPhotos->firstWhere('is_primary', true) ?? $allPhotos->first();
            $primaryPhotoUrl = $primary['url'] ?? null;
        }
        // Try photos JSON column (legacy with multiple photos)
        elseif (!empty($listing->photos) && is_array($listing->photos)) {
            $photosArray = collect($listing->photos)->sortBy('order')->values();
            $allPhotos = $photosArray->map(fn($p) => [
                'url' => $p['url'] ?? null,
                'thumbnail_url' => $p['thumbnail_url'] ?? null,
                'is_primary' => (bool) ($p['is_primary'] ?? false),
            ])->filter(fn($p) => !empty($p['url']));
            $primary = $allPhotos->firstWhere('is_primary', true) ?? $allPhotos->first();
            $primaryPhotoUrl = $primary['url'] ?? null;
        }
        // Fallback to photo_principale (single image)
        elseif (!empty($listing->photo_principale)) {
            $primaryPhotoUrl = $listing->photo_principale;
            $allPhotos = collect([
                ['url' => $primaryPhotoUrl, 'thumbnail_url' => null, 'is_primary' => true]
            ]);
        }

        $xml = '  <item>' . PHP_EOL;
        $xml .= '    <title>' . $this->escapeXml($listing->titre) . '</title>' . PHP_EOL;
        $xml .= '    <link>' . $link . '</link>' . PHP_EOL;
        $xml .= '    <guid isPermaLink="true">' . $link . '</guid>' . PHP_EOL;
        $xml .= '    <pubDate>' . $pubDate . '</pubDate>' . PHP_EOL;
        $xml .= '    <description>' . $this->escapeXml($description) . '</description>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($typeLabel) . '</category>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($transactionLabel) . '</category>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($listing->commune) . '</category>' . PHP_EOL;

        // Add enclosure for primary photo (for RSS readers that only support one image)
        if ($primaryPhotoUrl) {
            $xml .= '    <enclosure url="' . $this->escapeXml($primaryPhotoUrl) . '" type="image/jpeg"/>' . PHP_EOL;
        }

        // Add all photos using media:group with media:content elements
        if ($allPhotos->isNotEmpty()) {
            $xml .= '    <media:group>' . PHP_EOL;
            foreach ($allPhotos as $photo) {
                $isDefault = $photo['is_primary'] ? 'true' : 'false';
                $xml .= '      <media:content url="' . $this->escapeXml($photo['url']) . '" medium="image" isDefault="' . $isDefault . '"';

                // Add thumbnail if available
                if (!empty($photo['thumbnail_url'])) {
                    $xml .= '>' . PHP_EOL;
                    $xml .= '        <media:thumbnail url="' . $this->escapeXml($photo['thumbnail_url']) . '"/>' . PHP_EOL;
                    $xml .= '      </media:content>' . PHP_EOL;
                } else {
                    $xml .= '/>' . PHP_EOL;
                }
            }
            $xml .= '    </media:group>' . PHP_EOL;

            // Add content:encoded with HTML images for n8n and basic RSS readers
            $htmlContent = '<p><strong>' . $this->escapeXml($summary) . '</strong></p>';
            if (!empty($listing->description)) {
                $htmlContent .= '<p>' . $this->escapeXml($listing->description) . '</p>';
            }
            $htmlContent .= '<div class="images">';
            foreach ($allPhotos as $index => $photo) {
                $isPrimary = $photo['is_primary'] ? ' data-primary="true"' : '';
                $htmlContent .= '<img src="' . $this->escapeXml($photo['url']) . '"' . $isPrimary . ' alt="Image ' . ($index + 1) . '"/>';
            }
            $htmlContent .= '</div>';
            // Add JSON array of image URLs for easy parsing
            $imageUrls = $allPhotos->pluck('url')->toArray();
            $primaryIndex = $allPhotos->search(fn($p) => $p['is_primary']);
            $htmlContent .= '<script type="application/json" class="listing-images">' . json_encode([
                'images' => $imageUrls,
                'primaryIndex' => $primaryIndex !== false ? $primaryIndex : 0,
                'count' => count($imageUrls),
            ]) . '</script>';
            $xml .= '    <content:encoded><![CDATA[' . $htmlContent . ']]></content:encoded>' . PHP_EOL;
        }

        $xml .= '  </item>' . PHP_EOL;

        return $xml;
    }

    /**
     * Escape special XML characters
     */
    private function escapeXml(?string $string): string
    {
        if ($string === null) {
            return '';
        }
        return htmlspecialchars($string, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
