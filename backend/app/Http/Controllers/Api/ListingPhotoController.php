<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Services\ListingPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class ListingPhotoController extends Controller
{
    protected ListingPhotoService $photoService;

    public function __construct(ListingPhotoService $photoService)
    {
        $this->photoService = $photoService;
    }

    /**
     * Get all photos for a listing
     *
     * @param string $listingId
     * @return JsonResponse
     */
    public function index(string $listingId): JsonResponse
    {
        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            $photos = $this->photoService->getPhotosWithUrls($listing);

            return response()->json([
                'success' => true,
                'data' => [
                    'photos' => $photos,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get listing photos', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Upload photos to a listing
     *
     * @param Request $request
     * @param string $listingId
     * @return JsonResponse
     */
    public function store(Request $request, string $listingId): JsonResponse
    {
        $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'primary_index' => 'sometimes|integer|min:0',
        ]);

        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership
            if ($listing->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check current photo count (max 10)
            $currentCount = $listing->listingPhotos()->count();
            $newCount = count($request->file('photos'));

            if ($currentCount + $newCount > 10) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nombre maximum de photos atteint (10)',
                    'data' => [
                        'current_count' => $currentCount,
                        'max_allowed' => 10,
                    ],
                ], 422);
            }

            // Upload photos
            $primaryIndex = $request->input('primary_index', $currentCount === 0 ? 0 : null);
            $photos = $this->photoService->uploadMultiple($listing, $request->file('photos'), $primaryIndex);

            Log::info('Photos uploaded', [
                'listing_id' => $listingId,
                'count' => count($photos),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => count($photos) . ' photo(s) ajoutée(s) avec succès',
                'data' => [
                    'photos' => collect($photos)->map(fn($photo) => [
                        'id' => $photo->id,
                        'url' => $photo->url,
                        'thumbnail_url' => $photo->thumbnail_url,
                        'is_primary' => $photo->is_primary,
                        'order' => $photo->order,
                    ]),
                ],
            ], 201);

        } catch (Exception $e) {
            Log::error('Failed to upload photos', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'upload',
            ], 500);
        }
    }

    /**
     * Upload a single photo
     *
     * @param Request $request
     * @param string $listingId
     * @return JsonResponse
     */
    public function upload(Request $request, string $listingId): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'is_primary' => 'sometimes|boolean',
        ]);

        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership
            if ($listing->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check current photo count (max 10)
            $currentCount = $listing->listingPhotos()->count();

            if ($currentCount >= 10) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nombre maximum de photos atteint (10)',
                ], 422);
            }

            // Upload photo
            $isPrimary = $request->boolean('is_primary', false);
            $photo = $this->photoService->upload($listing, $request->file('photo'), $isPrimary);

            Log::info('Photo uploaded', [
                'listing_id' => $listingId,
                'photo_id' => $photo->id,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Photo ajoutée avec succès',
                'data' => [
                    'photo' => [
                        'id' => $photo->id,
                        'url' => $photo->url,
                        'thumbnail_url' => $photo->thumbnail_url,
                        'medium_url' => $photo->medium_url,
                        'large_url' => $photo->large_url,
                        'is_primary' => $photo->is_primary,
                        'order' => $photo->order,
                    ],
                ],
            ], 201);

        } catch (Exception $e) {
            Log::error('Failed to upload photo', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'upload',
            ], 500);
        }
    }

    /**
     * Delete a photo
     *
     * @param Request $request
     * @param string $listingId
     * @param string $photoId
     * @return JsonResponse
     */
    public function destroy(Request $request, string $listingId, string $photoId): JsonResponse
    {
        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership
            if ($listing->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            $photo = ListingPhoto::where('id', $photoId)
                ->where('listing_id', $listingId)
                ->first();

            if (!$photo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo introuvable',
                ], 404);
            }

            $this->photoService->delete($photo);

            Log::info('Photo deleted', [
                'listing_id' => $listingId,
                'photo_id' => $photoId,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Photo supprimée avec succès',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to delete photo', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
                'photo_id' => $photoId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Set a photo as primary
     *
     * @param Request $request
     * @param string $listingId
     * @param string $photoId
     * @return JsonResponse
     */
    public function setPrimary(Request $request, string $listingId, string $photoId): JsonResponse
    {
        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership
            if ($listing->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            $photo = ListingPhoto::where('id', $photoId)
                ->where('listing_id', $listingId)
                ->first();

            if (!$photo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Photo introuvable',
                ], 404);
            }

            $this->photoService->setPrimary($photo);

            Log::info('Primary photo set', [
                'listing_id' => $listingId,
                'photo_id' => $photoId,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Photo principale définie avec succès',
                'data' => [
                    'photo' => [
                        'id' => $photo->id,
                        'url' => $photo->url,
                        'is_primary' => true,
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to set primary photo', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
                'photo_id' => $photoId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Reorder photos
     *
     * @param Request $request
     * @param string $listingId
     * @return JsonResponse
     */
    public function reorder(Request $request, string $listingId): JsonResponse
    {
        $request->validate([
            'photo_ids' => 'required|array|min:1',
            'photo_ids.*' => 'required|uuid',
        ]);

        try {
            $listing = Listing::find($listingId);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership
            if ($listing->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            $this->photoService->reorder($listing, $request->input('photo_ids'));

            Log::info('Photos reordered', [
                'listing_id' => $listingId,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ordre des photos mis à jour',
                'data' => [
                    'photos' => $this->photoService->getPhotosWithUrls($listing),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to reorder photos', [
                'error' => $e->getMessage(),
                'listing_id' => $listingId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }
}
