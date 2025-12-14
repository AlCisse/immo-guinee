<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{User, Listing, Message, Rating, ModerationLog, Report};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ModeratorController - Dashboard Modérateur Mobile-First
 *
 * Fonctionnalités:
 * - Gestion des annonces (validation, rejet, suspension)
 * - Gestion des signalements (annonces, utilisateurs, messages)
 * - Modération des utilisateurs (sanctions limitées)
 * - Historique des actions de modération
 * - Statistiques de modération
 *
 * Restrictions (par rapport à Admin):
 * - Ne peut pas créer d'annonce
 * - Ne peut pas publier en son nom
 * - Ne peut pas accéder au dashboard admin complet
 * - Ne peut pas gérer les rôles
 * - Ne peut pas voir les données financières sensibles
 */
class ModeratorController extends Controller
{
    /**
     * Dashboard principal du modérateur
     * Stats rapides pour la page d'accueil mobile
     */
    public function dashboard(Request $request)
    {
        $moderatorId = auth()->id();

        return response()->json([
            'success' => true,
            'data' => [
                // Compteurs principaux pour badges
                'pending_count' => Listing::where('statut', 'EN_ATTENTE')->count(),
                'reported_count' => $this->getReportedCount(),
                'flagged_users_count' => User::where('is_flagged', true)->count(),
                'today_actions' => $this->getTodayActionsCount($moderatorId),

                // Stats du modérateur
                'my_stats' => [
                    'total_actions' => ModerationLog::where('moderator_id', $moderatorId)->count(),
                    'today' => ModerationLog::where('moderator_id', $moderatorId)
                        ->whereDate('created_at', today())->count(),
                    'this_week' => ModerationLog::where('moderator_id', $moderatorId)
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                    'approvals' => ModerationLog::where('moderator_id', $moderatorId)
                        ->where('action', 'approve')->count(),
                    'rejections' => ModerationLog::where('moderator_id', $moderatorId)
                        ->where('action', 'reject')->count(),
                ],

                // Annonces urgentes (signalées)
                'urgent_items' => $this->getUrgentItems(5),
            ],
        ]);
    }

    /**
     * File d'attente des annonces à valider
     * Optimisé pour le swipe mobile
     */
    public function listingsQueue(Request $request)
    {
        $query = Listing::with(['user:id,nom_complet,telephone,badge,created_at', 'photos'])
            ->withCount('reports')
            ->when($request->status, function ($q) use ($request) {
                if ($request->status === 'reported') {
                    return $q->where('reports_count', '>', 0);
                }
                return $q->where('statut', strtoupper($request->status));
            }, function ($q) {
                return $q->whereIn('statut', ['EN_ATTENTE', 'SIGNALE']);
            })
            ->when($request->type_bien, fn($q) => $q->where('type_bien', strtoupper($request->type_bien)))
            ->when($request->ville, fn($q) => $q->where('ville', 'ilike', "%{$request->ville}%"))
            ->when($request->search, fn($q) => $q->where(function ($sq) use ($request) {
                $sq->where('titre', 'ilike', "%{$request->search}%")
                    ->orWhere('reference', 'ilike', "%{$request->search}%")
                    ->orWhereHas('user', fn($uq) => $uq->where('nom_complet', 'ilike', "%{$request->search}%"));
            }))
            ->orderByRaw("CASE WHEN statut = 'SIGNALE' THEN 0 WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 2 END")
            ->orderBy('created_at', 'asc');

        $listings = $query->paginate($request->input('per_page', 20));

        // Transformer pour mobile
        $listings->getCollection()->transform(function ($listing) {
            return [
                'id' => $listing->id,
                'reference' => $listing->reference ?? 'N/A',
                'titre' => $listing->titre,
                'type_bien' => $listing->type_bien,
                'type_transaction' => $listing->type_transaction ?? 'LOCATION',
                'prix' => $listing->loyer_mensuel ?? $listing->prix_vente ?? 0,
                'devise' => 'GNF',
                'ville' => $listing->ville,
                'quartier' => $listing->quartier,
                'statut' => $listing->statut,
                'reports_count' => $listing->reports_count ?? 0,
                'photos' => $listing->photos->map(fn($p) => [
                    'id' => $p->id,
                    'url' => $p->url,
                    'is_primary' => $p->is_primary ?? false,
                ])->take(10),
                'photos_count' => $listing->photos->count(),
                'description' => $listing->description,
                'surface' => $listing->surface_m2,
                'nb_chambres' => $listing->nb_chambres,
                'nb_salles_bain' => $listing->nb_salles_bain,
                'meuble' => $listing->meuble ?? false,
                'proprietaire' => [
                    'id' => $listing->user->id ?? null,
                    'nom' => $listing->user->nom_complet ?? 'Inconnu',
                    'telephone' => $listing->user->telephone ?? null,
                    'badge' => $listing->user->badge ?? 'BRONZE',
                    'membre_depuis' => $listing->user->created_at ?? null,
                ],
                'created_at' => $listing->created_at,
                'days_pending' => $listing->created_at ? now()->diffInDays($listing->created_at) : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $listings->items(),
            'meta' => [
                'total' => $listings->total(),
                'per_page' => $listings->perPage(),
                'current_page' => $listings->currentPage(),
                'last_page' => $listings->lastPage(),
            ],
        ]);
    }

    /**
     * Détail d'une annonce pour modération
     */
    public function showListing(Listing $listing)
    {
        $listing->load([
            'user:id,nom_complet,telephone,email,badge,created_at,type_compte',
            'photos',
            'reports.reporter:id,nom_complet',
        ]);

        // Historique de modération de cette annonce
        $moderationHistory = ModerationLog::where('entity_type', 'listing')
            ->where('entity_id', $listing->id)
            ->with('moderator:id,nom_complet')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'listing' => $listing,
                'moderation_history' => $moderationHistory,
                'owner_listings_count' => Listing::where('user_id', $listing->user_id)->count(),
                'owner_reports_count' => $listing->user ? Report::where('reported_user_id', $listing->user_id)->count() : 0,
            ],
        ]);
    }

    /**
     * Valider une annonce (approuver)
     */
    public function approveListing(Request $request, Listing $listing)
    {
        $listing->update([
            'statut' => 'ACTIVE',
            'moderated_at' => now(),
            'moderated_by' => auth()->id(),
        ]);

        // Logger l'action
        $this->logModerationAction('approve', 'listing', $listing->id, $request->input('note'));

        // Notifier le propriétaire
        $this->notifyOwner($listing, 'approved');

        return response()->json([
            'success' => true,
            'message' => 'Annonce approuvée avec succès',
        ]);
    }

    /**
     * Rejeter une annonce
     */
    public function rejectListing(Request $request, Listing $listing)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'reason_code' => 'nullable|string|in:PHOTOS_INAPPROPRIEES,DESCRIPTION_INSUFFISANTE,PRIX_SUSPECT,COORDONNEES_VISIBLES,DUPLICATA,CONTENU_INTERDIT,AUTRE',
        ]);

        $listing->update([
            'statut' => 'REJETE',
            'rejection_reason' => $validated['reason'],
            'rejection_code' => $validated['reason_code'] ?? 'AUTRE',
            'moderated_at' => now(),
            'moderated_by' => auth()->id(),
        ]);

        $this->logModerationAction('reject', 'listing', $listing->id, $validated['reason']);
        $this->notifyOwner($listing, 'rejected', $validated['reason']);

        return response()->json([
            'success' => true,
            'message' => 'Annonce rejetée',
        ]);
    }

    /**
     * Suspendre une annonce temporairement
     */
    public function suspendListing(Request $request, Listing $listing)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'duration_days' => 'nullable|integer|min:1|max:30',
        ]);

        $listing->update([
            'statut' => 'SUSPENDU',
            'suspension_reason' => $validated['reason'],
            'suspended_until' => $validated['duration_days'] ? now()->addDays($validated['duration_days']) : null,
            'moderated_at' => now(),
            'moderated_by' => auth()->id(),
        ]);

        $this->logModerationAction('suspend', 'listing', $listing->id, $validated['reason']);
        $this->notifyOwner($listing, 'suspended', $validated['reason']);

        return response()->json([
            'success' => true,
            'message' => 'Annonce suspendue',
        ]);
    }

    /**
     * Demander des modifications
     */
    public function requestChanges(Request $request, Listing $listing)
    {
        $validated = $request->validate([
            'changes_requested' => 'required|array|min:1',
            'changes_requested.*' => 'string|max:200',
            'message' => 'nullable|string|max:1000',
        ]);

        $listing->update([
            'statut' => 'MODIFICATIONS_REQUISES',
            'changes_requested' => $validated['changes_requested'],
            'moderated_at' => now(),
            'moderated_by' => auth()->id(),
        ]);

        $this->logModerationAction('request_changes', 'listing', $listing->id, json_encode($validated['changes_requested']));
        $this->notifyOwner($listing, 'changes_requested', $validated['message']);

        return response()->json([
            'success' => true,
            'message' => 'Modifications demandées envoyées',
        ]);
    }

    /**
     * Liste des signalements
     */
    public function reports(Request $request)
    {
        $query = Report::with([
            'reporter:id,nom_complet,telephone',
            'reportedUser:id,nom_complet,telephone',
            'listing:id,titre,reference',
            'message:id,contenu',
        ])
            ->when($request->type, fn($q) => $q->where('type', strtoupper($request->type)))
            ->when($request->severity, fn($q) => $q->where('severity', strtoupper($request->severity)))
            ->when($request->status, fn($q) => $q->where('status', strtoupper($request->status)))
            ->when(!$request->status, fn($q) => $q->where('status', 'PENDING'))
            ->orderByRaw("CASE
                WHEN severity = 'CRITICAL' THEN 0
                WHEN severity = 'HIGH' THEN 1
                WHEN severity = 'MEDIUM' THEN 2
                ELSE 3 END")
            ->orderBy('created_at', 'asc');

        $reports = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $reports->items(),
            'meta' => [
                'total' => $reports->total(),
                'per_page' => $reports->perPage(),
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
            ],
            'stats' => [
                'critical' => Report::where('status', 'PENDING')->where('severity', 'CRITICAL')->count(),
                'high' => Report::where('status', 'PENDING')->where('severity', 'HIGH')->count(),
                'medium' => Report::where('status', 'PENDING')->where('severity', 'MEDIUM')->count(),
                'low' => Report::where('status', 'PENDING')->where('severity', 'LOW')->count(),
            ],
        ]);
    }

    /**
     * Traiter un signalement
     */
    public function handleReport(Request $request, Report $report)
    {
        $validated = $request->validate([
            'action' => 'required|string|in:dismiss,warn,suspend_listing,suspend_user,escalate',
            'note' => 'nullable|string|max:500',
        ]);

        $report->update([
            'status' => 'PROCESSED',
            'action_taken' => $validated['action'],
            'moderator_note' => $validated['note'],
            'processed_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        // Exécuter l'action
        switch ($validated['action']) {
            case 'suspend_listing':
                if ($report->listing) {
                    $report->listing->update(['statut' => 'SUSPENDU']);
                    $this->logModerationAction('suspend', 'listing', $report->listing_id, 'Suite au signalement #' . $report->id);
                }
                break;
            case 'warn':
                if ($report->reported_user_id) {
                    $this->sendWarning($report->reportedUser, $validated['note']);
                }
                break;
            case 'suspend_user':
                if ($report->reported_user_id) {
                    User::find($report->reported_user_id)?->update([
                        'is_suspended' => true,
                        'suspended_until' => now()->addDays(7),
                        'suspension_reason' => $validated['note'] ?? 'Suite à un signalement',
                    ]);
                    $this->logModerationAction('suspend', 'user', $report->reported_user_id, $validated['note']);
                }
                break;
            case 'escalate':
                $report->update(['status' => 'ESCALATED']);
                break;
        }

        $this->logModerationAction('handle_report', 'report', $report->id, $validated['action'] . ': ' . ($validated['note'] ?? ''));

        return response()->json([
            'success' => true,
            'message' => 'Signalement traité',
        ]);
    }

    /**
     * Liste des utilisateurs (vue limitée pour modérateur)
     */
    public function users(Request $request)
    {
        $query = User::select([
            'id', 'nom_complet', 'telephone', 'type_compte', 'badge',
            'is_suspended', 'is_flagged', 'created_at', 'last_login_at'
        ])
            ->withCount(['listings', 'reportsReceived'])
            ->when($request->search, fn($q) => $q->where(function ($sq) use ($request) {
                $sq->where('nom_complet', 'ilike', "%{$request->search}%")
                    ->orWhere('telephone', 'ilike', "%{$request->search}%");
            }))
            ->when($request->flagged, fn($q) => $q->where('is_flagged', true))
            ->when($request->suspended, fn($q) => $q->where('is_suspended', true))
            ->orderBy('created_at', 'desc');

        $users = $query->paginate($request->input('per_page', 30));

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'meta' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    /**
     * Détail utilisateur pour modérateur
     */
    public function showUser(User $user)
    {
        $user->loadCount(['listings', 'reportsReceived', 'reportsMade']);

        // Historique des sanctions
        $sanctions = ModerationLog::where('entity_type', 'user')
            ->where('entity_id', $user->id)
            ->with('moderator:id,nom_complet')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nom_complet' => $user->nom_complet,
                    'telephone' => $user->telephone,
                    'type_compte' => $user->type_compte,
                    'badge' => $user->badge,
                    'is_suspended' => $user->is_suspended,
                    'is_flagged' => $user->is_flagged,
                    'suspension_reason' => $user->suspension_reason,
                    'suspended_until' => $user->suspended_until,
                    'created_at' => $user->created_at,
                    'last_login_at' => $user->last_login_at,
                    'listings_count' => $user->listings_count,
                    'reports_received_count' => $user->reports_received_count,
                    'reports_made_count' => $user->reports_made_count,
                ],
                'sanctions_history' => $sanctions,
                'recent_listings' => Listing::where('user_id', $user->id)
                    ->select(['id', 'titre', 'statut', 'created_at'])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(),
            ],
        ]);
    }

    /**
     * Sanctionner un utilisateur (permissions limitées)
     */
    public function sanctionUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'action' => 'required|string|in:warn,flag,suspend_24h,suspend_7d',
            'reason' => 'required|string|max:500',
        ]);

        switch ($validated['action']) {
            case 'warn':
                $this->sendWarning($user, $validated['reason']);
                break;
            case 'flag':
                $user->update(['is_flagged' => true]);
                break;
            case 'suspend_24h':
                $user->update([
                    'is_suspended' => true,
                    'suspended_until' => now()->addDay(),
                    'suspension_reason' => $validated['reason'],
                ]);
                break;
            case 'suspend_7d':
                $user->update([
                    'is_suspended' => true,
                    'suspended_until' => now()->addDays(7),
                    'suspension_reason' => $validated['reason'],
                ]);
                break;
        }

        $this->logModerationAction($validated['action'], 'user', $user->id, $validated['reason']);

        return response()->json([
            'success' => true,
            'message' => 'Action effectuée',
        ]);
    }

    /**
     * Lever une suspension utilisateur
     */
    public function unsuspendUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $user->update([
            'is_suspended' => false,
            'suspended_until' => null,
            'suspension_reason' => null,
        ]);

        $this->logModerationAction('unsuspend', 'user', $user->id, $validated['reason'] ?? 'Levée de suspension');

        return response()->json([
            'success' => true,
            'message' => 'Suspension levée',
        ]);
    }

    /**
     * Historique des actions de modération
     */
    public function history(Request $request)
    {
        $query = ModerationLog::with([
            'moderator:id,nom_complet',
        ])
            ->when($request->moderator_id, fn($q) => $q->where('moderator_id', $request->moderator_id))
            ->when($request->my_actions, fn($q) => $q->where('moderator_id', auth()->id()))
            ->when($request->action, fn($q) => $q->where('action', $request->action))
            ->when($request->entity_type, fn($q) => $q->where('entity_type', $request->entity_type))
            ->when($request->date_from, fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->orderBy('created_at', 'desc');

        $logs = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'meta' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * Statistiques de modération
     */
    public function stats(Request $request)
    {
        $period = $request->input('period', 30);
        $startDate = now()->subDays($period);

        return response()->json([
            'success' => true,
            'data' => [
                'period_days' => $period,
                'listings' => [
                    'pending' => Listing::where('statut', 'EN_ATTENTE')->count(),
                    'approved_period' => Listing::where('statut', 'ACTIVE')
                        ->where('moderated_at', '>=', $startDate)->count(),
                    'rejected_period' => Listing::where('statut', 'REJETE')
                        ->where('moderated_at', '>=', $startDate)->count(),
                    'suspended' => Listing::where('statut', 'SUSPENDU')->count(),
                ],
                'reports' => [
                    'pending' => Report::where('status', 'PENDING')->count(),
                    'processed_period' => Report::where('status', 'PROCESSED')
                        ->where('processed_at', '>=', $startDate)->count(),
                    'escalated' => Report::where('status', 'ESCALATED')->count(),
                ],
                'users' => [
                    'flagged' => User::where('is_flagged', true)->count(),
                    'suspended' => User::where('is_suspended', true)->count(),
                ],
                'moderators_activity' => ModerationLog::where('created_at', '>=', $startDate)
                    ->selectRaw('moderator_id, COUNT(*) as actions_count')
                    ->groupBy('moderator_id')
                    ->with('moderator:id,nom_complet')
                    ->orderBy('actions_count', 'desc')
                    ->limit(10)
                    ->get(),
            ],
        ]);
    }

    /**
     * Templates de messages prédéfinis
     */
    public function messageTemplates()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'rejection' => [
                    ['code' => 'PHOTOS_INAPPROPRIEES', 'label' => 'Photos inappropriées', 'message' => 'Votre annonce a été refusée car les photos ne correspondent pas aux critères de qualité. Veuillez ajouter des photos claires et récentes du bien.'],
                    ['code' => 'DESCRIPTION_INSUFFISANTE', 'label' => 'Description insuffisante', 'message' => 'Votre annonce a été refusée car la description est trop courte ou incomplète. Veuillez détailler les caractéristiques du bien.'],
                    ['code' => 'PRIX_SUSPECT', 'label' => 'Prix suspect', 'message' => 'Votre annonce a été refusée car le prix semble anormal. Veuillez vérifier et corriger le montant indiqué.'],
                    ['code' => 'COORDONNEES_VISIBLES', 'label' => 'Coordonnées dans la description', 'message' => 'Votre annonce contient des numéros de téléphone ou emails dans la description. Ceci est interdit pour des raisons de sécurité.'],
                    ['code' => 'DUPLICATA', 'label' => 'Annonce en double', 'message' => 'Cette annonce semble être un doublon d\'une autre annonce existante.'],
                    ['code' => 'CONTENU_INTERDIT', 'label' => 'Contenu interdit', 'message' => 'Votre annonce contient des éléments non autorisés sur notre plateforme.'],
                ],
                'modification' => [
                    ['code' => 'AJOUTER_PHOTOS', 'label' => 'Ajouter des photos', 'message' => 'Merci d\'ajouter au moins 3 photos du bien.'],
                    ['code' => 'AMELIORER_DESCRIPTION', 'label' => 'Améliorer la description', 'message' => 'Merci de compléter la description avec plus de détails.'],
                    ['code' => 'VERIFIER_PRIX', 'label' => 'Vérifier le prix', 'message' => 'Merci de vérifier que le prix indiqué est correct.'],
                    ['code' => 'PRECISER_LOCALISATION', 'label' => 'Préciser la localisation', 'message' => 'Merci de préciser le quartier et la ville.'],
                ],
                'warning' => [
                    ['code' => 'COMPORTEMENT', 'label' => 'Comportement inapproprié', 'message' => 'Nous avons reçu des signalements concernant votre comportement. Veuillez respecter les règles de la communauté.'],
                    ['code' => 'ANNONCES_REPETEES', 'label' => 'Annonces répétées', 'message' => 'Merci de ne pas publier plusieurs fois la même annonce.'],
                    ['code' => 'CONTACT_SUSPECT', 'label' => 'Contact suspect', 'message' => 'Des utilisateurs ont signalé des pratiques suspectes. Respectez les règles de la plateforme.'],
                ],
            ],
        ]);
    }

    /**
     * Contacter le propriétaire (via WhatsApp, SMS, etc.)
     */
    public function contactOwner(Request $request, Listing $listing)
    {
        $validated = $request->validate([
            'channel' => 'required|string|in:whatsapp,sms,internal',
            'message' => 'required|string|max:1000',
            'template_code' => 'nullable|string',
        ]);

        $owner = $listing->user;
        if (!$owner) {
            return response()->json(['success' => false, 'message' => 'Propriétaire introuvable'], 404);
        }

        // Log l'action
        $this->logModerationAction('contact_owner', 'listing', $listing->id, "Canal: {$validated['channel']}");

        // Envoyer via le canal approprié
        // TODO: Intégrer avec les services de notification existants

        return response()->json([
            'success' => true,
            'message' => 'Message envoyé',
        ]);
    }

    /**
     * Export des données de modération (CSV)
     */
    public function export(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:history,listings,reports',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        // Limité à 30 jours max pour les modérateurs
        $dateFrom = $request->date_from ? max(now()->subDays(30), \Carbon\Carbon::parse($request->date_from)) : now()->subDays(30);
        $dateTo = $request->date_to ? \Carbon\Carbon::parse($request->date_to) : now();

        switch ($validated['type']) {
            case 'history':
                $data = ModerationLog::whereBetween('created_at', [$dateFrom, $dateTo])
                    ->where('moderator_id', auth()->id())
                    ->get(['action', 'entity_type', 'entity_id', 'note', 'created_at']);
                break;
            default:
                $data = [];
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'date_from' => $dateFrom->toDateString(),
                'date_to' => $dateTo->toDateString(),
                'count' => count($data),
            ],
        ]);
    }

    // ==================== HELPERS ====================

    private function getReportedCount(): int
    {
        return Report::where('status', 'PENDING')->count();
    }

    private function getTodayActionsCount(string $moderatorId): int
    {
        return ModerationLog::where('moderator_id', $moderatorId)
            ->whereDate('created_at', today())
            ->count();
    }

    private function getUrgentItems(int $limit): array
    {
        $urgentListings = Listing::where('statut', 'SIGNALE')
            ->orWhere(function ($q) {
                $q->where('statut', 'EN_ATTENTE')
                    ->where('created_at', '<=', now()->subDays(3));
            })
            ->select(['id', 'titre', 'statut', 'created_at'])
            ->limit($limit)
            ->get()
            ->map(fn($l) => [
                'type' => 'listing',
                'id' => $l->id,
                'title' => $l->titre,
                'status' => $l->statut,
                'created_at' => $l->created_at,
            ]);

        $urgentReports = Report::where('status', 'PENDING')
            ->where('severity', 'CRITICAL')
            ->select(['id', 'type', 'reason', 'created_at'])
            ->limit($limit)
            ->get()
            ->map(fn($r) => [
                'type' => 'report',
                'id' => $r->id,
                'title' => $r->reason,
                'status' => 'CRITICAL',
                'created_at' => $r->created_at,
            ]);

        return $urgentListings->merge($urgentReports)
            ->sortBy('created_at')
            ->take($limit)
            ->values()
            ->toArray();
    }

    private function logModerationAction(string $action, string $entityType, string $entityId, ?string $note = null): void
    {
        try {
            ModerationLog::create([
                'moderator_id' => auth()->id(),
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'note' => $note,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log moderation action', [
                'error' => $e->getMessage(),
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ]);
        }
    }

    private function notifyOwner(Listing $listing, string $type, ?string $message = null): void
    {
        // TODO: Intégrer avec le système de notifications existant
        // Utiliser n8n workflow ou Laravel Notifications
    }

    private function sendWarning(User $user, string $reason): void
    {
        // TODO: Envoyer notification d'avertissement
    }
}
