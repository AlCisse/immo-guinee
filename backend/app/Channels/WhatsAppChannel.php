<?php

namespace App\Channels;

use App\Services\WhatsAppService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class WhatsAppChannel
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification): void
    {
        // Check if notification has toWhatsApp method
        if (!method_exists($notification, 'toWhatsApp')) {
            return;
        }

        $data = $notification->toWhatsApp($notifiable);

        if (empty($data['to']) || empty($data['message'])) {
            Log::warning('WhatsApp notification missing required data', [
                'notifiable_id' => $notifiable->id ?? null,
                'notification' => get_class($notification),
            ]);
            return;
        }

        try {
            // Format phone number for WhatsApp (add country code if needed)
            $phoneNumber = $this->formatPhoneNumber($data['to']);

            $this->whatsAppService->sendMessage($phoneNumber, $data['message']);

            Log::info('WhatsApp notification sent', [
                'to' => $phoneNumber,
                'notification' => get_class($notification),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send WhatsApp notification', [
                'to' => $data['to'] ?? 'unknown',
                'error' => $e->getMessage(),
                'notification' => get_class($notification),
            ]);
        }
    }

    /**
     * Format phone number for WhatsApp API.
     * Ensures number has country code (224 for Guinea).
     */
    protected function formatPhoneNumber(string $phone): string
    {
        // Remove any non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // If number starts with 0, replace with Guinea country code
        if (str_starts_with($phone, '0')) {
            $phone = '224' . substr($phone, 1);
        }

        // If number doesn't have country code, add Guinea code
        if (strlen($phone) === 9) {
            $phone = '224' . $phone;
        }

        return $phone;
    }
}
