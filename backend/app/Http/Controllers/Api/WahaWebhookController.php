<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WahaWebhookController extends Controller
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Handle WAHA webhook events.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify webhook authenticity
        if (!$this->verifyWebhookSignature($request)) {
            Log::warning('WAHA webhook: Invalid signature', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all(),
            ]);
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;

        // Sanitize payload before logging (remove sensitive data)
        $safePayload = $this->sanitizePayloadForLogging($payload);
        Log::info('WAHA webhook received', [
            'event' => $event,
            'payload' => $safePayload,
        ]);

        try {
            return match ($event) {
                'message' => $this->handleIncomingMessage($payload),
                'message.ack' => $this->handleMessageAck($payload),
                'message.button.reply' => $this->handleButtonReply($payload),
                'session.status' => $this->handleSessionStatus($payload),
                default => $this->handleUnknownEvent($event, $payload),
            };
        } catch (\Exception $e) {
            Log::error('WAHA webhook error', [
                'event' => $event,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle incoming messages.
     * Detects reschedule availability messages from clients.
     *
     * @param array $payload
     * @return JsonResponse
     */
    protected function handleIncomingMessage(array $payload): JsonResponse
    {
        $message = $payload['payload'] ?? [];
        $from = $message['from'] ?? null;
        $body = $message['body'] ?? '';

        Log::info('WAHA: Incoming message', [
            'from' => $from,
            'body' => substr($body, 0, 200),
        ]);

        if (!$from || !$body) {
            return response()->json([
                'success' => true,
                'message' => 'Message received but no content to process',
            ]);
        }

        // Extract phone number from WhatsApp ID (format: 224XXXXXXXXX@c.us)
        $phone = str_replace('@c.us', '', $from);

        // Check if this is a follow-up message from someone who requested to reschedule
        $pendingRescheduleVisit = Visit::where('client_telephone', $phone)
            ->where('client_response', 'RESCHEDULE')
            ->whereNull('proposed_date')
            ->whereIn('statut', ['PENDING', 'CONFIRMED'])
            ->orderBy('updated_at', 'desc')
            ->first();

        if ($pendingRescheduleVisit) {
            // Save the client's message as proposed availability
            $pendingRescheduleVisit->client_message = $body;
            $pendingRescheduleVisit->save();

            Log::info('WAHA: Client provided reschedule availability', [
                'visit_id' => $pendingRescheduleVisit->id,
                'message' => substr($body, 0, 100),
            ]);

            // Notify owner of client's availability
            $this->notifyOwnerOfAvailability($pendingRescheduleVisit, $body);

            // Send confirmation to client
            try {
                $this->whatsAppService->send(
                    $phone,
                    "Merci ! Nous avons bien reçu vos disponibilités. Le propriétaire vous recontactera bientôt pour confirmer un nouveau créneau.",
                    'reschedule_confirmation',
                    ['visit_id' => $pendingRescheduleVisit->id]
                );
            } catch (\Exception $e) {
                Log::error('WAHA: Failed to send reschedule confirmation', [
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Reschedule availability recorded',
                'visit_id' => $pendingRescheduleVisit->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Incoming message received',
        ]);
    }

    /**
     * Notify owner of client's proposed availability for rescheduling.
     *
     * @param Visit $visit
     * @param string $clientMessage
     * @return void
     */
    protected function notifyOwnerOfAvailability(Visit $visit, string $clientMessage): void
    {
        try {
            $owner = $visit->proprietaire;
            if (!$owner || !$owner->telephone) {
                return;
            }

            $listing = $visit->listing;
            $clientName = $visit->client_nom ?? 'Le client';

            $message = "📅 *Disponibilités du client*\n\n";
            $message .= "{$clientName} a indiqué ses disponibilités pour la visite de \"{$listing->titre}\":\n\n";
            $message .= "_{$clientMessage}_\n\n";
            $message .= "Veuillez le contacter pour confirmer un nouveau créneau.";

            $this->whatsAppService->send($owner->telephone, $message, 'client_availability', [
                'visit_id' => $visit->id,
            ]);
        } catch (\Exception $e) {
            Log::error('WAHA: Failed to notify owner of availability', [
                'error' => $e->getMessage(),
                'visit_id' => $visit->id,
            ]);
        }
    }

    /**
     * Handle message acknowledgment (sent, delivered, read).
     *
     * @param array $payload
     * @return JsonResponse
     */
    protected function handleMessageAck(array $payload): JsonResponse
    {
        $message = $payload['payload'] ?? [];
        $messageId = $message['id'] ?? null;
        $ack = $message['ack'] ?? null;

        if (!$messageId) {
            return response()->json([
                'success' => false,
                'message' => 'No message ID provided',
            ], 400);
        }

        // Map WAHA ack values to our status
        // 1 = sent, 2 = delivered, 3 = read
        $status = match ($ack) {
            1 => 'sent',
            2 => 'delivered',
            3 => 'read',
            -1, 0 => 'failed',
            default => null,
        };

        if ($status) {
            $this->whatsAppService->updateMessageStatus($messageId, $status);

            Log::info('WAHA: Message status updated', [
                'message_id' => $messageId,
                'status' => $status,
                'ack' => $ack,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Acknowledgment processed',
            'status' => $status,
        ]);
    }

    /**
     * Handle session status changes.
     *
     * @param array $payload
     * @return JsonResponse
     */
    protected function handleSessionStatus(array $payload): JsonResponse
    {
        $session = $payload['payload'] ?? [];
        $status = $session['status'] ?? 'unknown';
        $sessionName = $session['name'] ?? null;

        Log::info('WAHA: Session status changed', [
            'session' => $sessionName,
            'status' => $status,
        ]);

        // Handle session disconnection
        if (in_array($status, ['STOPPED', 'FAILED', 'SCAN_QR_CODE'])) {
            Log::warning('WAHA: Session requires attention', [
                'session' => $sessionName,
                'status' => $status,
            ]);

            // Attempt to restart session if it failed
            if ($status === 'FAILED') {
                try {
                    $this->whatsAppService->startSession();
                    Log::info('WAHA: Session restart attempted');
                } catch (\Exception $e) {
                    Log::error('WAHA: Failed to restart session', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Session status processed',
            'status' => $status,
        ]);
    }

    /**
     * Handle button reply from WhatsApp interactive messages.
     *
     * @param array $payload
     * @return JsonResponse
     */
    protected function handleButtonReply(array $payload): JsonResponse
    {
        $message = $payload['payload'] ?? [];
        $from = $message['from'] ?? null;
        $buttonId = $message['selectedButtonId'] ?? $message['buttonId'] ?? null;

        // Alternative payload structure for some WAHA versions
        if (!$buttonId && isset($message['button'])) {
            $buttonId = $message['button']['id'] ?? $message['button']['payload'] ?? null;
        }

        // Check for interactive message response structure
        if (!$buttonId && isset($message['interactive'])) {
            $buttonId = $message['interactive']['button_reply']['id'] ?? null;
        }

        Log::info('WAHA: Button reply received', [
            'from' => $from,
            'button_id' => $buttonId,
            'raw_payload' => $message,
        ]);

        if (!$buttonId) {
            return response()->json([
                'success' => false,
                'message' => 'No button ID found in payload',
            ], 400);
        }

        // Parse button ID format: action_visitId (e.g., confirm_uuid, unavailable_uuid, reschedule_uuid)
        $parts = explode('_', $buttonId, 2);
        if (count($parts) !== 2) {
            Log::warning('WAHA: Invalid button ID format', ['button_id' => $buttonId]);
            return response()->json([
                'success' => false,
                'message' => 'Invalid button ID format',
            ], 400);
        }

        [$action, $visitId] = $parts;

        // Find the visit
        $visit = Visit::find($visitId);
        if (!$visit) {
            Log::warning('WAHA: Visit not found for button response', ['visit_id' => $visitId]);
            return response()->json([
                'success' => false,
                'message' => 'Visit not found',
            ], 404);
        }

        // Process based on action
        $responseMessage = '';
        switch ($action) {
            case 'confirm':
                $visit->client_response = 'CONFIRMED';
                $visit->client_responded_at = now();
                if ($visit->canBeConfirmed()) {
                    $visit->confirm();
                }
                $responseMessage = "Merci ! Votre visite du {$visit->date_visite->format('d/m/Y')} à {$visit->heure_visite->format('H:i')} est confirmée. À bientôt !";
                break;

            case 'unavailable':
                $visit->client_response = 'UNAVAILABLE';
                $visit->client_responded_at = now();
                $visit->save();
                $responseMessage = "Nous avons bien noté que vous n'êtes pas disponible. Le propriétaire sera informé et vous recontactera pour proposer un autre créneau.";
                break;

            case 'reschedule':
                $visit->client_response = 'RESCHEDULE';
                $visit->client_responded_at = now();
                $visit->save();
                $responseMessage = "Vous souhaitez reporter la visite. Veuillez nous indiquer vos disponibilités et le propriétaire vous proposera un nouveau créneau.";
                break;

            default:
                Log::warning('WAHA: Unknown button action', ['action' => $action]);
                return response()->json([
                    'success' => false,
                    'message' => 'Unknown action',
                ], 400);
        }

        // Send confirmation message to client
        if ($responseMessage && $from) {
            try {
                // Extract phone number from WhatsApp ID (format: 224XXXXXXXXX@c.us)
                $phone = str_replace('@c.us', '', $from);
                $this->whatsAppService->send($phone, $responseMessage, 'visit_response', [
                    'visit_id' => $visitId,
                    'action' => $action,
                ]);
            } catch (\Exception $e) {
                Log::error('WAHA: Failed to send confirmation message', [
                    'error' => $e->getMessage(),
                    'phone' => $from,
                ]);
            }
        }

        // Notify property owner about the response
        $this->notifyOwnerOfResponse($visit, $action);

        Log::info('WAHA: Button response processed', [
            'visit_id' => $visitId,
            'action' => $action,
            'client_response' => $visit->client_response,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Button response processed',
            'action' => $action,
            'visit_id' => $visitId,
        ]);
    }

    /**
     * Notify property owner about client's response.
     *
     * @param Visit $visit
     * @param string $action
     * @return void
     */
    protected function notifyOwnerOfResponse(Visit $visit, string $action): void
    {
        try {
            $owner = $visit->proprietaire;
            if (!$owner || !$owner->telephone) {
                return;
            }

            $listing = $visit->listing;
            $clientName = $visit->client_nom ?? 'Un client';
            $dateFormatted = $visit->date_visite->format('d/m/Y');
            $timeFormatted = $visit->heure_visite->format('H:i');

            $message = match ($action) {
                'confirm' => "✅ *Visite confirmée*\n\n{$clientName} a confirmé la visite pour votre bien \"{$listing->titre}\" le {$dateFormatted} à {$timeFormatted}.",
                'unavailable' => "❌ *Client indisponible*\n\n{$clientName} n'est pas disponible pour la visite de \"{$listing->titre}\" prévue le {$dateFormatted} à {$timeFormatted}. Veuillez proposer un autre créneau.",
                'reschedule' => "📅 *Demande de report*\n\n{$clientName} souhaite reporter la visite de \"{$listing->titre}\" prévue le {$dateFormatted} à {$timeFormatted}. Veuillez le contacter pour convenir d'une nouvelle date.",
                default => null,
            };

            if ($message) {
                $this->whatsAppService->send($owner->telephone, $message, 'owner_notification', [
                    'visit_id' => $visit->id,
                    'action' => $action,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('WAHA: Failed to notify owner', [
                'error' => $e->getMessage(),
                'visit_id' => $visit->id,
            ]);
        }
    }

    /**
     * Handle unknown events.
     *
     * @param string|null $event
     * @param array $payload
     * @return JsonResponse
     */
    protected function handleUnknownEvent(?string $event, array $payload): JsonResponse
    {
        Log::info('WAHA: Unknown event received', [
            'event' => $event,
            'payload' => $payload,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Event received but not processed',
            'event' => $event,
        ]);
    }

    /**
     * Get WAHA session status.
     *
     * @return JsonResponse
     */
    public function status(): JsonResponse
    {
        try {
            $status = $this->whatsAppService->getSessionStatus(false);

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => $status,
                    'is_ready' => $this->whatsAppService->isSessionReady(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get session status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get QR code for session authentication.
     *
     * @return JsonResponse
     */
    public function qrCode(): JsonResponse
    {
        try {
            $qrCode = $this->whatsAppService->getQrCode();

            if (!$qrCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR code not available. Session may already be authenticated.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'qr_code' => $qrCode,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get QR code',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Start/restart WAHA session.
     *
     * @return JsonResponse
     */
    public function startSession(): JsonResponse
    {
        try {
            $started = $this->whatsAppService->startSession();

            return response()->json([
                'success' => $started,
                'message' => $started ? 'Session started successfully' : 'Failed to start session',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stop WAHA session.
     *
     * @return JsonResponse
     */
    public function stopSession(): JsonResponse
    {
        try {
            $stopped = $this->whatsAppService->stopSession();

            return response()->json([
                'success' => $stopped,
                'message' => $stopped ? 'Session stopped successfully' : 'Failed to stop session',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to stop session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify WAHA webhook signature/API key.
     *
     * WAHA sends webhooks with X-Api-Key header matching the configured API key.
     * We also allow requests from internal Docker network (WAHA container).
     *
     * @param Request $request
     * @return bool
     */
    protected function verifyWebhookSignature(Request $request): bool
    {
        // Get expected API key from config/secrets
        $expectedKey = $this->getWahaApiKey();

        // Skip verification in local/testing if no key configured
        if (!$expectedKey && !app()->isProduction()) {
            return true;
        }

        // Check X-Api-Key header (WAHA standard)
        $providedKey = $request->header('X-Api-Key');
        if ($providedKey && hash_equals($expectedKey, $providedKey)) {
            return true;
        }

        // Check Authorization header as fallback
        $authHeader = $request->header('Authorization');
        if ($authHeader) {
            $token = str_replace('Bearer ', '', $authHeader);
            if (hash_equals($expectedKey, $token)) {
                return true;
            }
        }

        // Allow from internal Docker network (waha service)
        $clientIp = $request->ip();
        if ($this->isInternalDockerNetwork($clientIp)) {
            return true;
        }

        return false;
    }

    /**
     * Check if request is from internal Docker network.
     *
     * @param string|null $ip
     * @return bool
     */
    protected function isInternalDockerNetwork(?string $ip): bool
    {
        if (!$ip) {
            return false;
        }

        // Docker internal networks typically use these ranges
        $dockerRanges = [
            '172.16.0.0/12',  // Docker default bridge
            '10.0.0.0/8',     // Docker Swarm overlay
            '192.168.0.0/16', // Docker compose
        ];

        foreach ($dockerRanges as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if IP is in CIDR range.
     *
     * @param string $ip
     * @param string $range
     * @return bool
     */
    protected function ipInRange(string $ip, string $range): bool
    {
        [$subnet, $bits] = explode('/', $range);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        $mask = -1 << (32 - (int) $bits);

        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    /**
     * Get WAHA API key from Docker secrets or env.
     *
     * @return string|null
     */
    protected function getWahaApiKey(): ?string
    {
        // Try Docker secret first
        $secretPath = '/run/secrets/waha_api_key';
        if (file_exists($secretPath)) {
            return trim(file_get_contents($secretPath));
        }

        // Fallback to env
        return config('services.waha.api_key') ?: env('WAHA_API_KEY');
    }

    /**
     * Sanitize payload for safe logging.
     *
     * @param array $payload
     * @return array
     */
    protected function sanitizePayloadForLogging(array $payload): array
    {
        $sensitiveKeys = ['body', 'caption', 'text', 'message'];
        $maxLength = 200;

        array_walk_recursive($payload, function (&$value, $key) use ($sensitiveKeys, $maxLength) {
            if (is_string($value)) {
                // Truncate long values
                if (strlen($value) > $maxLength) {
                    $value = substr($value, 0, $maxLength) . '...[truncated]';
                }
                // Mask potential phone numbers (keep first 3 and last 2 digits)
                if (preg_match('/^\d{10,15}$/', $value)) {
                    $value = substr($value, 0, 3) . str_repeat('*', strlen($value) - 5) . substr($value, -2);
                }
            }
        });

        return $payload;
    }
}
