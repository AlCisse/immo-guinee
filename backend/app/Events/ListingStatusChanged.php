<?php

namespace App\Events;

use App\Models\Listing;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event dispatched when a listing's status changes.
 *
 * Triggers:
 * - Facebook auto-delete when rented/sold
 * - Notifications to interested parties
 * - Contract workflow updates
 *
 * @see App\Listeners\FacebookAutoDeleteListener
 */
class ListingStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The listing whose status changed.
     */
    public Listing $listing;

    /**
     * The previous status.
     */
    public string $oldStatus;

    /**
     * The new status.
     */
    public string $newStatus;

    /**
     * Whether the status change resulted in a terminal state (rented/sold).
     */
    public bool $isTerminal;

    /**
     * Terminal statuses that indicate the listing is no longer available.
     */
    public const TERMINAL_STATUSES = ['LOUE', 'VENDU'];

    /**
     * Create a new event instance.
     *
     * @param Listing $listing
     * @param string $oldStatus
     * @param string $newStatus
     */
    public function __construct(Listing $listing, string $oldStatus, string $newStatus)
    {
        $this->listing = $listing;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
        $this->isTerminal = in_array(strtoupper($newStatus), self::TERMINAL_STATUSES);
    }

    /**
     * Check if the listing was marked as rented.
     *
     * @return bool
     */
    public function wasMarkedAsRented(): bool
    {
        return strtoupper($this->newStatus) === 'LOUE';
    }

    /**
     * Check if the listing was marked as sold.
     *
     * @return bool
     */
    public function wasMarkedAsSold(): bool
    {
        return strtoupper($this->newStatus) === 'VENDU';
    }
}
