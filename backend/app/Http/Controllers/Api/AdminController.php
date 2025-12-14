<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{User, Listing, Payment, Dispute, Rating, Contract, Message, Conversation, CertificationDocument, Insurance, Visit, Notification, ContactMessage, Report};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class AdminController extends Controller
{
    /**
     * Get sidebar counts for admin dashboard
     * Returns counts for badges in the sidebar navigation
     */
    public function sidebarCounts(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                // Annonces en attente de modération
                'listings_pending' => Listing::where('statut', 'EN_ATTENTE')->count(),
                // Total annonces actives
                'listings_active' => Listing::where('statut', 'ACTIVE')->count(),
                // Messages contact + signalements en attente
                'messages_unread' => ContactMessage::where('statut', 'EN_ATTENTE')->count() + Report::where('status', 'PENDING')->count(),
                // Contrats en attente de signature
                'contracts_pending' => Contract::whereIn('statut', ['EN_ATTENTE_BAILLEUR', 'EN_ATTENTE_LOCATAIRE'])->count(),
                // Litiges ouverts
                'disputes_open' => Dispute::whereIn('statut', ['OUVERT', 'EN_COURS'])->count(),
                // Notations signalées (en attente de modération)
                'ratings_pending' => Rating::where('is_flagged', true)->where('is_published', true)->count(),
                // Certifications en attente de vérification
                'certifications_pending' => CertificationDocument::where('statut_verification', 'EN_ATTENTE')->count(),
                // Notifications (placeholder)
                'notifications' => 0,
            ],
        ]);
    }

    /**
     * Get dashboard statistics
     */
    public function dashboardStats(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'users' => [
                    'total' => User::count(),
                    'active' => User::whereNotNull('telephone_verified_at')->count(),
                    'verified' => User::whereNotNull('telephone_verified_at')->count(),
                    'new_this_month' => User::whereMonth('created_at', now()->month)->count(),
                ],
                'listings' => [
                    'total' => Listing::count(),
                    'active' => Listing::where('statut', 'ACTIVE')->count(),
                    'pending' => Listing::where('statut', 'EN_ATTENTE')->count(),
                    'rented' => Listing::where('disponible', false)->count(),
                ],
                'contracts' => [
                    'total' => Contract::count(),
                    'active' => Contract::where('statut', 'ACTIF')->count(),
                    'pending' => Contract::whereIn('statut', ['EN_ATTENTE_BAILLEUR', 'EN_ATTENTE_LOCATAIRE'])->count(),
                ],
                'payments' => [
                    'total' => Payment::count(),
                    'completed' => Payment::where('statut', 'COMPLETE')->count(),
                    'total_amount' => Payment::where('statut', 'COMPLETE')->sum('montant_total') ?? 0,
                ],
                'disputes' => [
                    'total' => Dispute::count(),
                    'open' => Dispute::whereIn('statut', ['OUVERT', 'EN_COURS'])->count(),
                    'resolved' => Dispute::whereIn('statut', ['RESOLU_AMIABLE', 'RESOLU_COMPENSATION'])->count(),
                ],
                'ratings' => [
                    'total' => Rating::count(),
                    'average' => Rating::where('is_published', true)->avg('note') ?? 0,
                    'pending' => Rating::where('is_flagged', true)->count(),
                ],
            ],
        ]);
    }

    /**
     * Get analytics dashboard (FR-084: 15 KPIs)
     * Returns comprehensive analytics matching frontend expectations
     */
    public function analytics(Request $request)
    {
        $period = $request->input('period', 30);
        $startDate = now()->subDays($period);

        // Users stats by role
        $usersByRole = User::selectRaw('type_compte, COUNT(*) as count')
            ->groupBy('type_compte')
            ->pluck('count', 'type_compte')
            ->toArray();

        // Listings stats by type
        $listingsByType = Listing::selectRaw('type_bien, COUNT(*) as count')
            ->groupBy('type_bien')
            ->pluck('count', 'type_bien')
            ->toArray();

        // Listings stats by status
        $listingsByStatus = Listing::selectRaw('statut, COUNT(*) as count')
            ->groupBy('statut')
            ->pluck('count', 'statut')
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'period_days' => $period,
                'generated_at' => now()->toIso8601String(),
                'users' => [
                    'total_users' => User::count(),
                    'new_users' => User::where('created_at', '>=', $startDate)->count(),
                    'active_users' => User::whereNotNull('telephone_verified_at')->count(),
                    'verified_users' => User::whereNotNull('telephone_verified_at')->count(),
                    'users_by_role' => $usersByRole,
                ],
                'listings' => [
                    'total_listings' => Listing::count(),
                    'active_listings' => Listing::where('statut', 'ACTIVE')->count(),
                    'new_listings' => Listing::where('created_at', '>=', $startDate)->count(),
                    'listings_by_type' => $listingsByType,
                    'listings_by_status' => $listingsByStatus,
                    'average_rent' => Listing::where('statut', 'ACTIVE')->avg('loyer_mensuel') ?? 0,
                ],
                'transactions' => [
                    'total_transactions' => Payment::count(),
                    'completed_transactions' => Payment::where('statut', 'COMPLETE')->count(),
                    'transactions_this_period' => Payment::where('created_at', '>=', $startDate)->count(),
                    'total_volume_gnf' => Payment::where('statut', 'COMPLETE')->sum('montant_total') ?? 0,
                    'commission_earned_gnf' => Payment::where('statut', 'COMPLETE')->sum('commission_montant') ?? 0,
                ],
                'contracts' => [
                    'total_contracts' => Contract::count(),
                    'signed_contracts' => Contract::where('statut', 'ACTIF')->count(),
                    'pending_contracts' => Contract::whereIn('statut', ['EN_ATTENTE_BAILLEUR', 'EN_ATTENTE_LOCATAIRE'])->count(),
                    'contracts_this_period' => Contract::where('created_at', '>=', $startDate)->count(),
                ],
                'quality' => [
                    'average_rating' => Rating::where('is_published', true)->avg('note') ?? 0,
                    'total_ratings' => Rating::count(),
                    'pending_disputes' => Dispute::whereIn('statut', ['OUVERT', 'EN_COURS'])->count(),
                    'resolved_disputes' => Dispute::whereIn('statut', ['RESOLU_AMIABLE', 'RESOLU_COMPENSATION'])->count(),
                ],
                'trends' => [
                    'users' => [],
                    'listings' => [],
                    'payments' => [],
                ],
            ],
        ]);
    }

    /**
     * Get moderation queue (FR-081)
     */
    public function moderationQueue(Request $request)
    {
        $listings = Listing::whereIn('statut', ['EN_ATTENTE', 'SUSPENDUE'])
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $listings]);
    }

    /**
     * Moderate listing (FR-082)
     */
    public function moderateListing(Request $request, Listing $listing)
    {
        $validated = $request->validate([
            'action' => 'required|in:approve,suspend,delete',
            'reason' => 'nullable|string|max:500',
        ]);

        match ($validated['action']) {
            'approve' => $listing->update(['statut' => 'ACTIVE']),
            'suspend' => $listing->update(['statut' => 'SUSPENDU']),
            'delete' => $listing->delete(),
        };

        return response()->json(['success' => true, 'message' => 'Listing moderated successfully']);
    }

    /**
     * Get users list (FR-083)
     */
    public function users(Request $request)
    {
        $query = User::withCount(['listings', 'contractsAsBailleur', 'contractsAsLocataire'])
            ->when($request->search, fn($q) => $q->where(function($sq) use ($request) {
                $sq->where('nom_complet', 'like', "%{$request->search}%")
                    ->orWhere('telephone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->when($request->type_compte, fn($q) => $q->where('type_compte', strtoupper($request->type_compte)))
            ->when($request->verification, fn($q) => $q->where('statut_verification', $request->verification))
            ->when($request->badge, fn($q) => $q->where('badge', $request->badge));

        // Filter by Spatie role
        if ($request->role && in_array($request->role, ['admin', 'moderator', 'mediator'])) {
            $query->whereHas('roles', fn($q) => $q->where('name', $request->role));
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(50);

        // Transform users to include computed fields and roles
        $users->getCollection()->transform(function ($user) {
            $roles = $user->getRoleNames()->toArray();
            return [
                'id' => $user->id,
                'nom_complet' => $user->nom_complet,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'type_compte' => $user->type_compte,
                'roles' => $roles,
                'is_admin' => in_array('admin', $roles),
                'is_moderator' => in_array('moderator', $roles),
                'is_mediator' => in_array('mediator', $roles),
                'badge' => $user->badge ?? 'BRONZE',
                'statut_verification' => $user->telephone_verified_at ? 'VERIFIE' : 'NON_VERIFIE',
                'is_active' => $user->is_active ?? true,
                'is_suspended' => $user->is_suspended ?? false,
                'listings_count' => $user->listings_count ?? 0,
                'contracts_count' => ($user->contracts_as_bailleur_count ?? 0) + ($user->contracts_as_locataire_count ?? 0),
                'ratings_count' => 0,
                'created_at' => $user->created_at,
                'last_login_at' => $user->last_login_at,
            ];
        });

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
     * Manage user (FR-083: suspend, ban, downgrade)
     */
    public function manageUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'action' => 'required|in:suspend,unsuspend,activate,deactivate,ban,downgrade_badge',
            'reason' => 'nullable|string|max:500',
        ]);

        $messages = [
            'suspend' => 'Utilisateur suspendu avec succès',
            'unsuspend' => 'Suspension levée avec succès',
            'activate' => 'Utilisateur activé avec succès',
            'deactivate' => 'Utilisateur désactivé avec succès',
            'ban' => 'Utilisateur banni avec succès',
            'downgrade_badge' => 'Badge rétrogradé avec succès',
        ];

        match ($validated['action']) {
            'suspend' => $user->update(['is_suspended' => true]),
            'unsuspend' => $user->update(['is_suspended' => false]),
            'activate' => $user->update(['is_active' => true, 'is_suspended' => false]),
            'deactivate' => $user->update(['is_active' => false]),
            'ban' => $user->update(['is_active' => false, 'is_suspended' => true]),
            'downgrade_badge' => $user->update(['badge' => 'BRONZE']),
        };

        return response()->json([
            'success' => true,
            'message' => $messages[$validated['action']] ?? 'Action effectuée',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * Get disputes queue
     */
    public function disputes(Request $request)
    {
        $disputes = Dispute::with(['demandeur', 'defendeur', 'mediateur'])
            ->when($request->statut, fn($q) => $q->where('statut', $request->statut))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // Add date_ouverture accessor to each dispute
        $disputes->getCollection()->transform(function ($dispute) {
            $dispute->date_ouverture = $dispute->created_at;
            return $dispute;
        });

        return response()->json(['success' => true, 'data' => $disputes]);
    }

    /**
     * Get single dispute details
     */
    public function showDispute(Dispute $dispute)
    {
        $dispute->load(['demandeur', 'defendeur', 'mediateur', 'contract', 'contract.listing']);
        $dispute->date_ouverture = $dispute->created_at;

        return response()->json([
            'success' => true,
            'data' => $dispute,
        ]);
    }

    /**
     * Assign mediator to dispute
     */
    public function assignMediator(Request $request, Dispute $dispute)
    {
        $validated = $request->validate([
            'mediateur_id' => 'required|uuid|exists:users,id',
        ]);

        $dispute->update([
            'mediateur_id' => $validated['mediateur_id'],
            'statut' => 'EN_MEDIATION',
            'mediation_started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Médiateur assigné avec succès',
            'data' => $dispute->fresh(['demandeur', 'defendeur', 'mediateur']),
        ]);
    }

    /**
     * Resolve dispute
     */
    public function resolveDispute(Request $request, Dispute $dispute)
    {
        $validated = $request->validate([
            'statut' => 'required|in:RESOLU_AMIABLE,RESOLU_JUDICIAIRE,FERME',
            'resolution_notes' => 'nullable|string|max:2000',
            'montant_resolution' => 'nullable|numeric|min:0',
        ]);

        $dispute->update([
            'statut' => $validated['statut'],
            'resolution_notes' => $validated['resolution_notes'] ?? null,
            'montant_resolution' => $validated['montant_resolution'] ?? null,
            'resolved_at' => now(),
            'is_closed' => true,
            'closed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Litige résolu avec succès',
            'data' => $dispute->fresh(['demandeur', 'defendeur', 'mediateur']),
        ]);
    }

    /**
     * Get list of mediators (users with mediator role)
     */
    public function mediators(Request $request)
    {
        $mediators = User::whereHas('roles', fn($q) => $q->where('name', 'mediator'))
            ->orWhereHas('roles', fn($q) => $q->where('name', 'admin'))
            ->select('id', 'nom_complet', 'email', 'telephone')
            ->orderBy('nom_complet')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $mediators,
        ]);
    }

    /**
     * Get audit logs (FR-085)
     */
    public function auditLogs(Request $request)
    {
        $logs = DB::table('activity_log')
            ->leftJoin('users as causer', 'activity_log.causer_id', '=', 'causer.id')
            ->leftJoin('users as subject_user', function ($join) {
                $join->on('activity_log.subject_id', '=', 'subject_user.id')
                    ->where('activity_log.subject_type', '=', 'App\\Models\\User');
            })
            ->select(
                'activity_log.*',
                'causer.nom_complet as causer_name',
                'causer.email as causer_email',
                'subject_user.nom_complet as subject_name'
            )
            ->orderBy('activity_log.created_at', 'desc')
            ->paginate(100);

        return response()->json(['success' => true, 'data' => $logs]);
    }

    /**
     * Get all listings for admin
     */
    public function listings(Request $request)
    {
        $listings = Listing::with('user')
            ->when($request->search, fn($q) => $q->where('titre', 'like', "%{$request->search}%"))
            ->when($request->statut, function($q) use ($request) {
                // Map "LOUEE" to "ARCHIVEE" (properties are archived when contract is signed)
                $statut = $request->statut === 'LOUEE' ? 'ARCHIVEE' : $request->statut;
                return $q->where('statut', $statut);
            })
            ->when($request->type_bien, fn($q) => $q->where('type_bien', $request->type_bien))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $listings]);
    }

    /**
     * Delete a listing (admin only)
     */
    public function deleteListing(Listing $listing)
    {
        $listing->delete();

        return response()->json([
            'success' => true,
            'message' => 'Annonce supprimée avec succès',
        ]);
    }

    /**
     * Get all contracts for admin
     */
    public function contracts(Request $request)
    {
        $contracts = Contract::with(['bailleur', 'locataire', 'listing'])
            ->when($request->statut, fn($q) => $q->where('statut', $request->statut))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $contracts]);
    }

    /**
     * Get all payments for admin
     */
    public function payments(Request $request)
    {
        $payments = Payment::with(['contract', 'payeur', 'beneficiaire'])
            ->when($request->statut, fn($q) => $q->where('statut', $request->statut))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $payments]);
    }

    /**
     * Get all messages for admin (contact messages + reports)
     */
    public function messages(Request $request)
    {
        $type = $request->input('type', 'all'); // all, contact, report
        $statut = $request->input('statut');

        // Messages de contact
        $contactMessages = [];
        if ($type === 'all' || $type === 'contact') {
            $contactQuery = ContactMessage::with(['user', 'reponduPar'])
                ->when($statut, fn($q) => $q->where('statut', $statut))
                ->orderBy('created_at', 'desc');

            if ($type === 'contact') {
                $contactMessages = $contactQuery->paginate(20);
                return response()->json([
                    'success' => true,
                    'data' => $contactMessages,
                    'type' => 'contact',
                ]);
            }
            $contactMessages = $contactQuery->get();
        }

        // Signalements
        $reports = [];
        if ($type === 'all' || $type === 'report') {
            $reportQuery = Report::with(['reporter', 'reportedUser', 'listing', 'processedBy'])
                ->when($statut, fn($q) => $q->where('status', $statut))
                ->orderBy('created_at', 'desc');

            if ($type === 'report') {
                $reports = $reportQuery->paginate(20);
                return response()->json([
                    'success' => true,
                    'data' => $reports,
                    'type' => 'report',
                ]);
            }
            $reports = $reportQuery->get();
        }

        // Combiner et trier par date
        $allMessages = collect();

        foreach ($contactMessages as $contact) {
            $allMessages->push([
                'id' => $contact->id,
                'type' => 'contact',
                'nom' => $contact->nom,
                'email' => $contact->email,
                'telephone' => $contact->telephone,
                'sujet' => $contact->sujet,
                'message' => $contact->message,
                'statut' => $contact->statut,
                'reponse' => $contact->reponse,
                'user' => $contact->user,
                'repondu_par' => $contact->reponduPar,
                'repondu_at' => $contact->repondu_at,
                'created_at' => $contact->created_at,
            ]);
        }

        foreach ($reports as $report) {
            $allMessages->push([
                'id' => $report->id,
                'type' => 'report',
                'nom' => $report->reporter?->nom_complet ?? 'Anonyme',
                'email' => $report->reporter?->email,
                'telephone' => $report->reporter?->telephone,
                'sujet' => 'Signalement: ' . ucfirst(strtolower($report->type)),
                'message' => $report->description ?? $report->reason,
                'statut' => $report->status,
                'reponse' => $report->moderator_note,
                'user' => $report->reporter,
                'reported_user' => $report->reportedUser,
                'listing' => $report->listing,
                'severity' => $report->severity,
                'repondu_par' => $report->processedBy,
                'repondu_at' => $report->processed_at,
                'created_at' => $report->created_at,
            ]);
        }

        // Trier par date décroissante
        $sorted = $allMessages->sortByDesc('created_at')->values();

        // Stats
        $stats = [
            'total' => $sorted->count(),
            'contact_count' => ContactMessage::count(),
            'report_count' => Report::count(),
            'en_attente' => ContactMessage::enAttente()->count() + Report::pending()->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $sorted,
            'stats' => $stats,
            'type' => 'all',
        ]);
    }

    /**
     * Get single contact message details
     */
    public function showContactMessage(ContactMessage $contactMessage)
    {
        return response()->json([
            'success' => true,
            'data' => $contactMessage->load(['user', 'reponduPar']),
        ]);
    }

    /**
     * Reply to a contact message
     */
    public function replyToContactMessage(Request $request, ContactMessage $contactMessage)
    {
        $validated = $request->validate([
            'reponse' => 'required|string|max:5000',
        ]);

        $contactMessage->update([
            'reponse' => $validated['reponse'],
            'statut' => 'TRAITE',
            'repondu_par' => auth()->id(),
            'repondu_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Réponse envoyée avec succès',
            'data' => $contactMessage->fresh(['user', 'reponduPar']),
        ]);
    }

    /**
     * Update contact message status
     */
    public function updateContactMessageStatus(Request $request, ContactMessage $contactMessage)
    {
        $validated = $request->validate([
            'statut' => 'required|in:EN_ATTENTE,EN_COURS,TRAITE,ARCHIVE',
        ]);

        $contactMessage->update(['statut' => $validated['statut']]);

        return response()->json([
            'success' => true,
            'message' => 'Statut mis à jour',
            'data' => $contactMessage,
        ]);
    }

    /**
     * Get single report details
     */
    public function showReport(Report $report)
    {
        return response()->json([
            'success' => true,
            'data' => $report->load(['reporter', 'reportedUser', 'listing', 'message', 'processedBy']),
        ]);
    }

    /**
     * Process a report (respond/resolve)
     */
    public function processReport(Request $request, Report $report)
    {
        $validated = $request->validate([
            'status' => 'required|in:PENDING,REVIEWING,RESOLVED,DISMISSED',
            'action_taken' => 'nullable|string|max:255',
            'moderator_note' => 'nullable|string|max:2000',
        ]);

        $report->update([
            'status' => $validated['status'],
            'action_taken' => $validated['action_taken'] ?? null,
            'moderator_note' => $validated['moderator_note'] ?? null,
            'processed_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Signalement traité avec succès',
            'data' => $report->fresh(['reporter', 'reportedUser', 'listing', 'processedBy']),
        ]);
    }

    /**
     * Get all ratings for admin
     */
    public function ratings(Request $request)
    {
        $ratings = Rating::with(['evaluateur', 'evalue', 'contract'])
            ->when($request->is_flagged, fn($q) => $q->where('is_flagged', true))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $ratings]);
    }

    /**
     * Get single rating details
     */
    public function showRating(Rating $rating)
    {
        $rating->load(['evaluateur', 'evalue', 'contract', 'contract.listing']);

        return response()->json([
            'success' => true,
            'data' => $rating,
        ]);
    }

    /**
     * Approve a flagged rating
     */
    public function approveRating(Rating $rating)
    {
        $rating->update([
            'is_flagged' => false,
            'is_published' => true,
            'flag_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notation approuvée avec succès',
            'data' => $rating,
        ]);
    }

    /**
     * Reject/unpublish a rating
     */
    public function rejectRating(Request $request, Rating $rating)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $rating->update([
            'is_published' => false,
            'is_flagged' => true,
            'flag_reason' => $validated['reason'] ?? 'Rejeté par l\'administrateur',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notation rejetée',
            'data' => $rating,
        ]);
    }

    /**
     * Delete a rating
     */
    public function deleteRating(Rating $rating)
    {
        $rating->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notation supprimée avec succès',
        ]);
    }

    /**
     * Get all certifications for admin
     */
    public function certifications(Request $request)
    {
        $certifications = CertificationDocument::with('user')
            ->when($request->statut_verification, fn($q) => $q->where('statut_verification', $request->statut_verification))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $certifications]);
    }

    /**
     * Show single certification details
     */
    public function showCertification(CertificationDocument $certification)
    {
        $certification->load(['user', 'verifiedBy']);

        return response()->json([
            'success' => true,
            'data' => $certification,
        ]);
    }

    /**
     * Approve a certification
     */
    public function approveCertification(Request $request, CertificationDocument $certification)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $certification->update([
            'statut_verification' => 'VERIFIE',
            'verified_by' => auth()->id(),
            'verified_at' => now(),
            'verification_notes' => $request->notes,
            'raison_rejet' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Certification approuvée avec succès',
            'data' => $certification->fresh(['user', 'verifiedBy']),
        ]);
    }

    /**
     * Reject a certification
     */
    public function rejectCertification(Request $request, CertificationDocument $certification)
    {
        $request->validate([
            'raison' => 'required|string|max:1000',
        ]);

        $certification->update([
            'statut_verification' => 'REJETE',
            'verified_by' => auth()->id(),
            'verified_at' => now(),
            'raison_rejet' => $request->raison,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Certification rejetée',
            'data' => $certification->fresh(['user', 'verifiedBy']),
        ]);
    }

    /**
     * Get all insurances for admin
     */
    public function insurances(Request $request)
    {
        $insurances = Insurance::with(['contract', 'souscripteur'])
            ->when($request->statut, fn($q) => $q->where('statut', $request->statut))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $insurances]);
    }

    /**
     * Get all available roles
     */
    public function roles(Request $request)
    {
        $roles = Role::all()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => $role->users()->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        // Prevent removing own admin role
        if (auth()->id() === $user->id && $validated['role'] !== 'admin' && $user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas retirer votre propre rôle admin',
            ], 403);
        }

        // Assign the role (adds to existing roles)
        if (!$user->hasRole($validated['role'])) {
            $user->assignRole($validated['role']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rôle assigné avec succès',
            'data' => [
                'user_id' => $user->id,
                'roles' => $user->getRoleNames(),
            ],
        ]);
    }

    /**
     * Remove role from user
     */
    public function removeRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        // Prevent removing own admin role
        if (auth()->id() === $user->id && $validated['role'] === 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas retirer votre propre rôle admin',
            ], 403);
        }

        $user->removeRole($validated['role']);

        return response()->json([
            'success' => true,
            'message' => 'Rôle retiré avec succès',
            'data' => [
                'user_id' => $user->id,
                'roles' => $user->getRoleNames(),
            ],
        ]);
    }

    /**
     * Sync user roles (replace all roles)
     */
    public function syncRoles(Request $request, User $user)
    {
        $validated = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        // Prevent removing own admin role
        if (auth()->id() === $user->id && !in_array('admin', $validated['roles']) && $user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas retirer votre propre rôle admin',
            ], 403);
        }

        $user->syncRoles($validated['roles']);

        return response()->json([
            'success' => true,
            'message' => 'Rôles mis à jour avec succès',
            'data' => [
                'user_id' => $user->id,
                'roles' => $user->getRoleNames(),
            ],
        ]);
    }

    /**
     * Get single user details with roles
     */
    public function showUser(User $user)
    {
        $roles = $user->getRoleNames()->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'nom_complet' => $user->nom_complet,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'type_compte' => $user->type_compte,
                'roles' => $roles,
                'is_admin' => in_array('admin', $roles),
                'is_moderator' => in_array('moderator', $roles),
                'is_mediator' => in_array('mediator', $roles),
                'badge' => $user->badge ?? 'BRONZE',
                'statut_verification' => $user->telephone_verified_at ? 'VERIFIE' : 'NON_VERIFIE',
                'is_active' => $user->is_active ?? true,
                'is_suspended' => $user->is_suspended ?? false,
                'adresse' => $user->adresse,
                'nom_entreprise' => $user->nom_entreprise,
                'created_at' => $user->created_at,
                'last_login_at' => $user->last_login_at,
            ],
        ]);
    }

    /**
     * Get all visits for admin
     */
    public function visits(Request $request)
    {
        $visits = Visit::with(['listing', 'proprietaire', 'visiteur'])
            ->when($request->statut, fn($q) => $q->where('statut', strtoupper($request->statut)))
            ->when($request->date, fn($q) => $q->whereDate('date_visite', $request->date))
            ->when($request->listing_id, fn($q) => $q->where('listing_id', $request->listing_id))
            ->orderBy('date_visite', 'desc')
            ->orderBy('heure_visite', 'asc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $visits]);
    }

    /**
     * Get visit statistics for admin
     */
    public function visitStats(Request $request)
    {
        $stats = [
            'total' => Visit::count(),
            'pending' => Visit::pending()->count(),
            'confirmed' => Visit::confirmed()->count(),
            'completed' => Visit::completed()->count(),
            'cancelled' => Visit::cancelled()->count(),
            'today' => Visit::whereDate('date_visite', now())->count(),
            'this_week' => Visit::whereBetween('date_visite', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'this_month' => Visit::whereBetween('date_visite', [now()->startOfMonth(), now()->endOfMonth()])->count(),
        ];

        return response()->json(['success' => true, 'data' => $stats]);
    }

    /**
     * Get all notifications for admin
     */
    public function notifications(Request $request)
    {
        $query = Notification::with('user')
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($sq) use ($request) {
                    $sq->where('titre', 'like', "%{$request->search}%")
                        ->orWhere('message', 'like', "%{$request->search}%");
                });
            })
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->when($request->has('is_read'), fn($q) => $q->where('is_read', $request->boolean('is_read')))
            ->when($request->priority, fn($q) => $q->where('priority', $request->priority))
            ->orderBy('created_at', 'desc');

        $notifications = $query->paginate($request->input('per_page', 20));

        // Statistiques
        $stats = [
            'total' => Notification::count(),
            'unread' => Notification::unread()->count(),
            'read' => Notification::read()->count(),
            'high_priority' => Notification::where('priority', 'high')->orWhere('priority', 'urgent')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'stats' => $stats,
            'meta' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    /**
     * Mark notifications as read
     */
    public function markNotificationsRead(Request $request)
    {
        $validated = $request->validate([
            'notification_ids' => 'required|array',
            'notification_ids.*' => 'string|exists:notifications,id',
        ]);

        Notification::whereIn('id', $validated['notification_ids'])
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Notifications marquées comme lues',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsRead(Request $request)
    {
        Notification::unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes les notifications ont été marquées comme lues',
        ]);
    }

    /**
     * Delete notifications
     */
    public function deleteNotifications(Request $request)
    {
        $validated = $request->validate([
            'notification_ids' => 'required|array',
            'notification_ids.*' => 'string|exists:notifications,id',
        ]);

        Notification::whereIn('id', $validated['notification_ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notifications supprimées',
        ]);
    }

    /**
     * Delete user (soft delete)
     */
    public function deleteUser(User $user)
    {
        // Prevent self-deletion
        if (auth()->id() === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas supprimer votre propre compte',
            ], 403);
        }

        // Prevent deleting other admins (optional security measure)
        if ($user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas supprimer un administrateur',
            ], 403);
        }

        // Soft delete the user
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur supprimé avec succès',
        ]);
    }

    /**
     * Restore a soft-deleted user
     */
    public function restoreUser(string $userId)
    {
        $user = User::withTrashed()->findOrFail($userId);

        $user->restore();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur restauré avec succès',
            'data' => [
                'user_id' => $user->id,
                'nom_complet' => $user->nom_complet,
            ],
        ]);
    }

    /**
     * Get trashed (soft-deleted) users
     */
    public function trashedUsers(Request $request)
    {
        $users = User::onlyTrashed()
            ->when($request->search, fn($q) => $q->where(function($sq) use ($request) {
                $sq->where('nom_complet', 'like', "%{$request->search}%")
                    ->orWhere('telephone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->orderBy('deleted_at', 'desc')
            ->paginate(50);

        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'nom_complet' => $user->nom_complet,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'type_compte' => $user->type_compte,
                'deleted_at' => $user->deleted_at,
                'created_at' => $user->created_at,
            ];
        });

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
     * Send bulk notification to users
     */
    public function sendBulkNotification(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'string|exists:users,id',
            'type_compte' => 'nullable|string|in:PARTICULIER,AGENCE',
            'titre' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
        ]);

        $userIds = $validated['user_ids'] ?? null;

        // Si pas d'IDs spécifiques, on peut filtrer par type de compte
        if (!$userIds && isset($validated['type_compte'])) {
            $userIds = User::where('type_compte', $validated['type_compte'])->pluck('id')->toArray();
        }

        // Si toujours pas d'IDs, envoyer à tous
        if (!$userIds) {
            $userIds = User::pluck('id')->toArray();
        }

        $count = 0;
        foreach ($userIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type' => Notification::TYPE_SYSTEM,
                'titre' => $validated['titre'],
                'message' => $validated['message'],
                'priority' => strtoupper($validated['priority'] ?? 'NORMAL'),
            ]);
            $count++;
        }

        return response()->json([
            'success' => true,
            'message' => "Notification envoyée à {$count} utilisateurs",
        ]);
    }
}
