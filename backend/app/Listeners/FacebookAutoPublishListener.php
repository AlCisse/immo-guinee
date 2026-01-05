<?php

namespace App\Listeners;

use App\Events\ListingPublished;
use App\Jobs\PublishListingToFacebook;
use App\Models\FacebookPageConnection;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Listener for automatic Facebook publishing.
 *
 * Listens to ListingPublished events and dispatches a job
 * to publish the listing to Facebook if auto-publish is enabled.
 *
 * The actual publishing is done in a queued job to avoid
 * blocking the request and to handle rate limits.
 *
 * @see App\Events\ListingPublished
 * @see App\Jobs\PublishListingToFacebook
 */
class FacebookAutoPublishListener implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The name of the queue the job should be sent to.
     *
     * @var string
     */
    public $queue = 'facebook';

    /**
     * The time (seconds) before the job should be processed.
     *
     * @var int
     */
    public $delay = 5;

    /**
     * Handle the event.
     *
     * @param ListingPublished $event
     * @return void
     */
    public function handle(ListingPublished $event): void
    {
        $listing = $event->listing;

        // Skip if already published on Facebook (unless it's a re-publication after major edits)
        if (!$event->isRepublication && $listing->isPublishedOnFacebook()) {
            Log::debug('Listing already published on Facebook, skipping', [
                'listing_id' => $listing->id,
            ]);
            return;
        }

        // Get owner's Facebook connection
        $connection = FacebookPageConnection::where('user_id', $listing->user_id)
            ->where('auto_publish_enabled', true)
            ->where('token_expires_at', '>', now())
            ->first();

        if (!$connection) {
            Log::debug('No active Facebook connection for listing owner', [
                'listing_id' => $listing->id,
                'user_id' => $listing->user_id,
            ]);
            return;
        }

        // Dispatch the job to publish
        PublishListingToFacebook::dispatch($listing, $connection)
            ->onQueue('facebook')
            ->delay(now()->addSeconds(5)); // Small delay for rate limiting

        Log::info('Dispatched Facebook publish job', [
            'listing_id' => $listing->id,
            'connection_id' => $connection->id,
        ]);
    }

    /**
     * Handle a job failure.
     *
     * @param ListingPublished $event
     * @param \Throwable $exception
     * @return void
     */
    public function failed(ListingPublished $event, \Throwable $exception): void
    {
        Log::error('Facebook auto-publish listener failed', [
            'listing_id' => $event->listing->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
