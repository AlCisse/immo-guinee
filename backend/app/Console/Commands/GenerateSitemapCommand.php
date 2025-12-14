<?php

namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateSitemapCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate XML sitemap for SEO (FR-027)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Generating sitemap...');

        $baseUrl = config('app.url');

        // Start XML
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

        // Add homepage
        $xml .= $this->addUrl($baseUrl, now(), 'daily', '1.0');

        // Add static pages
        $staticPages = [
            '/' => ['changefreq' => 'daily', 'priority' => '1.0'],
            '/listings' => ['changefreq' => 'hourly', 'priority' => '0.9'],
            '/about' => ['changefreq' => 'monthly', 'priority' => '0.5'],
            '/contact' => ['changefreq' => 'monthly', 'priority' => '0.5'],
        ];

        foreach ($staticPages as $page => $config) {
            $xml .= $this->addUrl(
                $baseUrl . $page,
                now(),
                $config['changefreq'],
                $config['priority']
            );
        }

        // Add all active listings
        $listings = Listing::where('statut', 'DISPONIBLE')
            ->orderBy('updated_at', 'desc')
            ->get();

        $this->info("Adding {$listings->count()} listings to sitemap...");

        foreach ($listings as $listing) {
            $xml .= $this->addUrl(
                "{$baseUrl}/listings/{$listing->id}",
                $listing->updated_at,
                'weekly',
                '0.8'
            );
        }

        // Close XML
        $xml .= '</urlset>' . PHP_EOL;

        // Save sitemap
        $path = public_path('sitemap.xml');
        file_put_contents($path, $xml);

        $this->info("Sitemap generated successfully at: {$path}");
        $this->line("Total URLs: " . ($listings->count() + count($staticPages) + 1));

        return Command::SUCCESS;
    }

    /**
     * Generate URL entry for sitemap
     */
    private function addUrl(string $loc, $lastmod, string $changefreq, string $priority): string
    {
        $lastmodDate = $lastmod instanceof \Carbon\Carbon ? $lastmod->toIso8601String() : $lastmod;

        return <<<XML
  <url>
    <loc>{$loc}</loc>
    <lastmod>{$lastmodDate}</lastmod>
    <changefreq>{$changefreq}</changefreq>
    <priority>{$priority}</priority>
  </url>

XML;
    }
}
