<?php

namespace App\Listeners;

use App\Events\DocumentVerified;
use App\Jobs\UpdateBadgeCertificationJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class UpdateBadgeLevel implements ShouldQueue
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
     * FR-054, FR-057: Update badge when document is verified
     */
    public function handle(DocumentVerified $event): void
    {
        // Only update badge if document was successfully verified
        if ($event->document->statut_verification === 'VERIFIE') {
            Log::info('Document verified, checking for badge upgrade', [
                'document_id' => $event->document->id,
                'user_id' => $event->document->utilisateur_id,
            ]);

            // Dispatch job to update user's badge
            UpdateBadgeCertificationJob::dispatch($event->document->utilisateur);

            Log::info('Badge update job dispatched', [
                'document_id' => $event->document->id,
                'user_id' => $event->document->utilisateur_id,
            ]);
        } else {
            Log::info('Document not verified, badge update skipped', [
                'document_id' => $event->document->id,
                'status' => $event->document->statut_verification,
            ]);
        }
    }
}
