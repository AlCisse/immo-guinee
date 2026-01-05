<?php

namespace App\Console\Commands;

use App\Services\FacebookPostManager;
use Illuminate\Console\Command;

/**
 * Process pending Facebook post deletions.
 *
 * This command deletes Facebook posts for listings that have been
 * marked as rented or sold. Should be run periodically via cron
 * as a safety net in case real-time deletion fails.
 *
 * @see App\Services\FacebookPostManager
 */
class ProcessFacebookDeletionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facebook:process-deletions
                            {--cleanup : Also cleanup old failed posts}
                            {--cleanup-days=30 : Days threshold for cleanup}
                            {--retry : Retry failed posts}
                            {--retry-limit=10 : Maximum posts to retry}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process pending Facebook post deletions for rented/sold listings';

    /**
     * Execute the console command.
     */
    public function handle(FacebookPostManager $postManager): int
    {
        $this->info('Processing pending Facebook post deletions...');

        // Process pending deletions
        $result = $postManager->processPendingDeletions();

        $this->info("Processed: {$result['processed']}");
        $this->info("Deleted: {$result['deleted']}");

        if ($result['failed'] > 0) {
            $this->warn("Failed: {$result['failed']}");
        }

        // Cleanup old failed posts if requested
        if ($this->option('cleanup')) {
            $days = (int) $this->option('cleanup-days');
            $this->info("Cleaning up failed posts older than {$days} days...");

            $cleaned = $postManager->cleanupFailedPosts($days);
            $this->info("Cleaned up: {$cleaned} old failed post records");
        }

        // Retry failed posts if requested
        if ($this->option('retry')) {
            $limit = (int) $this->option('retry-limit');
            $this->info("Retrying failed posts (limit: {$limit})...");

            $retryResult = $postManager->retryFailedPosts($limit);
            $this->info("Retried: {$retryResult['retried']}, Succeeded: {$retryResult['succeeded']}");
        }

        return Command::SUCCESS;
    }
}
