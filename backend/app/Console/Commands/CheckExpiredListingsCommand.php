<?php

namespace App\Console\Commands;

use App\Models\Listing;
use App\Events\ListingUpdated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CheckExpiredListingsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'listings:check-expired
                            {--days=90 : Number of days before expiration}
                            {--dry-run : Run without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and expire listings that are older than the specified number of days (default: 90 days)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $dryRun = $this->option('dry-run');

        $this->info("Checking for listings older than {$days} days...");

        $expirationDate = Carbon::now()->subDays($days);

        // Find active listings that should be expired
        $expiredListings = Listing::where('statut', 'publiee')
            ->where('created_at', '<=', $expirationDate)
            ->whereNull('date_expiration')
            ->orWhere(function ($query) {
                $query->where('statut', 'publiee')
                    ->where('date_expiration', '<=', Carbon::now());
            })
            ->get();

        $count = $expiredListings->count();

        if ($count === 0) {
            $this->info('No expired listings found.');
            return Command::SUCCESS;
        }

        $this->warn("Found {$count} expired listing(s).");

        if ($dryRun) {
            $this->info('DRY RUN - No changes will be made:');
            $this->table(
                ['ID', 'Title', 'Owner', 'Created At', 'Days Old'],
                $expiredListings->map(function ($listing) {
                    return [
                        $listing->id,
                        substr($listing->titre, 0, 40),
                        $listing->proprietaire->prenom . ' ' . $listing->proprietaire->nom,
                        $listing->created_at->format('Y-m-d'),
                        $listing->created_at->diffInDays(Carbon::now()),
                    ];
                })
            );
            return Command::SUCCESS;
        }

        // Confirm before proceeding
        if (!$this->confirm("Do you want to expire these {$count} listing(s)?")) {
            $this->info('Operation cancelled.');
            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        $expiredCount = 0;
        $failedCount = 0;

        foreach ($expiredListings as $listing) {
            try {
                $listing->update([
                    'statut' => 'expiree',
                    'date_expiration' => Carbon::now(),
                ]);

                // Broadcast listing update
                event(new ListingUpdated($listing, 'expired'));

                // Notify owner
                $listing->proprietaire->notify(
                    new \App\Notifications\ListingExpiredNotification($listing)
                );

                $expiredCount++;

            } catch (\Exception $e) {
                Log::error('Failed to expire listing', [
                    'listing_id' => $listing->id,
                    'error' => $e->getMessage(),
                ]);
                $failedCount++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Successfully expired {$expiredCount} listing(s).");

        if ($failedCount > 0) {
            $this->error("Failed to expire {$failedCount} listing(s). Check logs for details.");
        }

        Log::info('CheckExpiredListingsCommand completed', [
            'total' => $count,
            'expired' => $expiredCount,
            'failed' => $failedCount,
        ]);

        return Command::SUCCESS;
    }
}
