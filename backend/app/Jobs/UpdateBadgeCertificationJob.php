<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\CertificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateBadgeCertificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user
    ) {}

    /**
     * Execute the job.
     * FR-057: Update user badge based on certifications
     */
    public function handle(CertificationService $certificationService): void
    {
        Log::info('Updating badge certification', ['user_id' => $this->user->id]);

        try {
            $oldBadge = $this->user->badge_certification;

            // Determine new badge
            $newBadge = $certificationService->determineBadge($this->user);

            // Update if changed
            if ($oldBadge !== $newBadge) {
                $certificationService->updateBadge($this->user, $newBadge);

                // Log activity
                activity()
                    ->performedOn($this->user)
                    ->withProperties([
                        'old_badge' => $oldBadge,
                        'new_badge' => $newBadge,
                    ])
                    ->log('Badge certification updated');

                Log::info('Badge certification updated', [
                    'user_id' => $this->user->id,
                    'old_badge' => $oldBadge,
                    'new_badge' => $newBadge,
                ]);

                // TODO: Send notification to user
            } else {
                Log::info('Badge certification unchanged', [
                    'user_id' => $this->user->id,
                    'badge' => $oldBadge,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Badge certification update failed', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
