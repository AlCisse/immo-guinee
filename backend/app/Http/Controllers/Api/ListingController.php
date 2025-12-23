<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreListingRequest;
use App\Http\Requests\UpdateListingRequest;
use App\Models\Listing;
use App\Repositories\ListingRepository;
use App\Services\ListingPhotoService;
use App\Events\ListingUpdated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Exception;

class ListingController extends Controller
{
    protected $listingRepository;
    protected ListingPhotoService $photoService;

    public function __construct(ListingRepository $listingRepository, ListingPhotoService $photoService)
    {
        $this->listingRepository = $listingRepository;
        $this->photoService = $photoService;
    }

    /**
     * Map request fields to model fields
     * Handles the mapping between frontend field names and database column names
     *
     * @param array $validated
     * @return array
     */
    protected function mapRequestToModel(array $validated): array
    {
        $mapped = [];

        // Direct mappings
        $directFields = ['titre', 'description', 'quartier', 'commune', 'adresse_complete',
                         'nombre_chambres', 'nombre_salles_bain', 'surface_m2', 'meuble', 'latitude', 'longitude'];

        foreach ($directFields as $field) {
            if (isset($validated[$field])) {
                $mapped[$field] = $validated[$field];
            }
        }

        // Field name mappings (frontend → database)
        if (isset($validated['type_propriete'])) {
            // Map frontend property types to database enum values
            // DB accepts: APPARTEMENT, MAISON, VILLA, STUDIO, TERRAIN, COMMERCIAL, BUREAU, ENTREPOT, USINE, FERME, AUTRE
            $typeMapping = [
                'appartement' => 'APPARTEMENT',
                'maison' => 'MAISON',
                'villa' => 'VILLA',
                'studio' => 'STUDIO',
                'terrain' => 'TERRAIN',
                'bureau' => 'BUREAU',
                'magasin' => 'COMMERCIAL',
            ];
            $mapped['type_bien'] = $typeMapping[strtolower($validated['type_propriete'])] ?? 'APPARTEMENT';
        }

        if (isset($validated['prix'])) {
            $mapped['loyer_mensuel'] = $validated['prix'];
        }

        // Calculate caution (default to 2 months if not specified)
        $prix = $validated['prix'] ?? 0;
        if (isset($validated['caution_mois']) && $validated['caution_mois'] > 0) {
            $mapped['caution'] = $prix * $validated['caution_mois'];
        } else {
            // Default to 2 months caution if not specified
            $mapped['caution'] = $prix * 2;
        }

        // Calculate avance (default to 1 month if not specified)
        if (isset($validated['avance_mois']) && $validated['avance_mois'] > 0) {
            $mapped['avance'] = $prix * $validated['avance_mois'];
        } else {
            // Default to 1 month avance if not specified
            $mapped['avance'] = $prix * 1;
        }

        // Store commission in months (default to 1 month)
        if (isset($validated['commission_mois'])) {
            $mapped['commission_mois'] = $validated['commission_mois'];
        } else {
            $mapped['commission_mois'] = 1;
        }

        // Store tenant type preference
        if (isset($validated['type_locataire_prefere'])) {
            $mapped['type_locataire_prefere'] = $validated['type_locataire_prefere'];
        }

        if (isset($validated['equipements'])) {
            $mapped['commodites'] = $validated['equipements'];
        }

        if (isset($validated['disponible_a_partir_de'])) {
            $mapped['date_disponibilite'] = $validated['disponible_a_partir_de'];
        }

        // Map type_transaction (convert to uppercase for DB consistency)
        if (isset($validated['type_transaction'])) {
            $typeTransactionMapping = [
                'location' => 'LOCATION',
                'location_courte' => 'LOCATION_COURTE',
                'vente' => 'VENTE',
            ];
            $mapped['type_transaction'] = $typeTransactionMapping[strtolower($validated['type_transaction'])] ?? 'LOCATION';
        }

        // Map duree_minimum_jours for short-term rentals
        if (isset($validated['duree_minimum_jours'])) {
            $mapped['duree_minimum_jours'] = $validated['duree_minimum_jours'];
        }

        // Set default availability
        $mapped['disponible'] = true;

        return $mapped;
    }

    /**
     * Get all listings with filters (public access)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Accept both type_bien (direct) and type_propriete (legacy) for property type filter
            $typeBien = $request->type_bien ?? $request->type_propriete;

            $filters = [
                'type_bien' => $typeBien,
                'type_transaction' => $request->type_transaction,
                'commune' => $request->commune,
                'quartier' => $request->quartier,
                'prix_min' => $request->prix_min,
                'prix_max' => $request->prix_max,
                'chambres_min' => $request->chambres_min,
                'surface_min' => $request->surface_min,
                'meuble' => $request->meuble,
                'equipements' => $request->equipements ? explode(',', $request->equipements) : null,
            ];

            // Filter by authenticated user if 'my' param is true
            if ($request->boolean('my') && $request->user()) {
                $filters['user_id'] = $request->user()->id;
            }

            $sortBy = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';
            $perPage = min($request->per_page ?? 20, 100);

            $filters['sort_by'] = $sortBy;
            $filters['sort_order'] = $sortOrder;

            $listings = $this->listingRepository->getAllPaginated($perPage, $filters);

            return response()->json([
                'success' => true,
                'data' => [
                    'listings' => $listings->items(),
                    'pagination' => [
                        'current_page' => $listings->currentPage(),
                        'per_page' => $listings->perPage(),
                        'total' => $listings->total(),
                        'last_page' => $listings->lastPage(),
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get listings', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Get current user's listings
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function myListings(Request $request): JsonResponse
    {
        try {
            $perPage = min($request->per_page ?? 20, 100);
            $sortBy = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';

            $filters = [
                'user_id' => $request->user()->id,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
            ];

            // Optional status filter
            if ($request->statut) {
                $filters['statut'] = $request->statut;
            }

            $listings = $this->listingRepository->getAllPaginated($perPage, $filters);

            return response()->json([
                'success' => true,
                'data' => [
                    'listings' => $listings->items(),
                    'pagination' => [
                        'current_page' => $listings->currentPage(),
                        'per_page' => $listings->perPage(),
                        'total' => $listings->total(),
                        'last_page' => $listings->lastPage(),
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get user listings', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Search listings with Elasticsearch
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'sometimes|string|max:200',
            'latitude' => 'sometimes|numeric|between:-90,90',
            'longitude' => 'sometimes|numeric|between:-180,180',
            'radius_km' => 'sometimes|numeric|min:1|max:50',
        ]);

        try {
            $query = $request->q;
            $latitude = $request->latitude;
            $longitude = $request->longitude;
            $radiusKm = $request->radius_km ?? 5;
            $perPage = min($request->per_page ?? $request->limit ?? 20, 100);

            // Get filters from request
            $typeBien = $request->type_bien ?? $request->type_propriete;
            $typeTransaction = $request->type_transaction;
            $commune = $request->commune;
            $prixMin = $request->prix_min;
            $prixMax = $request->prix_max;
            $chambresMin = $request->chambres_min;
            $meuble = $request->meuble;

            // Use PostGIS for geospatial search
            if ($latitude && $longitude) {
                $listings = $this->listingRepository->getNearbyListings($latitude, $longitude, $radiusKm);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'listings' => $listings,
                    ],
                ]);
            }

            // For text search and/or filters, use the repository with text search support
            $filters = [
                'type_bien' => $typeBien,
                'type_transaction' => $typeTransaction,
                'commune' => $commune,
                'prix_min' => $prixMin,
                'prix_max' => $prixMax,
                'chambres_min' => $chambresMin,
                'meuble' => $meuble,
                'q' => $query, // text search
                'sort_by' => 'created_at',
                'sort_order' => 'desc',
            ];

            $listings = $this->listingRepository->getAllPaginated($perPage, $filters);

            return response()->json([
                'success' => true,
                'data' => [
                    'listings' => $listings->items(),
                    'query' => $query,
                    'pagination' => [
                        'current_page' => $listings->currentPage(),
                        'per_page' => $listings->perPage(),
                        'total' => $listings->total(),
                        'last_page' => $listings->lastPage(),
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Search failed', [
                'error' => $e->getMessage(),
                'query' => $request->q,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la recherche',
            ], 500);
        }
    }

    /**
     * Create a new listing
     *
     * @param StoreListingRequest $request
     * @return JsonResponse
     */
    public function store(StoreListingRequest $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Prevent duplicate submissions with Redis lock (10 seconds)
            $lockKey = "listing_create:{$user->id}";
            if (!Cache::lock($lockKey, 10)->get()) {
                Log::warning('Duplicate submission blocked by lock', ['user_id' => $user->id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Veuillez patienter, une soumission est en cours...',
                ], 429);
            }

            $data = $this->mapRequestToModel($request->validated());
            $data['user_id'] = $user->id;

            // Status depends on phone verification:
            // - Verified phone → ACTIVE (published)
            // - Unverified phone → BROUILLON (draft, not visible publicly)
            $isVerified = $user->telephone_verified_at !== null;
            $data['statut'] = $isVerified ? 'ACTIVE' : 'BROUILLON';

            // Check for duplicate submission (same title by same user within 60 seconds)
            $recentDuplicate = Listing::where('user_id', $data['user_id'])
                ->where('titre', $data['titre'])
                ->where('created_at', '>=', now()->subSeconds(60))
                ->first();

            if ($recentDuplicate) {
                Cache::lock($lockKey)->forceRelease();
                Log::warning('Duplicate listing submission blocked', [
                    'user_id' => $data['user_id'],
                    'titre' => $data['titre'],
                    'existing_listing_id' => $recentDuplicate->id,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Annonce déjà créée',
                    'data' => [
                        'listing' => $recentDuplicate,
                    ],
                ], 200);
            }

            $listing = $this->listingRepository->create($data);

            // Handle photo uploads using ListingPhotoService
            if ($request->hasFile('photos')) {
                $this->photoService->uploadMultiple($listing, $request->file('photos'));
            }

            // Set publie_at for verified users
            if ($isVerified) {
                $listing->update(['publie_at' => now()]);
                Log::info('Listing published (verified user)', [
                    'listing_id' => $listing->id,
                    'user_type' => $user->type_compte,
                ]);
            } else {
                Log::info('Listing saved as draft (unverified user)', [
                    'listing_id' => $listing->id,
                    'user_id' => $user->id,
                ]);
            }

            // Release the lock after successful creation
            Cache::lock($lockKey)->forceRelease();

            $message = $isVerified
                ? 'Annonce créée et publiée avec succès'
                : 'Annonce enregistrée en brouillon. Vérifiez votre numéro WhatsApp pour la publier.';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'listing' => $listing,
                    'is_published' => $isVerified,
                ],
            ], 201);

        } catch (Exception $e) {
            // Release lock on error
            Cache::lock("listing_create:{$request->user()->id}")->forceRelease();

            Log::error('Failed to create listing', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la création',
            ], 500);
        }
    }

    /**
     * Get a single listing by ID
     *
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $id): JsonResponse
    {
        try {
            $listing = $this->listingRepository->findById($id);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Increment view counter
            $this->listingRepository->incrementViews($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'listing' => $listing->load(['user:id,nom_complet,telephone,badge,type_compte,telephone_verified_at,statut_verification', 'listingPhotos']),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get listing', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Update a listing
     *
     * @param UpdateListingRequest $request
     * @param string $id
     * @return JsonResponse
     */
    public function update(UpdateListingRequest $request, string $id): JsonResponse
    {
        try {
            $listing = $this->listingRepository->findById($id);

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

            $data = $request->validated();

            // Map 'prix' to 'loyer_mensuel' if provided
            if (isset($data['prix'])) {
                $data['loyer_mensuel'] = $data['prix'];
                unset($data['prix']);
            }

            // Remove delete_photos from data before update
            $deletePhotos = null;
            if (isset($data['delete_photos'])) {
                $deletePhotos = json_decode($data['delete_photos'], true);
                unset($data['delete_photos']);
            }

            // Remove primary_photo_id from data before update
            $primaryPhotoId = null;
            if (isset($data['primary_photo_id'])) {
                $primaryPhotoId = $data['primary_photo_id'];
                unset($data['primary_photo_id']);
            }

            $listing = $this->listingRepository->update($id, $data);

            // Handle photo deletions
            if (!empty($deletePhotos) && is_array($deletePhotos)) {
                foreach ($deletePhotos as $photoId) {
                    $photo = $listing->listingPhotos()->find($photoId);
                    if ($photo) {
                        $photo->delete(); // This will also delete from storage via model event
                    }
                }
            }

            // Handle photo uploads using ListingPhotoService
            if ($request->hasFile('photos')) {
                $currentCount = $listing->listingPhotos()->count();
                $maxNewPhotos = 10 - $currentCount;
                $photosToUpload = array_slice($request->file('photos'), 0, $maxNewPhotos);

                if (!empty($photosToUpload)) {
                    $this->photoService->uploadMultiple($listing, $photosToUpload);
                }
            }

            // Set primary photo if specified
            if ($primaryPhotoId) {
                $photo = $listing->listingPhotos()->find($primaryPhotoId);
                if ($photo) {
                    $this->photoService->setPrimary($photo);
                }
            }

            $listing->refresh();

            // Broadcast update event
            event(new ListingUpdated($listing, 'updated'));

            Log::info('Listing updated', [
                'listing_id' => $listing->id,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Annonce mise à jour avec succès',
                'data' => [
                    'listing' => $listing,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to update listing', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Delete a listing (soft delete)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $listing = $this->listingRepository->findById($id);

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

            $this->listingRepository->delete($id);

            Log::info('Listing deleted', [
                'listing_id' => $id,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Annonce supprimée avec succès',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to delete listing', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Apply premium badge to listing
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function applyPremium(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'badge_urgent' => 'sometimes|boolean',
        ]);

        try {
            $listing = $this->listingRepository->findById($id);

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

            $this->listingRepository->applyPremiumBadge($id, $request->badge_urgent ?? false);

            $listing->refresh();

            Log::info('Premium badge applied', [
                'listing_id' => $id,
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Badge premium appliqué avec succès',
                'data' => [
                    'listing' => $listing,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to apply premium badge', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Get contacts (clients) from conversations for a specific listing
     * Returns users who have contacted this listing via messaging
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function getListingContacts(Request $request, string $id): JsonResponse
    {
        try {
            $listing = $this->listingRepository->findById($id);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            // Check ownership - only the owner can see contacts
            // Support both user_id and proprietaire_id fields
            $ownerId = $listing->user_id ?? $listing->proprietaire_id;
            $currentUserId = $request->user()->id;

            Log::info('Checking listing ownership', [
                'listing_id' => $id,
                'listing_owner_id' => $ownerId,
                'current_user_id' => $currentUserId,
                'match' => $ownerId === $currentUserId,
            ]);

            if ($ownerId !== $currentUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                    'debug' => [
                        'listing_owner' => $ownerId,
                        'current_user' => $currentUserId,
                    ],
                ], 403);
            }

            // Get ALL conversations for this listing (remove is_active filter)
            $conversations = \App\Models\Conversation::where('listing_id', $id)
                ->with(['initiator:id,nom_complet,telephone', 'participant:id,nom_complet,telephone', 'lastMessage'])
                ->orderBy('last_message_at', 'desc')
                ->get();

            Log::info('Fetching contacts for listing', [
                'listing_id' => $id,
                'owner_id' => $ownerId,
                'conversations_count' => $conversations->count(),
            ]);

            // Extract unique contacts (the other party in each conversation)
            $currentUserId = $request->user()->id;
            $contacts = $conversations->map(function ($conv) use ($currentUserId) {
                // Determine who is the client (the other party)
                // The owner (current user) could be either initiator or participant
                $client = null;

                if ($conv->initiator_id === $currentUserId) {
                    $client = $conv->participant;
                } elseif ($conv->participant_id === $currentUserId) {
                    $client = $conv->initiator;
                } else {
                    // If current user is neither, take the initiator (who started the conversation)
                    $client = $conv->initiator;
                }

                if (!$client) {
                    return null;
                }

                return [
                    'id' => $client->id,
                    'nom_complet' => $client->nom_complet,
                    'telephone' => $client->telephone,
                    'conversation_id' => $conv->id,
                    'last_message_at' => $conv->last_message_at,
                    'last_message' => $conv->lastMessage?->contenu,
                ];
            })->filter()->unique('id')->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'contacts' => $contacts,
                    'listing' => [
                        'id' => $listing->id,
                        'titre' => $listing->titre,
                    ],
                    'debug' => [
                        'conversations_found' => $conversations->count(),
                        'contacts_extracted' => $contacts->count(),
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get listing contacts', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Get similar listings
     *
     * @param string $id
     * @return JsonResponse
     */
    public function similar(string $id): JsonResponse
    {
        try {
            $listing = $this->listingRepository->findById($id);

            if (!$listing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Annonce introuvable',
                ], 404);
            }

            $similarListings = $this->listingRepository->getSimilarListings($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'listings' => $similarListings,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get similar listings', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Increment contact counter
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function contact(Request $request, string $id): JsonResponse
    {
        try {
            $this->listingRepository->incrementContacts($id);

            return response()->json([
                'success' => true,
                'message' => 'Contact enregistré',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to record contact', [
                'error' => $e->getMessage(),
                'listing_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }
}
