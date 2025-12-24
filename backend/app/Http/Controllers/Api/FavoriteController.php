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
            ->with(['listingPhotos', 'user:id,nom_complet,telephone,badge'])
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
                        'prix' => $listing->loyer_mensuel,
                        'loyer_mensuel' => $listing->loyer_mensuel,
                        'quartier' => $listing->quartier,
                        'commune' => $listing->commune,
                        'nb_chambres' => $listing->nombre_chambres,
                        'nombre_chambres' => $listing->nombre_chambres,
                        'nb_salles_bain' => $listing->nombre_salles_bain,
                        'nombre_salles_bain' => $listing->nombre_salles_bain,
                        'surface' => $listing->surface_m2,
                        'surface_m2' => $listing->surface_m2,
                        'photo_principale' => $listing->main_photo_url,
                        'main_photo_url' => $listing->main_photo_url,
                        'est_premium' => $listing->est_premium ?? false,
                        'est_verifie' => $listing->est_verifie ?? false,
                        'added_at' => $listing->pivot->created_at,
                        'proprietaire' => $listing->user ? [
                            'id' => $listing->user->id,
                            'nom_complet' => $listing->user->nom_complet,
                            'badge' => $listing->user->badge,
                        ] : null,
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

        try {
            $exists = $user->favorites()->where('listings.id', $listingId)->exists();

            if ($exists) {
                $user->favorites()->detach($listingId);
                \Log::info("Favorite removed: user={$user->id}, listing={$listingId}");
                return response()->json([
                    'success' => true,
                    'data' => [
                        'is_favorite' => false,
                    ],
                    'message' => 'Annonce retirée des favoris',
                ]);
            }

            // Verify listing exists
            $listing = \App\Models\Listing::find($listingId);
            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            $user->favorites()->attach($listingId);
            \Log::info("Favorite added: user={$user->id}, listing={$listingId}");

            // Verify it was actually saved
            $saved = $user->favorites()->where('listings.id', $listingId)->exists();
            \Log::info("Favorite verified saved: " . ($saved ? 'yes' : 'no'));

            return response()->json([
                'success' => true,
                'data' => [
                    'is_favorite' => true,
                ],
                'message' => 'Annonce ajoutée aux favoris',
            ]);
        } catch (\Exception $e) {
            \Log::error("Favorite toggle error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification des favoris: ' . $e->getMessage(),
            ], 500);
        }
    }
}
