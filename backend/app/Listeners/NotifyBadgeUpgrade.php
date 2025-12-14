<?php

namespace App\Listeners;

use App\Events\BadgeUpgraded;
use App\Notifications\BadgeUpgradedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class NotifyBadgeUpgrade implements ShouldQueue
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
     * FR-057: Notify user of badge upgrade
     */
    public function handle(BadgeUpgraded $event): void
    {
        Log::info('Notifying user of badge upgrade', [
            'user_id' => $event->user->id,
            'old_badge' => $event->oldBadge,
            'new_badge' => $event->newBadge,
        ]);

        // Send notification
        $event->user->notify(new BadgeUpgradedNotification($event->oldBadge, $event->newBadge));

        // Log activity
        activity()
            ->performedOn($event->user)
            ->withProperties([
                'old_badge' => $event->oldBadge,
                'new_badge' => $event->newBadge,
            ])
            ->log('User notified of badge upgrade');

        Log::info('Badge upgrade notification sent', [
            'user_id' => $event->user->id,
        ]);
    }
}
