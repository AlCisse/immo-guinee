<?php

namespace App\Listeners;

use App\Events\ListingStatusChanged;
use App\Jobs\DeleteListingFromFacebook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Listener for automatic Facebook post deletion.
 *
 * Listens to ListingStatusChanged events and dispatches a job
 * to delete the Facebook post when a listing is marked as rented/sold.
 *
 * The actual deletion is done in a queued job to avoid
 * blocking the request and to handle rate limits.
 *
 * @see App\Events\ListingStatusChanged
 * @see App\Jobs\DeleteListingFromFacebook
 */
class FacebookAutoDeleteListener implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The name of the queue the job should be sent to.
     *
     * @var string
     */
    public $queue = 'facebook';

    /**
     * Handle the event.
     *
     * @param ListingStatusChanged $event
     * @return void
     */
    public function handle(ListingStatusChanged $event): void
    {
        // Only process terminal statuses (rented/sold)
        if (!$event->isTerminal) {
            return;
        }

        $listing = $event->listing;

        // Skip if not published on Facebook
        if (!$listing->isPublishedOnFacebook()) {
            Log::debug('Listing not published on Facebook, skipping deletion', [
                'listing_id' => $listing->id,
            ]);
            return;
        }

        // Dispatch the job to delete
        DeleteListingFromFacebook::dispatch($listing)
            ->onQueue('facebook');

        Log::info('Dispatched Facebook delete job', [
            'listing_id' => $listing->id,
            'new_status' => $event->newStatus,
        ]);
    }

    /**
     * Handle a job failure.
     *
     * @param ListingStatusChanged $event
     * @param \Throwable $exception
     * @return void
     */
    public function failed(ListingStatusChanged $event, \Throwable $exception): void
    {
        Log::error('Facebook auto-delete listener failed', [
            'listing_id' => $event->listing->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
