<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    /**
     * Get user's favorite listings.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $favorites = $user->favorites()
            ->with(['photos' => function ($query) {
                $query->orderBy('ordre')->limit(1);
            }, 'user:id,nom_complet,telephone,badge'])
            ->orderByPivot('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'favorites' => $favorites->map(function ($listing) {
                    return [
                        'id' => $listing->id,
                        'titre' => $listing->titre,
                        'type_bien' => $listing->type_bien,
                        'type_transaction' => $listing->type_transaction,
                        'prix' => $listing->prix,
                        'quartier' => $listing->quartier,
                        'commune' => $listing->commune,
                        'nb_chambres' => $listing->nb_chambres,
                        'nb_salles_bain' => $listing->nb_salles_bain,
                        'surface' => $listing->surface,
                        'photo_principale' => $listing->photos->first()?->url,
                        'est_premium' => $listing->est_premium,
                        'est_verifie' => $listing->est_verifie,
                        'added_at' => $listing->pivot->created_at,
                        'proprietaire' => [
                            'id' => $listing->user->id,
                            'nom_complet' => $listing->user->nom_complet,
                            'badge' => $listing->user->badge,
                        ],
                    ];
                }),
            ],
        ]);
    }

    /**
     * Add a listing to favorites.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'listing_id' => 'required|uuid|exists:listings,id',
        ]);

        $user = $request->user();
        $listingId = $request->input('listing_id');

        // Check if already favorited
        if ($user->favorites()->where('listings.id', $listingId)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cette annonce est déjà dans vos favoris',
            ], 422);
        }

        $user->favorites()->attach($listingId);

        return response()->json([
            'success' => true,
            'message' => 'Annonce ajoutée aux favoris',
        ], 201);
    }

    /**
     * Remove a listing from favorites.
     */
    public function destroy(Request $request, string $listingId): JsonResponse
    {
        $user = $request->user();

        $detached = $user->favorites()->detach($listingId);

        if ($detached === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cette annonce n\'était pas dans vos favoris',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Annonce retirée des favoris',
        ]);
    }

    /**
     * Check if a listing is in user's favorites.
     */
    public function check(Request $request, string $listingId): JsonResponse
    {
        $user = $request->user();
        $isFavorite = $user->favorites()->where('listings.id', $listingId)->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'is_favorite' => $isFavorite,
            ],
        ]);
    }

    /**
     * Toggle favorite status (add if not exists, remove if exists).
     */
    public function toggle(Request $request, string $listingId): JsonResponse
    {
        $user = $request->user();

        $exists = $user->favorites()->where('listings.id', $listingId)->exists();

        if ($exists) {
            $user->favorites()->detach($listingId);
            return response()->json([
                'success' => true,
                'data' => [
                    'is_favorite' => false,
                ],
                'message' => 'Annonce retirée des favoris',
            ]);
        }

        $user->favorites()->attach($listingId);
        return response()->json([
            'success' => true,
            'data' => [
                'is_favorite' => true,
            ],
            'message' => 'Annonce ajoutée aux favoris',
        ]);
    }
}
