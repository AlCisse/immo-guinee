<?php

namespace App\Channels;

use App\Jobs\SendWhatsAppMessage;
use App\Services\WhatsAppService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class WahaChannel
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Send the given notification via WhatsApp (WAHA).
     *
     * @param mixed $notifiable
     * @param Notification $notification
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        // Get phone number from notifiable
        $phone = $this->getPhoneNumber($notifiable, $notification);

        if (!$phone) {
            Log::warning('WahaChannel: No phone number available for notification', [
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->getKey() ?? null,
                'notification' => get_class($notification),
            ]);
            return;
        }

        // Get the WhatsApp message content from the notification
        $message = $notification->toWhatsApp($notifiable);

        if (!$message) {
            Log::warning('WahaChannel: No message content for notification', [
                'notification' => get_class($notification),
            ]);
            return;
        }

        // Determine if we should queue the message
        $shouldQueue = $this->shouldQueue($notification);

        try {
            if ($shouldQueue) {
                // Queue the message for async sending
                SendWhatsAppMessage::dispatch(
                    $phone,
                    $message->content,
                    $message->type ?? 'notification',
                    $message->metadata ?? [],
                    $notifiable->getKey() ?? null
                );

                Log::info('WahaChannel: Message queued', [
                    'phone' => $phone,
                    'notification' => get_class($notification),
                ]);
            } else {
                // Send immediately
                $this->whatsAppService->send(
                    $phone,
                    $message->content,
                    $message->type ?? 'notification',
                    $message->metadata ?? []
                );

                Log::info('WahaChannel: Message sent', [
                    'phone' => $phone,
                    'notification' => get_class($notification),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('WahaChannel: Failed to send notification', [
                'phone' => $phone,
                'notification' => get_class($notification),
                'error' => $e->getMessage(),
            ]);

            // Re-throw to let Laravel handle the failure
            throw $e;
        }
    }

    /**
     * Get the phone number from the notifiable.
     *
     * @param mixed $notifiable
     * @param Notification $notification
     * @return string|null
     */
    protected function getPhoneNumber($notifiable, Notification $notification): ?string
    {
        // Check if notification has a custom method for phone number
        if (method_exists($notification, 'routeNotificationForWaha')) {
            return $notification->routeNotificationForWaha($notifiable);
        }

        // Use notifiable's route method
        if (method_exists($notifiable, 'routeNotificationForWaha')) {
            return $notifiable->routeNotificationForWaha($notification);
        }

        // Fall back to telephone attribute on User model
        if (isset($notifiable->telephone)) {
            return $notifiable->telephone;
        }

        // Try phone_number attribute
        if (isset($notifiable->phone_number)) {
            return $notifiable->phone_number;
        }

        return null;
    }

    /**
     * Determine if the notification should be queued.
     *
     * @param Notification $notification
     * @return bool
     */
    protected function shouldQueue(Notification $notification): bool
    {
        // Check if notification explicitly defines queuing preference
        if (method_exists($notification, 'shouldQueueWaha')) {
            return $notification->shouldQueueWaha();
        }

        // Default to queuing for safety
        return true;
    }
}
