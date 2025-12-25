<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send a push notification to a specific user
     *
     * @param User $user The user to send the notification to
     * @param string $title The notification title
     * @param string $body The notification body
     * @param array $data Additional data to send with the notification
     * @param string|null $channelId Android notification channel ID
     * @return bool Whether the notification was sent successfully
     */
    public function send(
        User $user,
        string $title,
        string $body,
        array $data = [],
        ?string $channelId = 'general'
    ): bool {
        $tokens = $user->push_tokens ?? [];

        if (empty($tokens)) {
            Log::debug('[ExpoPush] No push tokens for user', [
                'user_id' => $user->id,
            ]);
            return false;
        }

        $pushTokens = array_values($tokens);

        return $this->sendToTokens($pushTokens, $title, $body, $data, $channelId);
    }

    /**
     * Send a push notification to multiple users
     *
     * @param array $users Array of User models
     * @param string $title The notification title
     * @param string $body The notification body
     * @param array $data Additional data to send with the notification
     * @param string|null $channelId Android notification channel ID
     * @return int Number of notifications sent
     */
    public function sendToMany(
        array $users,
        string $title,
        string $body,
        array $data = [],
        ?string $channelId = 'general'
    ): int {
        $allTokens = [];

        foreach ($users as $user) {
            if ($user instanceof User && !empty($user->push_tokens)) {
                $allTokens = array_merge($allTokens, array_values($user->push_tokens));
            }
        }

        if (empty($allTokens)) {
            return 0;
        }

        // Expo Push API accepts up to 100 messages per request
        $chunks = array_chunk($allTokens, 100);
        $sent = 0;

        foreach ($chunks as $chunk) {
            if ($this->sendToTokens($chunk, $title, $body, $data, $channelId)) {
                $sent += count($chunk);
            }
        }

        return $sent;
    }

    /**
     * Send a new message notification
     *
     * @param User $recipient The user receiving the notification
     * @param string $senderName Name of the message sender
     * @param string $preview Message preview text
     * @param string $conversationId Conversation ID for deep linking
     * @param string|null $messageId Optional message ID
     * @return bool
     */
    public function sendNewMessageNotification(
        User $recipient,
        string $senderName,
        string $preview,
        string $conversationId,
        ?string $messageId = null
    ): bool {
        $data = [
            'type' => 'new_message',
            'conversation_id' => $conversationId,
            'sender_name' => $senderName,
            'preview' => $preview,
        ];

        if ($messageId) {
            $data['message_id'] = $messageId;
        }

        return $this->send(
            $recipient,
            $senderName,
            $preview,
            $data,
            'messages'
        );
    }

    /**
     * Send a visit reminder notification
     *
     * @param User $user The user to remind
     * @param string $listingTitle Title of the listing
     * @param string $dateTime Formatted date and time of the visit
     * @param string $visitId Visit ID for deep linking
     * @return bool
     */
    public function sendVisitReminder(
        User $user,
        string $listingTitle,
        string $dateTime,
        string $visitId
    ): bool {
        $data = [
            'type' => 'visit_reminder',
            'visit_id' => $visitId,
        ];

        return $this->send(
            $user,
            'Rappel de visite',
            "Visite de \"{$listingTitle}\" prévue à {$dateTime}",
            $data,
            'visits'
        );
    }

    /**
     * Send a listing update notification
     *
     * @param User $user The user to notify
     * @param string $listingId Listing ID
     * @param string $title Notification title
     * @param string $message Notification message
     * @return bool
     */
    public function sendListingUpdateNotification(
        User $user,
        string $listingId,
        string $title,
        string $message
    ): bool {
        $data = [
            'type' => 'listing_update',
            'listing_id' => $listingId,
        ];

        return $this->send($user, $title, $message, $data, 'general');
    }

    /**
     * Send notification to specific Expo push tokens
     *
     * @param array $tokens Array of Expo push tokens
     * @param string $title Notification title
     * @param string $body Notification body
     * @param array $data Additional data
     * @param string|null $channelId Android channel ID
     * @return bool
     */
    private function sendToTokens(
        array $tokens,
        string $title,
        string $body,
        array $data = [],
        ?string $channelId = null
    ): bool {
        // Filter and validate Expo push tokens
        $validTokens = array_filter($tokens, function ($token) {
            return is_string($token) && str_starts_with($token, 'ExponentPushToken[');
        });

        if (empty($validTokens)) {
            Log::debug('[ExpoPush] No valid Expo push tokens', [
                'original_count' => count($tokens),
            ]);
            return false;
        }

        // Build message payload for each token
        $messages = array_map(function ($token) use ($title, $body, $data, $channelId) {
            $message = [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'badge' => 1,
                'priority' => 'high',
            ];

            if ($channelId) {
                $message['channelId'] = $channelId;
            }

            return $message;
        }, array_values($validTokens));

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post(self::EXPO_PUSH_URL, $messages);

            if ($response->successful()) {
                $result = $response->json();

                // Log any errors from Expo
                if (isset($result['data'])) {
                    foreach ($result['data'] as $index => $ticketData) {
                        if (isset($ticketData['status']) && $ticketData['status'] === 'error') {
                            Log::warning('[ExpoPush] Push failed for token', [
                                'token' => $validTokens[$index] ?? 'unknown',
                                'error' => $ticketData['message'] ?? 'Unknown error',
                                'details' => $ticketData['details'] ?? null,
                            ]);
                        }
                    }
                }

                Log::info('[ExpoPush] Notifications sent', [
                    'count' => count($messages),
                    'title' => $title,
                ]);

                return true;
            }

            Log::error('[ExpoPush] Failed to send notifications', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('[ExpoPush] Exception sending notifications', [
                'error' => $e->getMessage(),
                'token_count' => count($validTokens),
            ]);

            return false;
        }
    }

    /**
     * Handle push notification receipts (for tracking delivery status)
     *
     * @param array $ticketIds Array of ticket IDs from previous send
     * @return array Receipt data
     */
    public function getReceipts(array $ticketIds): array
    {
        if (empty($ticketIds)) {
            return [];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post('https://exp.host/--/api/v2/push/getReceipts', [
                    'ids' => $ticketIds,
                ]);

            if ($response->successful()) {
                return $response->json()['data'] ?? [];
            }

            return [];

        } catch (\Exception $e) {
            Log::error('[ExpoPush] Failed to get receipts', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}
