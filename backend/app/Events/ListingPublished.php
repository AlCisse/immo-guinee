<?php

namespace App\Events;

use App\Models\Listing;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event dispatched when a listing is published (approved and live).
 *
 * Triggers:
 * - Facebook auto-publish if enabled
 * - Notifications to followers
 * - Analytics tracking
 *
 * @see App\Listeners\FacebookAutoPublishListener
 */
class ListingPublished
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The published listing.
     */
    public Listing $listing;

    /**
     * Whether this is a re-publication (after edits).
     */
    public bool $isRepublication;

    /**
     * Create a new event instance.
     *
     * @param Listing $listing
     * @param bool $isRepublication
     */
    public function __construct(Listing $listing, bool $isRepublication = false)
    {
        $this->listing = $listing;
        $this->isRepublication = $isRepublication;
    }
}
