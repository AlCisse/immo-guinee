<?php

namespace App\Channels;

use App\Services\SmsService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class SmsChannel
{
    protected SmsService $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification): void
    {
        // Check if notification has toSms method
        if (!method_exists($notification, 'toSms')) {
            return;
        }

        $data = $notification->toSms($notifiable);

        if (empty($data['to']) || empty($data['message'])) {
            Log::warning('SMS notification missing required data', [
                'notifiable_id' => $notifiable->id ?? null,
                'notification' => get_class($notification),
            ]);
            return;
        }

        try {
            $this->smsService->send($data['to'], $data['message']);

            Log::info('SMS notification sent', [
                'to' => $data['to'],
                'notification' => get_class($notification),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send SMS notification', [
                'to' => $data['to'],
                'error' => $e->getMessage(),
                'notification' => get_class($notification),
            ]);
        }
    }
}
