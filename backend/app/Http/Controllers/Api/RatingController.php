<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RatingResource;
use App\Models\Rating;
use App\Models\Transaction;
use App\Services\ContentModerationService;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function __construct(
        private ContentModerationService $moderationService
    ) {
    }

    /**
     * Create rating after transaction
     * FR-067
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|uuid|exists:transactions,id',
            'critere_1_note' => 'required|integer|min:1|max:5',
            'critere_2_note' => 'required|integer|min:1|max:5',
            'critere_3_note' => 'required|integer|min:1|max:5',
            'commentaire' => 'required|string|min:20|max:500',
        ]);

        $transaction = Transaction::findOrFail($validated['transaction_id']);

        $this->authorize('create', [Rating::class, $transaction]);

        // Determine who is being evaluated
        $evaluatedId = $transaction->proprietaire_id === auth()->id()
            ? $transaction->locataire_acheteur_id
            : $transaction->proprietaire_id;

        // Calculate average rating
        $noteGlobale = round(
            ($validated['critere_1_note'] + $validated['critere_2_note'] + $validated['critere_3_note']) / 3,
            1
        );

        // Moderate content
        $moderation = $this->moderationService->moderate($validated['commentaire']);

        $rating = Rating::create([
            'evaluateur_id' => auth()->id(),
            'evalue_id' => $evaluatedId,
            'transaction_id' => $validated['transaction_id'],
            'note_globale' => $noteGlobale,
            'critere_1_note' => $validated['critere_1_note'],
            'critere_2_note' => $validated['critere_2_note'],
            'critere_3_note' => $validated['critere_3_note'],
            'commentaire' => $validated['commentaire'],
            'statut_moderation' => $moderation['status'],
            'mots_cles_detectes' => $moderation['detected_keywords'],
            'date_creation' => now(),
            'date_publication' => $moderation['is_approved'] ? now() : null,
        ]);

        return new RatingResource($rating);
    }

    /**
     * Get ratings for a user
     * FR-070
     */
    public function show(Request $request, string $userId)
    {
        $ratings = Rating::where('evalue_id', $userId)
            ->where('statut_moderation', 'APPROUVE')
            ->with(['evaluator', 'transaction'])
            ->orderBy('date_publication', 'desc')
            ->paginate(20);

        return RatingResource::collection($ratings);
    }

    /**
     * Moderate rating (Admin only)
     * FR-069
     */
    public function moderate(Request $request, Rating $rating)
    {
        $this->authorize('moderate', $rating);

        $validated = $request->validate([
            'statut' => 'required|in:APPROUVE,REJETE',
        ]);

        $rating->update([
            'statut_moderation' => $validated['statut'],
            'date_publication' => $validated['statut'] === 'APPROUVE' ? now() : null,
        ]);

        return response()->json(['message' => 'Rating moderated successfully']);
    }

    /**
     * Get moderation queue (Admin only)
     */
    public function moderationQueue(Request $request)
    {
        $this->authorize('moderate', Rating::class);

        $ratings = Rating::where('statut_moderation', 'EN_ATTENTE')
            ->with(['evaluator', 'evaluated', 'transaction'])
            ->orderBy('date_creation', 'asc')
            ->paginate(20);

        return RatingResource::collection($ratings);
    }
}
