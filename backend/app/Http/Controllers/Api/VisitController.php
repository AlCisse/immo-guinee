<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Models\Listing;
use App\Models\User;
use App\Models\Notification as AppNotification;
use App\Notifications\VisitRequestNotification;
use App\Services\WhatsAppService;
use App\Services\ExpoPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class VisitController extends Controller
{
    /**
     * Get all visits for the authenticated user.
     * Returns visits where user is either the property owner or the visitor.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            });

        // Filter by status
        if ($request->has('statut') && $request->statut) {
            $query->where('statut', strtoupper($request->statut));
        }

        // Filter by date
        if ($request->has('date') && $request->date) {
            $query->whereDate('date_visite', $request->date);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('date_visite', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('date_visite', '<=', $request->date_to);
        }

        // Filter by role (as owner or as visitor)
        if ($request->has('role')) {
            if ($request->role === 'proprietaire') {
                $query->where('proprietaire_id', $user->id);
            } elseif ($request->role === 'visiteur') {
                $query->where('visiteur_id', $user->id);
            }
        }

        // Order by date and time
        $query->orderBy('date_visite', 'desc')
            ->orderBy('heure_visite', 'asc');

        $visits = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $visits,
        ]);
    }

    /**
     * Get upcoming visits for the authenticated user.
     */
    public function upcoming(Request $request): JsonResponse
    {
        $user = $request->user();

        $visits = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            })
            ->upcoming()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $visits,
        ]);
    }

    /**
     * Get visits for a specific date (calendar view).
     */
    public function byDate(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $user = $request->user();

        $visits = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            })
            ->onDate($request->date)
            ->orderBy('heure_visite')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $visits,
        ]);
    }

    /**
     * Create a new visit request.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'listing_id' => 'required|uuid|exists:listings,id',
            'client_nom' => 'required|string|max:255',
            'client_telephone' => 'required|string|max:20',
            'client_email' => 'nullable|email|max:255',
            'date_visite' => 'required|date|after_or_equal:today',
            'heure_visite' => 'required|date_format:H:i',
            'duree_minutes' => 'nullable|integer|min:15|max:180',
            'notes' => 'nullable|string|max:1000',
            'send_notification' => 'nullable|boolean',
        ]);

        $listing = Listing::findOrFail($validated['listing_id']);

        // Create the visit
        $visit = Visit::create([
            'listing_id' => $listing->id,
            'proprietaire_id' => $listing->user_id,
            'visiteur_id' => $request->user()->id,
            'client_nom' => $validated['client_nom'],
            'client_telephone' => $validated['client_telephone'],
            'client_email' => $validated['client_email'] ?? null,
            'date_visite' => $validated['date_visite'],
            'heure_visite' => $validated['heure_visite'],
            'duree_minutes' => $validated['duree_minutes'] ?? 30,
            'notes' => $validated['notes'] ?? null,
            'statut' => 'PENDING',
        ]);

        // Generate response token for client
        $visit->generateResponseToken();

        // Send in-app notification to property owner
        $owner = User::find($listing->user_id);
        if ($owner) {
            $dateFormatted = \Carbon\Carbon::parse($validated['date_visite'])->format('d/m/Y');
            AppNotification::notify(
                $owner,
                AppNotification::TYPE_VISIT_REQUESTED,
                'Nouvelle demande de visite',
                "Une visite est demandée pour \"{$listing->titre}\" le {$dateFormatted} à {$validated['heure_visite']}",
                [
                    'visit_id' => $visit->id,
                    'listing_id' => $listing->id,
                    'client_nom' => $validated['client_nom'],
                ],
                '/dashboard/visites' // action_url - redirect to visits page
            );
        }

        // Send WhatsApp notification to client if requested
        if ($validated['send_notification'] ?? true) {
            $this->sendVisitNotification($visit);
        }

        $visit->load(['listing', 'proprietaire', 'visiteur']);

        return response()->json([
            'success' => true,
            'message' => 'Demande de visite envoyée avec succès',
            'data' => $visit,
        ], 201);
    }

    /**
     * Send visit notification to client via WhatsApp.
     */
    protected function sendVisitNotification(Visit $visit): void
    {
        try {
            $whatsApp = app(WhatsAppService::class);
            $listing = $visit->listing;

            // Build response URL
            $responseUrl = config('app.frontend_url', 'http://localhost:8888') . '/visite/reponse?token=' . $visit->response_token;

            $message = "📅 *Demande de visite - ImmoGuinée*\n\n";
            $message .= "🏠 *Bien:* {$listing->titre}\n";
            $message .= "📍 *Adresse:* {$listing->quartier}, {$listing->commune}\n";
            $message .= "📆 *Date:* {$visit->date_visite->format('d/m/Y')}\n";
            $message .= "🕐 *Heure:* {$visit->heure_visite->format('H:i')}\n\n";
            $message .= "Merci de confirmer votre disponibilité:\n\n";
            $message .= "👉 Cliquez ici pour répondre:\n{$responseUrl}\n\n";
            $message .= "_Ou répondez à ce message avec:_\n";
            $message .= "✅ *1* pour CONFIRMER\n";
            $message .= "❌ *2* si INDISPONIBLE\n";
            $message .= "📅 *3* pour PROPOSER UNE AUTRE DATE";

            $whatsApp->send($visit->client_telephone, $message, 'visit_request', [
                'visit_id' => $visit->id,
            ]);

            $visit->update([
                'notification_sent' => true,
                'notification_sent_at' => now(),
            ]);

            \Log::info('Visit notification sent', [
                'visit_id' => $visit->id,
                'client_phone' => $visit->client_telephone,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send visit notification', [
                'visit_id' => $visit->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Resend notification to client.
     */
    public function resendNotification(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $visit = Visit::where('proprietaire_id', $user->id)->findOrFail($id);

        if (!$visit->response_token) {
            $visit->generateResponseToken();
        }

        $this->sendVisitNotification($visit);

        return response()->json([
            'success' => true,
            'message' => 'Notification renvoyée au client',
        ]);
    }

    /**
     * Client responds to visit request (public endpoint).
     */
    public function clientResponse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|size:64',
            'response' => 'required|in:CONFIRMED,UNAVAILABLE,RESCHEDULE',
            'proposed_date' => 'required_if:response,RESCHEDULE|nullable|date|after_or_equal:today',
            'proposed_time' => 'required_if:response,RESCHEDULE|nullable|date_format:H:i',
            'message' => 'nullable|string|max:500',
        ]);

        $visit = Visit::with(['listing', 'proprietaire'])
            ->where('response_token', $validated['token'])
            ->where('statut', 'PENDING')
            ->firstOrFail();

        $visit->update([
            'client_response' => $validated['response'],
            'proposed_date' => $validated['proposed_date'] ?? null,
            'proposed_time' => $validated['proposed_time'] ?? null,
            'client_message' => $validated['message'] ?? null,
            'client_responded_at' => now(),
        ]);

        // Auto-confirm if client confirmed
        if ($validated['response'] === 'CONFIRMED') {
            $visit->confirm();
        }

        // Update status based on response
        if ($validated['response'] === 'UNAVAILABLE') {
            $visit->update(['statut' => 'CANCELLED', 'motif_annulation' => 'Client indisponible']);
        }

        // Notify owner about client response
        $this->notifyOwnerOfResponse($visit, $validated['response'], $validated);

        $visit->load(['listing']);

        return response()->json([
            'success' => true,
            'message' => $this->getResponseMessage($validated['response']),
            'data' => [
                'visit' => $visit,
                'listing' => $visit->listing,
            ],
        ]);
    }

    /**
     * Notify property owner about client's response via WhatsApp.
     */
    protected function notifyOwnerOfResponse(Visit $visit, string $response, array $data): void
    {
        try {
            $whatsApp = app(WhatsAppService::class);
            $listing = $visit->listing;
            $owner = $visit->proprietaire;

            if (!$owner || !$owner->telephone) {
                \Log::warning('Cannot notify owner - no phone number', ['visit_id' => $visit->id]);
                return;
            }

            $clientName = $visit->client_nom;
            $visitDate = $visit->date_visite->format('d/m/Y');
            $visitTime = $visit->heure_visite->format('H:i');

            switch ($response) {
                case 'CONFIRMED':
                    $emoji = '✅';
                    $status = 'CONFIRMEE';
                    $message = "✅ *Visite confirmee - ImmoGuinee*\n\n";
                    $message .= "Le client a confirme la visite!\n\n";
                    $message .= "👤 *Client:* {$clientName}\n";
                    $message .= "🏠 *Bien:* {$listing->titre}\n";
                    $message .= "📆 *Date:* {$visitDate}\n";
                    $message .= "🕐 *Heure:* {$visitTime}\n\n";
                    $message .= "📍 *Adresse:* {$listing->quartier}, {$listing->commune}\n\n";
                    $message .= "_N'oubliez pas d'etre present a l'heure convenue._";
                    break;

                case 'UNAVAILABLE':
                    $emoji = '❌';
                    $status = 'ANNULEE';
                    $message = "❌ *Visite annulee - ImmoGuinee*\n\n";
                    $message .= "Le client n'est pas disponible.\n\n";
                    $message .= "👤 *Client:* {$clientName}\n";
                    $message .= "🏠 *Bien:* {$listing->titre}\n";
                    $message .= "📆 *Date prevue:* {$visitDate} a {$visitTime}\n\n";
                    $message .= "_Vous pouvez proposer une nouvelle date au client._";
                    break;

                case 'RESCHEDULE':
                    $emoji = '📅';
                    $status = 'REPORT DEMANDE';
                    $newDate = isset($data['proposed_date']) ? date('d/m/Y', strtotime($data['proposed_date'])) : 'Non specifiee';
                    $newTime = $data['proposed_time'] ?? 'Non specifiee';
                    $clientMessage = $data['message'] ?? '';

                    $message = "📅 *Nouvelle date proposee - ImmoGuinee*\n\n";
                    $message .= "Le client souhaite reporter la visite.\n\n";
                    $message .= "👤 *Client:* {$clientName}\n";
                    $message .= "🏠 *Bien:* {$listing->titre}\n\n";
                    $message .= "❌ *Date initiale:* {$visitDate} a {$visitTime}\n";
                    $message .= "✅ *Date proposee:* {$newDate} a {$newTime}\n";
                    if ($clientMessage) {
                        $message .= "\n💬 *Message:* {$clientMessage}\n";
                    }
                    $message .= "\n_Connectez-vous pour accepter ou proposer une autre date._";
                    break;

                default:
                    return;
            }

            $whatsApp->send($owner->telephone, $message, 'visit_response', [
                'visit_id' => $visit->id,
                'response' => $response,
            ]);

            \Log::info('Owner notified of visit response', [
                'visit_id' => $visit->id,
                'owner_phone' => $owner->telephone,
                'response' => $response,
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to notify owner of visit response', [
                'visit_id' => $visit->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get visit by response token (public endpoint for response page).
     */
    public function getByToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|size:64',
        ]);

        $visit = Visit::with(['listing'])
            ->where('response_token', $validated['token'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'visit' => $visit,
                'listing' => $visit->listing,
                'already_responded' => $visit->client_responded_at !== null,
            ],
        ]);
    }

    protected function getResponseMessage(string $response): string
    {
        return match ($response) {
            'CONFIRMED' => 'Visite confirmée. Merci!',
            'UNAVAILABLE' => 'Merci de nous avoir informé de votre indisponibilité.',
            'RESCHEDULE' => 'Votre proposition de nouvelle date a été envoyée.',
            default => 'Réponse enregistrée.',
        };
    }

    /**
     * Get a specific visit.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::with(['listing', 'proprietaire', 'visiteur', 'cancelledBy'])
            ->where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            })
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $visit,
        ]);
    }

    /**
     * Update a visit (only by property owner).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::where('proprietaire_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'date_visite' => 'sometimes|date|after_or_equal:today',
            'heure_visite' => 'sometimes|date_format:H:i',
            'duree_minutes' => 'sometimes|integer|min:15|max:180',
            'notes_proprietaire' => 'nullable|string|max:1000',
        ]);

        $visit->update($validated);
        $visit->load(['listing', 'proprietaire', 'visiteur']);

        return response()->json([
            'success' => true,
            'message' => 'Visite mise à jour avec succès',
            'data' => $visit,
        ]);
    }

    /**
     * Confirm a visit (only by property owner).
     */
    public function confirm(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::where('proprietaire_id', $user->id)
            ->findOrFail($id);

        if (!$visit->confirm()) {
            return response()->json([
                'success' => false,
                'message' => 'Cette visite ne peut pas être confirmée',
            ], 422);
        }

        $visit->load(['listing', 'proprietaire', 'visiteur']);

        // Send confirmation notifications to the visitor/client
        $this->sendConfirmationNotifications($visit, $user);

        return response()->json([
            'success' => true,
            'message' => 'Visite confirmée avec succès',
            'data' => $visit,
        ]);
    }

    /**
     * Send confirmation notifications via WhatsApp and Expo Push.
     */
    protected function sendConfirmationNotifications(Visit $visit, User $confirmedBy): void
    {
        $listing = $visit->listing;
        $visitDate = $visit->date_visite->format('d/m/Y');
        $visitTime = $visit->heure_visite->format('H:i');
        $ownerName = $confirmedBy->nom_complet;

        // Notify the visitor/client
        $recipient = $visit->visiteur;
        $recipientPhone = $visit->client_telephone;

        // Build WhatsApp message
        $waMessage = "✅ *Visite confirmée - ImmoGuinée*\n\n";
        $waMessage .= "Votre demande de visite a été confirmée !\n\n";
        $waMessage .= "🏠 *Bien:* {$listing->titre}\n";
        $waMessage .= "📍 *Adresse:* {$listing->quartier}, {$listing->commune}\n";
        $waMessage .= "📆 *Date:* {$visitDate}\n";
        $waMessage .= "🕐 *Heure:* {$visitTime}\n";
        $waMessage .= "👤 *Propriétaire:* {$ownerName}\n\n";
        $waMessage .= "_N'oubliez pas d'être présent à l'heure convenue._";

        // Send WhatsApp notification
        if ($recipientPhone) {
            try {
                $whatsApp = app(WhatsAppService::class);
                $whatsApp->send($recipientPhone, $waMessage, 'visit_confirmed', [
                    'visit_id' => $visit->id,
                    'confirmed_by' => $confirmedBy->id,
                ]);

                \Log::info('[VISIT] WhatsApp confirmation notification sent', [
                    'visit_id' => $visit->id,
                    'recipient_phone' => $recipientPhone,
                ]);
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to send WhatsApp confirmation notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Send Expo Push notification to the visitor
        if ($recipient) {
            try {
                $pushService = app(ExpoPushService::class);

                $pushTitle = 'Visite confirmée';
                $pushBody = "Votre visite de \"{$listing->titre}\" est confirmée pour le {$visitDate} à {$visitTime}";

                $pushService->send(
                    $recipient,
                    $pushTitle,
                    $pushBody,
                    [
                        'type' => 'visit_confirmed',
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'confirmed_by' => $confirmedBy->id,
                    ],
                    'visits'
                );

                \Log::info('[VISIT] Push confirmation notification sent', [
                    'visit_id' => $visit->id,
                    'recipient_id' => $recipient->id,
                ]);
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to send push confirmation notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Create in-app notification
        if ($recipient) {
            try {
                AppNotification::notify(
                    $recipient,
                    AppNotification::TYPE_VISIT_CONFIRMED,
                    'Visite confirmée',
                    "Votre visite de \"{$listing->titre}\" est confirmée pour le {$visitDate} à {$visitTime}",
                    [
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'confirmed_by' => $confirmedBy->id,
                    ],
                    '/my-visits'
                );
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to create in-app confirmation notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Complete a visit (only by property owner).
     */
    public function complete(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::where('proprietaire_id', $user->id)
            ->findOrFail($id);

        if (!$visit->complete()) {
            return response()->json([
                'success' => false,
                'message' => 'Cette visite ne peut pas être marquée comme terminée',
            ], 422);
        }

        $visit->load(['listing', 'proprietaire', 'visiteur']);

        return response()->json([
            'success' => true,
            'message' => 'Visite marquée comme terminée',
            'data' => $visit,
        ]);
    }

    /**
     * Cancel a visit (by either party).
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            })
            ->findOrFail($id);

        $validated = $request->validate([
            'motif' => 'nullable|string|max:500',
        ]);

        if (!$visit->cancel($validated['motif'] ?? null, $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Cette visite ne peut pas être annulée',
            ], 422);
        }

        $visit->load(['listing', 'proprietaire', 'visiteur', 'cancelledBy']);

        // Send cancellation notifications to the other party
        $this->sendCancellationNotifications($visit, $user);

        return response()->json([
            'success' => true,
            'message' => 'Visite annulée avec succès',
            'data' => $visit,
        ]);
    }

    /**
     * Send cancellation notifications via WhatsApp and Expo Push.
     */
    protected function sendCancellationNotifications(Visit $visit, User $cancelledBy): void
    {
        $listing = $visit->listing;
        $visitDate = $visit->date_visite->format('d/m/Y');
        $visitTime = $visit->heure_visite->format('H:i');
        $cancellerName = $cancelledBy->nom_complet;
        $motif = $visit->motif_annulation;

        // Determine the recipient (the other party)
        $isOwnerCancelling = $cancelledBy->id === $visit->proprietaire_id;

        if ($isOwnerCancelling) {
            // Owner cancelled -> notify the visitor/client
            $recipient = $visit->visiteur;
            $recipientPhone = $visit->client_telephone;
            $recipientType = 'client';
        } else {
            // Visitor cancelled -> notify the owner
            $recipient = $visit->proprietaire;
            $recipientPhone = $recipient?->telephone;
            $recipientType = 'proprietaire';
        }

        // Build WhatsApp message
        $waMessage = "❌ *Visite annulée - ImmoGuinée*\n\n";
        $waMessage .= "La visite a été annulée par " . ($isOwnerCancelling ? "le propriétaire" : "le visiteur") . ".\n\n";
        $waMessage .= "🏠 *Bien:* {$listing->titre}\n";
        $waMessage .= "📆 *Date prévue:* {$visitDate}\n";
        $waMessage .= "🕐 *Heure prévue:* {$visitTime}\n";
        $waMessage .= "👤 *Annulé par:* {$cancellerName}\n";
        if ($motif) {
            $waMessage .= "💬 *Motif:* {$motif}\n";
        }
        $waMessage .= "\n_Connectez-vous à l'application pour planifier une nouvelle visite._";

        // Send WhatsApp notification
        if ($recipientPhone) {
            try {
                $whatsApp = app(WhatsAppService::class);
                $whatsApp->send($recipientPhone, $waMessage, 'visit_cancelled', [
                    'visit_id' => $visit->id,
                    'cancelled_by' => $cancelledBy->id,
                ]);

                \Log::info('[VISIT] WhatsApp cancellation notification sent', [
                    'visit_id' => $visit->id,
                    'recipient_phone' => $recipientPhone,
                    'recipient_type' => $recipientType,
                ]);
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to send WhatsApp cancellation notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Send Expo Push notification to the recipient user
        if ($recipient) {
            try {
                $pushService = app(ExpoPushService::class);

                $pushTitle = 'Visite annulée';
                $pushBody = "La visite de \"{$listing->titre}\" prévue le {$visitDate} à {$visitTime} a été annulée";
                if ($motif) {
                    $pushBody .= ". Motif: {$motif}";
                }

                $pushService->send(
                    $recipient,
                    $pushTitle,
                    $pushBody,
                    [
                        'type' => 'visit_cancelled',
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'cancelled_by' => $cancelledBy->id,
                    ],
                    'visits'
                );

                \Log::info('[VISIT] Push cancellation notification sent', [
                    'visit_id' => $visit->id,
                    'recipient_id' => $recipient->id,
                ]);
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to send push cancellation notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Create in-app notification
        if ($recipient) {
            try {
                AppNotification::notify(
                    $recipient,
                    AppNotification::TYPE_VISIT_CANCELLED,
                    'Visite annulée',
                    "La visite de \"{$listing->titre}\" prévue le {$visitDate} à {$visitTime} a été annulée par {$cancellerName}",
                    [
                        'visit_id' => $visit->id,
                        'listing_id' => $listing->id,
                        'cancelled_by' => $cancelledBy->id,
                        'motif' => $motif,
                    ],
                    '/my-visits'
                );
            } catch (\Exception $e) {
                \Log::error('[VISIT] Failed to create in-app notification', [
                    'visit_id' => $visit->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Delete a visit (owner or visitor can delete their own visits).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $visit = Visit::where(function ($q) use ($user) {
                $q->where('proprietaire_id', $user->id)
                    ->orWhere('visiteur_id', $user->id);
            })
            ->findOrFail($id);

        $visit->delete();

        return response()->json([
            'success' => true,
            'message' => 'Visite supprimée',
        ]);
    }

    /**
     * Get visit statistics for the authenticated user.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $stats = [
            'total' => Visit::where('proprietaire_id', $user->id)->count(),
            'pending' => Visit::where('proprietaire_id', $user->id)->pending()->count(),
            'confirmed' => Visit::where('proprietaire_id', $user->id)->confirmed()->count(),
            'completed' => Visit::where('proprietaire_id', $user->id)->completed()->count(),
            'cancelled' => Visit::where('proprietaire_id', $user->id)->cancelled()->count(),
            'upcoming' => Visit::where('proprietaire_id', $user->id)->upcoming()->count(),
            'this_week' => Visit::where('proprietaire_id', $user->id)
                ->whereBetween('date_visite', [now()->startOfWeek(), now()->endOfWeek()])
                ->whereIn('statut', ['PENDING', 'CONFIRMED'])
                ->count(),
            'this_month' => Visit::where('proprietaire_id', $user->id)
                ->whereBetween('date_visite', [now()->startOfMonth(), now()->endOfMonth()])
                ->whereIn('statut', ['PENDING', 'CONFIRMED'])
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get visits for a specific listing (for property owners).
     */
    public function forListing(Request $request, string $listingId): JsonResponse
    {
        $user = $request->user();

        // Verify the user owns this listing
        $listing = Listing::where('user_id', $user->id)
            ->findOrFail($listingId);

        $query = Visit::with(['visiteur'])
            ->where('listing_id', $listing->id);

        if ($request->has('statut') && $request->statut) {
            $query->where('statut', strtoupper($request->statut));
        }

        $visits = $query->orderBy('date_visite', 'desc')
            ->orderBy('heure_visite', 'asc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $visits,
        ]);
    }
}
