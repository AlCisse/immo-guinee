<?php

namespace App\Jobs;

use App\Models\Listing;
use App\Services\FacebookPostManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Job to delete a listing's Facebook post.
 *
 * This job is dispatched when a listing status changes to
 * rented/sold to remove the post from Facebook.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Graceful handling if post already deleted
 * - Error tracking in database
 *
 * @see App\Services\FacebookPostManager
 */
class DeleteListingFromFacebook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The maximum number of unhandled exceptions to allow before failing.
     *
     * @var int
     */
    public $maxExceptions = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array
     */
    public $backoff = [60, 300, 900]; // 1 min, 5 min, 15 min

    /**
     * The listing to delete from Facebook.
     */
    public Listing $listing;

    /**
     * Create a new job instance.
     *
     * @param Listing $listing
     */
    public function __construct(Listing $listing)
    {
        $this->listing = $listing;
    }

    /**
     * Execute the job.
     *
     * @param FacebookPostManager $postManager
     * @return void
     */
    public function handle(FacebookPostManager $postManager): void
    {
        Log::info('Starting Facebook delete job', [
            'listing_id' => $this->listing->id,
        ]);

        try {
            $deleted = $postManager->deleteForListing($this->listing);

            if ($deleted) {
                Log::info('Facebook delete job completed', [
                    'listing_id' => $this->listing->id,
                ]);
            } else {
                Log::warning('Facebook delete job: post not deleted', [
                    'listing_id' => $this->listing->id,
                ]);
            }

        } catch (Exception $e) {
            Log::error('Facebook delete job failed', [
                'listing_id' => $this->listing->id,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Facebook delete job permanently failed', [
            'listing_id' => $this->listing->id,
            'error' => $exception->getMessage(),
        ]);

        // The FacebookPostManager already marks the post as failed
    }

    /**
     * Determine the time at which the job should timeout.
     *
     * @return \DateTime
     */
    public function retryUntil(): \DateTime
    {
        return now()->addHours(1);
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array
     */
    public function tags(): array
    {
        return [
            'facebook',
            'delete',
            'listing:' . $this->listing->id,
        ];
    }
}
