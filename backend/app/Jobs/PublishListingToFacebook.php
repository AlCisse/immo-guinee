<?php

namespace App\Jobs;

use App\Models\FacebookPageConnection;
use App\Models\Listing;
use App\Services\FacebookPagePublisher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Job to publish a listing to Facebook.
 *
 * This job is dispatched when a listing is approved and the
 * owner has auto-publish enabled.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limit handling
 * - Error tracking in database
 *
 * @see App\Services\FacebookPagePublisher
 */
class PublishListingToFacebook implements ShouldQueue
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
     * The listing to publish.
     */
    public Listing $listing;

    /**
     * The Facebook page connection.
     */
    public FacebookPageConnection $connection;

    /**
     * Whether to include the image.
     */
    public bool $withImage;

    /**
     * Create a new job instance.
     *
     * @param Listing $listing
     * @param FacebookPageConnection $connection
     * @param bool $withImage
     */
    public function __construct(Listing $listing, FacebookPageConnection $connection, bool $withImage = true)
    {
        $this->listing = $listing;
        $this->connection = $connection;
        $this->withImage = $withImage;
    }

    /**
     * Execute the job.
     *
     * @param FacebookPagePublisher $publisher
     * @return void
     */
    public function handle(FacebookPagePublisher $publisher): void
    {
        Log::info('Starting Facebook publish job', [
            'listing_id' => $this->listing->id,
            'connection_id' => $this->connection->id,
        ]);

        // Verify connection is still valid
        if (!$this->isConnectionValid()) {
            Log::warning('Facebook connection no longer valid', [
                'listing_id' => $this->listing->id,
                'connection_id' => $this->connection->id,
            ]);
            return;
        }

        // Verify listing is still in publishable state
        if (!$this->isListingPublishable()) {
            Log::warning('Listing no longer in publishable state', [
                'listing_id' => $this->listing->id,
                'statut' => $this->listing->statut,
            ]);
            return;
        }

        try {
            $facebookPost = $publisher->publish(
                $this->listing,
                $this->connection,
                $this->withImage
            );

            Log::info('Facebook publish job completed', [
                'listing_id' => $this->listing->id,
                'facebook_post_id' => $facebookPost->facebook_post_id,
            ]);

        } catch (Exception $e) {
            Log::error('Facebook publish job failed', [
                'listing_id' => $this->listing->id,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Check if the Facebook connection is still valid.
     *
     * @return bool
     */
    protected function isConnectionValid(): bool
    {
        // Refresh the connection from database
        $this->connection->refresh();

        return $this->connection->auto_publish_enabled
            && $this->connection->token_expires_at > now();
    }

    /**
     * Check if the listing is still in a publishable state.
     *
     * @return bool
     */
    protected function isListingPublishable(): bool
    {
        // Refresh the listing from database
        $this->listing->refresh();

        // Only publish if the listing is active and visible
        return $this->listing->statut === 'PUBLIEE'
            && $this->listing->disponible === true
            && !$this->listing->isPublishedOnFacebook();
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Facebook publish job permanently failed', [
            'listing_id' => $this->listing->id,
            'connection_id' => $this->connection->id,
            'error' => $exception->getMessage(),
        ]);

        // The FacebookPagePublisher already creates a failed FacebookPost record
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
            'publish',
            'listing:' . $this->listing->id,
            'user:' . $this->listing->user_id,
        ];
    }
}
