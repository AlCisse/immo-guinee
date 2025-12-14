<?php

namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;

class CleanExpiredListingsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'listings:clean-expired {--days=90 : Number of days before expiration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark old listings as expired and optionally archive them';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = $this->option('days');
        $this->info("Cleaning listings older than {$days} days...");

        // Find listings that haven't been updated in X days
        $expiredListings = Listing::where('statut', 'DISPONIBLE')
            ->where('updated_at', '<=', now()->subDays($days))
            ->get();

        $this->info("Found {$expiredListings->count()} expired listings.");

        if ($expiredListings->isEmpty()) {
            $this->info('No expired listings to clean.');
            return Command::SUCCESS;
        }

        // Ask for confirmation
        if (!$this->confirm("Do you want to mark these {$expiredListings->count()} listings as expired?")) {
            $this->info('Operation cancelled.');
            return Command::SUCCESS;
        }

        $updated = 0;

        foreach ($expiredListings as $listing) {
            try {
                $listing->update(['statut' => 'EXPIRE']);
                $updated++;

                // Log activity
                activity()
                    ->performedOn($listing)
                    ->log('Listing marked as expired by automated cleanup');

                $this->line("Marked listing {$listing->id} as expired");
            } catch (\Exception $e) {
                $this->error("Failed to update listing {$listing->id}: {$e->getMessage()}");
            }
        }

        $this->info("Successfully marked {$updated} listings as expired.");

        return Command::SUCCESS;
    }
}
