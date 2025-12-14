<?php

namespace App\Services;

use App\Models\WhatsAppMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

class WhatsAppService
{
    /**
     * WAHA Base URL
     */
    protected string $baseUrl;

    /**
     * API Key
     */
    protected ?string $apiKey;

    /**
     * Session name
     */
    protected string $sessionName;

    /**
     * Maximum retry attempts
     */
    protected int $maxRetries = 3;

    /**
     * Session status cache key
     */
    protected const SESSION_CACHE_KEY = 'waha_session_status';

    /**
     * Session cache TTL in seconds
     */
    protected const SESSION_CACHE_TTL = 60;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.waha.url', 'http://immog-waha:3000'), '/');
        $this->apiKey = config('services.waha.api_key');
        $this->sessionName = config('services.waha.session_name', 'default');
    }

    /**
     * Send WhatsApp message with logging and status tracking
     *
     * @param string $to Phone number in format: 224XXXXXXXXX
     * @param string $message
     * @param string $type Message type for categorization
     * @param array $metadata Additional metadata to store
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function send(string $to, string $message, string $type = 'general', array $metadata = []): WhatsAppMessage
    {
        $to = $this->formatPhoneNumber($to);

        // Create message log record
        $messageLog = WhatsAppMessage::create([
            'phone_number' => $to,
            'message' => $message,
            'type' => $type,
            'status' => 'pending',
            'metadata' => $metadata,
        ]);

        try {
            // Ensure session is ready
            $this->ensureSessionReady();

            $response = $this->makeRequest('POST', '/api/sendText', [
                'session' => $this->sessionName,
                'chatId' => "{$to}@c.us",
                'text' => $message,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                $messageLog->update([
                    'status' => 'sent',
                    'waha_message_id' => $data['id'] ?? null,
                    'sent_at' => now(),
                    'response_data' => $data,
                ]);

                Log::info('WhatsApp message sent successfully', [
                    'to' => $to,
                    'message_id' => $data['id'] ?? null,
                    'log_id' => $messageLog->id,
                ]);

                return $messageLog;
            } else {
                throw new Exception('WAHA API error: ' . $response->body());
            }
        } catch (Exception $e) {
            $messageLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $messageLog->attempts + 1,
            ]);

            Log::error('Failed to send WhatsApp message', [
                'to' => $to,
                'error' => $e->getMessage(),
                'log_id' => $messageLog->id,
            ]);

            throw $e;
        }
    }

    /**
     * Send WhatsApp message with image
     *
     * @param string $to
     * @param string $imageUrl
     * @param string|null $caption
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendImage(string $to, string $imageUrl, string $caption = null): WhatsAppMessage
    {
        $to = $this->formatPhoneNumber($to);

        $messageLog = WhatsAppMessage::create([
            'phone_number' => $to,
            'message' => $caption ?? '[Image]',
            'type' => 'image',
            'status' => 'pending',
            'metadata' => ['image_url' => $imageUrl],
        ]);

        try {
            $this->ensureSessionReady();

            $response = $this->makeRequest('POST', '/api/sendImage', [
                'session' => $this->sessionName,
                'chatId' => "{$to}@c.us",
                'file' => [
                    'url' => $imageUrl,
                ],
                'caption' => $caption,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                $messageLog->update([
                    'status' => 'sent',
                    'waha_message_id' => $data['id'] ?? null,
                    'sent_at' => now(),
                    'response_data' => $data,
                ]);

                return $messageLog;
            } else {
                throw new Exception('WAHA API error: ' . $response->body());
            }
        } catch (Exception $e) {
            $messageLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $messageLog->attempts + 1,
            ]);

            throw $e;
        }
    }

    /**
     * Send WhatsApp message with file
     *
     * @param string $to
     * @param string $fileUrl
     * @param string|null $caption
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendFile(string $to, string $fileUrl, string $caption = null): WhatsAppMessage
    {
        $to = $this->formatPhoneNumber($to);

        $messageLog = WhatsAppMessage::create([
            'phone_number' => $to,
            'message' => $caption ?? '[File]',
            'type' => 'file',
            'status' => 'pending',
            'metadata' => ['file_url' => $fileUrl],
        ]);

        try {
            $this->ensureSessionReady();

            $response = $this->makeRequest('POST', '/api/sendFile', [
                'session' => $this->sessionName,
                'chatId' => "{$to}@c.us",
                'file' => [
                    'url' => $fileUrl,
                ],
                'caption' => $caption,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                $messageLog->update([
                    'status' => 'sent',
                    'waha_message_id' => $data['id'] ?? null,
                    'sent_at' => now(),
                    'response_data' => $data,
                ]);

                return $messageLog;
            } else {
                throw new Exception('WAHA API error: ' . $response->body());
            }
        } catch (Exception $e) {
            $messageLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $messageLog->attempts + 1,
            ]);

            throw $e;
        }
    }

    /**
     * Check session status
     *
     * @param bool $useCache
     * @return array
     */
    public function getSessionStatus(bool $useCache = true): array
    {
        if ($useCache) {
            $cached = Cache::get(self::SESSION_CACHE_KEY);
            if ($cached !== null) {
                return $cached;
            }
        }

        try {
            $response = $this->makeRequest('GET', "/api/sessions/{$this->sessionName}");

            if ($response->successful()) {
                $status = $response->json();
                Cache::put(self::SESSION_CACHE_KEY, $status, self::SESSION_CACHE_TTL);
                return $status;
            }

            return ['status' => 'UNKNOWN'];
        } catch (Exception $e) {
            Log::error('Failed to get session status', [
                'error' => $e->getMessage(),
            ]);

            return ['status' => 'ERROR', 'error' => $e->getMessage()];
        }
    }

    /**
     * Check if session is ready
     *
     * @return bool
     */
    public function isSessionReady(): bool
    {
        $status = $this->getSessionStatus();
        return isset($status['status']) && $status['status'] === 'WORKING';
    }

    /**
     * Ensure session is ready, attempt to start/reconnect if not
     *
     * @throws Exception
     */
    public function ensureSessionReady(): void
    {
        if ($this->isSessionReady()) {
            return;
        }

        // Clear cache to get fresh status
        Cache::forget(self::SESSION_CACHE_KEY);

        Log::warning('WAHA session not ready, attempting to start/reconnect');

        // Try to start session
        $started = $this->startSession();

        if (!$started) {
            throw new Exception('WAHA session is not available and could not be started');
        }

        // Wait a bit for session to be ready
        sleep(2);

        if (!$this->isSessionReady()) {
            throw new Exception('WAHA session failed to become ready after start attempt');
        }
    }

    /**
     * Start or restart WAHA session
     *
     * @return bool
     */
    public function startSession(): bool
    {
        try {
            $response = $this->makeRequest('POST', '/api/sessions/start', [
                'name' => $this->sessionName,
                'config' => [
                    'proxy' => null,
                    'webhooks' => [
                        [
                            'url' => config('app.url') . '/api/webhooks/waha',
                            'events' => ['message', 'message.ack', 'session.status'],
                        ],
                    ],
                ],
            ]);

            if ($response->successful()) {
                Log::info('WAHA session started successfully');
                Cache::forget(self::SESSION_CACHE_KEY);
                return true;
            }

            // Session might already exist, try to get status
            $status = $this->getSessionStatus(false);
            return isset($status['status']) && in_array($status['status'], ['WORKING', 'SCAN_QR_CODE']);

        } catch (Exception $e) {
            Log::error('Failed to start WAHA session', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Stop WAHA session
     *
     * @return bool
     */
    public function stopSession(): bool
    {
        try {
            $response = $this->makeRequest('POST', '/api/sessions/stop', [
                'name' => $this->sessionName,
            ]);

            Cache::forget(self::SESSION_CACHE_KEY);
            return $response->successful();

        } catch (Exception $e) {
            Log::error('Failed to stop WAHA session', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get QR code for session authentication
     *
     * @return string|null Base64 encoded QR code image
     */
    public function getQrCode(): ?string
    {
        try {
            $response = $this->makeRequest('GET', "/api/sessions/{$this->sessionName}/auth/qr");

            if ($response->successful()) {
                $data = $response->json();
                return $data['qr'] ?? null;
            }

            return null;
        } catch (Exception $e) {
            Log::error('Failed to get QR code', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Format phone number for WhatsApp
     * Supports Guinea (+224) and international numbers
     *
     * @param string $phoneNumber
     * @return string
     */
    public function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove all non-numeric characters
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);

        // Remove leading 00 (international prefix)
        if (str_starts_with($phoneNumber, '00')) {
            $phoneNumber = substr($phoneNumber, 2);
        }

        // Only add 224 for local Guinea numbers (9 digits starting with 6 or 7)
        // International numbers already have their country code
        if (strlen($phoneNumber) === 9 && in_array($phoneNumber[0], ['6', '7'])) {
            $phoneNumber = '224' . $phoneNumber;
        }

        return $phoneNumber;
    }

    /**
     * Make HTTP request to WAHA API
     *
     * @param string $method
     * @param string $endpoint
     * @param array $data
     * @return \Illuminate\Http\Client\Response
     */
    protected function makeRequest(string $method, string $endpoint, array $data = [])
    {
        $headers = ['Content-Type' => 'application/json'];

        if ($this->apiKey) {
            $headers['X-Api-Key'] = $this->apiKey;
        }

        $http = Http::withHeaders($headers)->timeout(30);

        $url = $this->baseUrl . $endpoint;

        return match (strtoupper($method)) {
            'GET' => $http->get($url, $data),
            'POST' => $http->post($url, $data),
            'PUT' => $http->put($url, $data),
            'DELETE' => $http->delete($url, $data),
            default => throw new Exception("Unsupported HTTP method: {$method}"),
        };
    }

    /**
     * Send bulk WhatsApp messages (queued)
     *
     * @param array $recipients Array of phone numbers
     * @param string $message
     * @param string $type
     * @return array
     */
    public function sendBulk(array $recipients, string $message, string $type = 'bulk'): array
    {
        $results = [
            'queued' => [],
            'failed' => [],
        ];

        foreach ($recipients as $recipient) {
            try {
                // Queue each message for async sending
                \App\Jobs\SendWhatsAppMessage::dispatch(
                    $recipient,
                    $message,
                    $type
                );

                $results['queued'][] = [
                    'phone' => $recipient,
                ];
            } catch (Exception $e) {
                $results['failed'][] = [
                    'phone' => $recipient,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    // ==================== NOTIFICATION HELPERS ====================

    /**
     * Send OTP via WhatsApp
     *
     * @param string $to
     * @param string $otp
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendOTP(string $to, string $otp): WhatsAppMessage
    {
        $message = "🔐 *Code de vérification ImmoGuinée*\n\n";
        $message .= "Votre code: *{$otp}*\n";
        $message .= "Valide pendant 5 minutes.\n\n";
        $message .= "⚠️ Ne partagez ce code avec personne!";

        return $this->send($to, $message, 'otp', ['otp' => $otp]);
    }

    /**
     * Send account verification notification
     *
     * @param string $to
     * @param string $userName
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendAccountVerification(string $to, string $userName): WhatsAppMessage
    {
        $message = "✅ *Compte vérifié - ImmoGuinée*\n\n";
        $message .= "Bonjour {$userName},\n\n";
        $message .= "Votre compte a été vérifié avec succès!\n";
        $message .= "Vous pouvez maintenant publier des annonces.\n\n";
        $message .= "Bienvenue sur ImmoGuinée! 🏠";

        return $this->send($to, $message, 'account_verification');
    }

    /**
     * Send notification about new message
     *
     * @param string $to
     * @param string $senderName
     * @param string $messagePreview
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendNewMessageNotification(string $to, string $senderName, string $messagePreview): WhatsAppMessage
    {
        $message = "💬 *Nouveau message sur ImmoGuinée*\n\n";
        $message .= "De: {$senderName}\n";
        $message .= "Message: {$messagePreview}\n\n";
        $message .= "Connectez-vous pour répondre: " . config('app.frontend_url');

        return $this->send($to, $message, 'new_message', [
            'sender_name' => $senderName,
        ]);
    }

    /**
     * Send contract notification
     *
     * @param string $to
     * @param string $contractType
     * @param string $reference
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendContractNotification(string $to, string $contractType, string $reference): WhatsAppMessage
    {
        $message = "📄 *Nouveau contrat ImmoGuinée*\n\n";
        $message .= "Type: {$contractType}\n";
        $message .= "Référence: {$reference}\n\n";
        $message .= "Consultez et signez votre contrat: " . config('app.frontend_url') . "/contrats";

        return $this->send($to, $message, 'contract', [
            'contract_type' => $contractType,
            'reference' => $reference,
        ]);
    }

    /**
     * Send payment confirmation
     *
     * @param string $to
     * @param string $amount
     * @param string $reference
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendPaymentConfirmation(string $to, string $amount, string $reference): WhatsAppMessage
    {
        $message = "✅ *Paiement confirmé*\n\n";
        $message .= "Montant: {$amount} GNF\n";
        $message .= "Référence: {$reference}\n\n";
        $message .= "Merci d'utiliser ImmoGuinée!";

        return $this->send($to, $message, 'payment', [
            'amount' => $amount,
            'reference' => $reference,
        ]);
    }

    /**
     * Send listing expiration reminder
     *
     * @param string $to
     * @param string $listingTitle
     * @param int $daysRemaining
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendListingExpirationReminder(string $to, string $listingTitle, int $daysRemaining): WhatsAppMessage
    {
        $message = "⏰ *Rappel - Annonce bientôt expirée*\n\n";
        $message .= "Votre annonce \"{$listingTitle}\" expire dans {$daysRemaining} jour(s).\n\n";
        $message .= "Renouvelez-la maintenant: " . config('app.frontend_url') . "/mes-annonces";

        return $this->send($to, $message, 'listing_reminder', [
            'listing_title' => $listingTitle,
            'days_remaining' => $daysRemaining,
        ]);
    }

    /**
     * Send visit confirmation
     *
     * @param string $to
     * @param string $listingTitle
     * @param string $visitDate
     * @param string $visitTime
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendVisitConfirmation(string $to, string $listingTitle, string $visitDate, string $visitTime): WhatsAppMessage
    {
        $message = "📅 *Visite confirmée - ImmoGuinée*\n\n";
        $message .= "Bien: {$listingTitle}\n";
        $message .= "Date: {$visitDate}\n";
        $message .= "Heure: {$visitTime}\n\n";
        $message .= "À bientôt!";

        return $this->send($to, $message, 'visit_confirmation', [
            'listing_title' => $listingTitle,
            'visit_date' => $visitDate,
            'visit_time' => $visitTime,
        ]);
    }

    /**
     * Send interactive message with buttons (WhatsApp native buttons)
     *
     * @param string $to
     * @param string $body Message body text
     * @param array $buttons Array of buttons [['id' => 'btn_1', 'text' => 'Button 1'], ...]
     * @param string|null $header Optional header text
     * @param string|null $footer Optional footer text
     * @param string $type Message type for logging
     * @param array $metadata Additional metadata
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendButtons(
        string $to,
        string $body,
        array $buttons,
        ?string $header = null,
        ?string $footer = null,
        string $type = 'interactive',
        array $metadata = []
    ): WhatsAppMessage {
        $to = $this->formatPhoneNumber($to);

        // Create message log record
        $messageLog = WhatsAppMessage::create([
            'phone_number' => $to,
            'message' => $body,
            'type' => $type,
            'status' => 'pending',
            'metadata' => array_merge($metadata, ['buttons' => $buttons]),
        ]);

        try {
            $this->ensureSessionReady();

            // Format buttons for WAHA API
            $formattedButtons = array_map(function ($btn, $index) {
                return [
                    'type' => 'reply',
                    'reply' => [
                        'id' => $btn['id'] ?? "btn_{$index}",
                        'title' => substr($btn['text'], 0, 20), // WhatsApp limit: 20 chars
                    ],
                ];
            }, $buttons, array_keys($buttons));

            $payload = [
                'session' => $this->sessionName,
                'chatId' => "{$to}@c.us",
                'type' => 'button',
                'body' => [
                    'text' => $body,
                ],
                'action' => [
                    'buttons' => $formattedButtons,
                ],
            ];

            // Add optional header
            if ($header) {
                $payload['header'] = [
                    'type' => 'text',
                    'text' => $header,
                ];
            }

            // Add optional footer
            if ($footer) {
                $payload['footer'] = [
                    'text' => $footer,
                ];
            }

            $response = $this->makeRequest('POST', '/api/sendButtons', $payload);

            if ($response->successful()) {
                $data = $response->json();

                $messageLog->update([
                    'status' => 'sent',
                    'waha_message_id' => $data['id'] ?? null,
                    'sent_at' => now(),
                    'response_data' => $data,
                ]);

                Log::info('WhatsApp button message sent successfully', [
                    'to' => $to,
                    'message_id' => $data['id'] ?? null,
                    'log_id' => $messageLog->id,
                ]);

                return $messageLog;
            } else {
                throw new Exception('WAHA API error: ' . $response->body());
            }
        } catch (Exception $e) {
            $messageLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $messageLog->attempts + 1,
            ]);

            Log::error('Failed to send WhatsApp button message', [
                'to' => $to,
                'error' => $e->getMessage(),
                'log_id' => $messageLog->id,
            ]);

            throw $e;
        }
    }

    /**
     * Send visit request with interactive buttons (Confirm / Unavailable / Reschedule)
     *
     * @param string $to
     * @param string $listingTitle
     * @param string $visitDate
     * @param string $visitTime
     * @param string $address
     * @param string $visitId
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendVisitRequestWithButtons(
        string $to,
        string $listingTitle,
        string $visitDate,
        string $visitTime,
        string $address,
        string $visitId
    ): WhatsAppMessage {
        $body = "📅 *Demande de visite - ImmoGuinée*\n\n";
        $body .= "🏠 Bien: {$listingTitle}\n";
        $body .= "📍 Adresse: {$address}\n";
        $body .= "📆 Date: {$visitDate}\n";
        $body .= "🕐 Heure: {$visitTime}\n\n";
        $body .= "Merci de confirmer votre disponibilité:";

        $buttons = [
            ['id' => "confirm_{$visitId}", 'text' => '✅ Je confirme'],
            ['id' => "unavailable_{$visitId}", 'text' => '❌ Indisponible'],
            ['id' => "reschedule_{$visitId}", 'text' => '📅 Autre date'],
        ];

        return $this->sendButtons(
            $to,
            $body,
            $buttons,
            'Nouvelle demande de visite',
            'ImmoGuinée - Votre partenaire immobilier',
            'visit_request',
            [
                'visit_id' => $visitId,
                'listing_title' => $listingTitle,
                'visit_date' => $visitDate,
                'visit_time' => $visitTime,
            ]
        );
    }

    /**
     * Send confirmation request with Yes/No buttons
     *
     * @param string $to
     * @param string $message
     * @param string $contextId Unique ID to identify this confirmation
     * @param string $yesText Text for Yes button (max 20 chars)
     * @param string $noText Text for No button (max 20 chars)
     * @return WhatsAppMessage
     * @throws Exception
     */
    public function sendConfirmation(
        string $to,
        string $message,
        string $contextId,
        string $yesText = '✅ Oui',
        string $noText = '❌ Non'
    ): WhatsAppMessage {
        $buttons = [
            ['id' => "yes_{$contextId}", 'text' => $yesText],
            ['id' => "no_{$contextId}", 'text' => $noText],
        ];

        return $this->sendButtons($to, $message, $buttons, null, null, 'confirmation', [
            'context_id' => $contextId,
        ]);
    }

    /**
     * Update message status from webhook
     *
     * @param string $wahaMessageId
     * @param string $status
     * @return bool
     */
    public function updateMessageStatus(string $wahaMessageId, string $status): bool
    {
        $message = WhatsAppMessage::where('waha_message_id', $wahaMessageId)->first();

        if (!$message) {
            return false;
        }

        $statusMap = [
            'sent' => 'sent',
            'delivered' => 'delivered',
            'read' => 'read',
            'failed' => 'failed',
        ];

        $message->update([
            'status' => $statusMap[$status] ?? $status,
            'delivered_at' => $status === 'delivered' ? now() : $message->delivered_at,
            'read_at' => $status === 'read' ? now() : $message->read_at,
        ]);

        return true;
    }
}
