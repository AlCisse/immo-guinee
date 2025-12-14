<?php

namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class IndexListingsInElasticsearch extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'listings:index-elasticsearch
                            {--fresh : Delete existing index and recreate}
                            {--chunk=100 : Number of listings to process at a time}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Index all published listings into Elasticsearch for advanced search';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fresh = $this->option('fresh');
        $chunkSize = (int) $this->option('chunk');

        $this->info('Starting Elasticsearch indexing...');

        if ($fresh) {
            $this->warn('Deleting existing index...');

            try {
                // Remove all listings from search index
                Listing::removeAllFromSearch();
                $this->info('Existing index deleted.');
            } catch (\Exception $e) {
                $this->error('Failed to delete index: ' . $e->getMessage());
            }
        }

        // Count total listings to index
        $totalListings = Listing::where('statut', 'publiee')->count();

        if ($totalListings === 0) {
            $this->warn('No published listings found to index.');
            return Command::SUCCESS;
        }

        $this->info("Found {$totalListings} published listing(s) to index.");

        $bar = $this->output->createProgressBar($totalListings);
        $bar->start();

        $indexedCount = 0;
        $failedCount = 0;

        // Process listings in chunks
        Listing::where('statut', 'publiee')
            ->with(['proprietaire:id,prenom,nom,badge'])
            ->chunk($chunkSize, function ($listings) use ($bar, &$indexedCount, &$failedCount) {
                foreach ($listings as $listing) {
                    try {
                        // Add listing to search index
                        $listing->searchable();
                        $indexedCount++;
                    } catch (\Exception $e) {
                        Log::error('Failed to index listing', [
                            'listing_id' => $listing->id,
                            'error' => $e->getMessage(),
                        ]);
                        $failedCount++;
                    }

                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine(2);

        $this->info("Successfully indexed {$indexedCount} listing(s).");

        if ($failedCount > 0) {
            $this->error("Failed to index {$failedCount} listing(s). Check logs for details.");
        }

        Log::info('IndexListingsInElasticsearch completed', [
            'total' => $totalListings,
            'indexed' => $indexedCount,
            'failed' => $failedCount,
        ]);

        return Command::SUCCESS;
    }
}
