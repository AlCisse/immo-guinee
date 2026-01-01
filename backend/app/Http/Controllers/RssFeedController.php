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
        $xml .= '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">' . PHP_EOL;
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

        // Build description
        $description = "{$transactionLabel} - {$typeLabel}";
        if ($listing->nombre_chambres > 0) {
            $description .= " - {$listing->nombre_chambres} chambre(s)";
        }
        if ($listing->surface_m2 > 0) {
            $description .= " - {$listing->surface_m2} m2";
        }
        $description .= " - {$listing->quartier}, {$listing->commune}";
        $description .= " - {$priceFormatted}";

        // Get main photo
        $photoUrl = $listing->main_photo_url ?? $listing->photo_principale;

        $xml = '  <item>' . PHP_EOL;
        $xml .= '    <title>' . $this->escapeXml($listing->titre) . '</title>' . PHP_EOL;
        $xml .= '    <link>' . $link . '</link>' . PHP_EOL;
        $xml .= '    <guid isPermaLink="true">' . $link . '</guid>' . PHP_EOL;
        $xml .= '    <pubDate>' . $pubDate . '</pubDate>' . PHP_EOL;
        $xml .= '    <description>' . $this->escapeXml($description) . '</description>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($typeLabel) . '</category>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($transactionLabel) . '</category>' . PHP_EOL;
        $xml .= '    <category>' . $this->escapeXml($listing->commune) . '</category>' . PHP_EOL;

        if ($photoUrl) {
            $xml .= '    <media:content url="' . $this->escapeXml($photoUrl) . '" medium="image"/>' . PHP_EOL;
            $xml .= '    <enclosure url="' . $this->escapeXml($photoUrl) . '" type="image/jpeg"/>' . PHP_EOL;
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
