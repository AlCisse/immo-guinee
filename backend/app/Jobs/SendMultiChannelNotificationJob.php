<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendMultiChannelNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user,
        public string $notificationClass,
        public array $data = []
    ) {}

    /**
     * Execute the job.
     * FR-053: Send notifications via email, SMS, push, WhatsApp
     */
    public function handle(): void
    {
        Log::info('Sending multi-channel notification', [
            'user_id' => $this->user->id,
            'notification' => $this->notificationClass,
        ]);

        try {
            // Instantiate notification class dynamically
            $notificationInstance = new $this->notificationClass(...array_values($this->data));

            // Send notification
            $this->user->notify($notificationInstance);

            Log::info('Multi-channel notification sent', [
                'user_id' => $this->user->id,
                'notification' => $this->notificationClass,
            ]);
        } catch (\Exception $e) {
            Log::error('Multi-channel notification failed', [
                'user_id' => $this->user->id,
                'notification' => $this->notificationClass,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
