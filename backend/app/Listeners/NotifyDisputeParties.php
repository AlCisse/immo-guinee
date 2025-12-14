<?php

namespace App\Listeners;

use App\Events\DisputeOpened;
use App\Notifications\DisputeOpenedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class NotifyDisputeParties implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     * FR-072: Notify both parties when dispute is opened
     */
    public function handle(DisputeOpened $event): void
    {
        Log::info('Notifying dispute parties', [
            'dispute_id' => $event->dispute->id,
        ]);

        // Notify demandeur (claimant)
        if ($event->dispute->demandeur) {
            $event->dispute->demandeur->notify(new DisputeOpenedNotification($event->dispute));
        }

        // Notify defendeur (defendant)
        if ($event->dispute->defendeur) {
            $event->dispute->defendeur->notify(new DisputeOpenedNotification($event->dispute));
        }

        // Log activity
        activity()
            ->performedOn($event->dispute)
            ->log('Dispute parties notified');

        Log::info('Dispute parties notified', [
            'dispute_id' => $event->dispute->id,
        ]);
    }
}
