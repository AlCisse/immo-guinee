<?php

namespace App\Services;

use App\Models\User;
use App\Models\Message;
use App\Models\Conversation;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * T186 [US6] MessageNotificationService
 * FR-061: Send notifications via 4 channels (Push, SMS, Email, WhatsApp)
 *
 * Manages multi-channel notification delivery for new messages.
 */
class MessageNotificationService
{
    /**
     * Notification channels available
     */
    private const CHANNELS = ['push', 'sms', 'email', 'whatsapp'];

    /**
     * Send notifications for a new message
     */
    public function notify(Message $message): void
    {
        $conversation = $message->conversation;
        $sender = $message->sender;
        $recipient = $this->getRecipient($conversation, $sender->id);

        if (!$recipient) {
            Log::warning('No recipient found for message notification', [
                'message_id' => $message->id,
                'conversation_id' => $conversation->id,
            ]);
            return;
        }

        // Get user's notification preferences
        $preferences = $this->getNotificationPreferences($recipient);

        // Prepare notification content
        $content = $this->prepareContent($message, $sender, $conversation);

        // Send to each enabled channel
        $results = [];
        foreach (self::CHANNELS as $channel) {
            if ($this->isChannelEnabled($channel, $preferences)) {
                $results[$channel] = $this->sendToChannel($channel, $recipient, $content);
            }
        }

        // Create in-app notification record
        $this->createInAppNotification($recipient, $message, $sender);

        // Log notification results
        Log::info('Message notifications sent', [
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'channels' => $results,
        ]);
    }

    /**
     * Get the recipient of the message
     */
    private function getRecipient(Conversation $conversation, string $senderId): ?User
    {
        if ($conversation->participant_1_id === $senderId) {
            return $conversation->participant2;
        }
        return $conversation->participant1;
    }

    /**
     * Get user's notification preferences
     */
    private function getNotificationPreferences(User $user): array
    {
        return [
            'push' => $user->notifications_push ?? true,
            'sms' => $user->notifications_sms ?? true,
            'email' => $user->notifications_email ?? true,
            'whatsapp' => $user->notifications_whatsapp ?? false, // Opt-in only
        ];
    }

    /**
     * Check if a notification channel is enabled
     */
    private function isChannelEnabled(string $channel, array $preferences): bool
    {
        return $preferences[$channel] ?? false;
    }

    /**
     * Prepare notification content
     */
    private function prepareContent(Message $message, User $sender, Conversation $conversation): array
    {
        $preview = $this->getMessagePreview($message);
        $listingTitle = $conversation->listing?->titre ?? 'une annonce';

        return [
            'title' => 'Nouveau message de ' . $sender->prenom,
            'body' => $preview,
            'preview' => $preview,
            'sender_name' => $sender->nom_complet,
            'sender_first_name' => $sender->prenom,
            'listing_title' => $listingTitle,
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'timestamp' => $message->horodatage->toISOString(),
            'deep_link' => "/dashboard/messagerie/{$conversation->id}",
        ];
    }

    /**
     * Get a preview of the message content
     */
    private function getMessagePreview(Message $message, int $maxLength = 100): string
    {
        switch ($message->type_message) {
            case 'TEXTE':
                $text = $message->contenu_texte ?? '';
                return strlen($text) > $maxLength
                    ? substr($text, 0, $maxLength) . '...'
                    : $text;

            case 'VOCAL':
                return '🎤 Message vocal';

            case 'PHOTO':
                return '📷 Photo';

            case 'LOCALISATION_GPS':
                return '📍 Localisation partagée';

            default:
                return 'Nouveau message';
        }
    }

    /**
     * Send notification to a specific channel
     */
    private function sendToChannel(string $channel, User $recipient, array $content): bool
    {
        try {
            return match ($channel) {
                'push' => $this->sendPushNotification($recipient, $content),
                'sms' => $this->sendSmsNotification($recipient, $content),
                'email' => $this->sendEmailNotification($recipient, $content),
                'whatsapp' => $this->sendWhatsAppNotification($recipient, $content),
                default => false,
            };
        } catch (\Exception $e) {
            Log::error("Failed to send {$channel} notification", [
                'recipient_id' => $recipient->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send push notification (via Firebase or similar)
     */
    private function sendPushNotification(User $recipient, array $content): bool
    {
        // Check if user has push tokens
        $pushTokens = $recipient->push_tokens ?? [];

        if (empty($pushTokens)) {
            return false;
        }

        // Send via n8n webhook or Firebase directly
        $webhookUrl = config('services.n8n.webhook_url') . '/push-notification';

        $response = Http::timeout(10)->post($webhookUrl, [
            'tokens' => $pushTokens,
            'title' => $content['title'],
            'body' => $content['body'],
            'data' => [
                'type' => 'new_message',
                'conversation_id' => $content['conversation_id'],
                'message_id' => $content['message_id'],
            ],
        ]);

        return $response->successful();
    }

    /**
     * Send SMS notification via Orange/MTN gateway
     */
    private function sendSmsNotification(User $recipient, array $content): bool
    {
        $phone = $recipient->numero_telephone;

        if (!$phone) {
            return false;
        }

        // Prepare SMS content (max 160 chars)
        $smsText = "{$content['sender_first_name']}: {$content['preview']}";
        if (strlen($smsText) > 155) {
            $smsText = substr($smsText, 0, 155) . '...';
        }

        // Send via n8n webhook
        $webhookUrl = config('services.n8n.webhook_url') . '/sms-notification';

        $response = Http::timeout(10)->post($webhookUrl, [
            'phone' => $phone,
            'message' => $smsText,
            'type' => 'new_message',
        ]);

        return $response->successful();
    }

    /**
     * Send email notification
     */
    private function sendEmailNotification(User $recipient, array $content): bool
    {
        $email = $recipient->email;

        if (!$email) {
            return false;
        }

        // Send via n8n webhook (which handles email templates)
        $webhookUrl = config('services.n8n.webhook_url') . '/email-notification';

        $response = Http::timeout(10)->post($webhookUrl, [
            'to' => $email,
            'recipient_name' => $recipient->prenom,
            'template' => 'new_message',
            'data' => [
                'sender_name' => $content['sender_name'],
                'message_preview' => $content['preview'],
                'listing_title' => $content['listing_title'],
                'deep_link' => config('app.frontend_url') . $content['deep_link'],
            ],
        ]);

        return $response->successful();
    }

    /**
     * Send WhatsApp notification via WAHA
     */
    private function sendWhatsAppNotification(User $recipient, array $content): bool
    {
        $phone = $recipient->numero_telephone_whatsapp ?? $recipient->numero_telephone;

        if (!$phone) {
            return false;
        }

        // Format phone for WhatsApp (with country code)
        $formattedPhone = $this->formatPhoneForWhatsApp($phone);

        // Send via WAHA
        $wahaUrl = config('services.waha.url') . '/api/sendText';

        $message = "📩 *Nouveau message sur ImmoGuinée*\n\n"
            . "De: {$content['sender_name']}\n"
            . "Annonce: {$content['listing_title']}\n\n"
            . "💬 {$content['preview']}\n\n"
            . "👉 Répondre: " . config('app.frontend_url') . $content['deep_link'];

        $response = Http::timeout(10)
            ->withHeaders(['X-Api-Key' => config('services.waha.api_key')])
            ->post($wahaUrl, [
                'chatId' => "{$formattedPhone}@c.us",
                'text' => $message,
                'session' => config('services.waha.session', 'default'),
            ]);

        return $response->successful();
    }

    /**
     * Format phone number for WhatsApp
     */
    private function formatPhoneForWhatsApp(string $phone): string
    {
        // Remove any non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Add Guinea country code if not present
        if (!str_starts_with($phone, '224')) {
            $phone = '224' . $phone;
        }

        return $phone;
    }

    /**
     * Create in-app notification record
     */
    private function createInAppNotification(User $recipient, Message $message, User $sender): void
    {
        Notification::create([
            'user_id' => $recipient->id,
            'type' => 'new_message',
            'titre' => 'Nouveau message',
            'message' => "{$sender->prenom} vous a envoyé un message",
            'data' => [
                'message_id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $sender->id,
            ],
            'lu' => false,
        ]);
    }

    /**
     * Send notification for read receipt
     */
    public function notifyMessageRead(Message $message): void
    {
        $sender = $message->sender;

        if (!$sender) {
            return;
        }

        // Just broadcast event - no push notification for read receipts
        event(new \App\Events\MessageReadEvent($message));
    }

    /**
     * Send notification for typing indicator
     */
    public function notifyTyping(Conversation $conversation, User $user): void
    {
        event(new \App\Events\TypingIndicatorEvent($conversation, $user));
    }
}
