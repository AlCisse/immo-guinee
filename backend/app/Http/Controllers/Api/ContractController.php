<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContractRequest;
use App\Models\Contract;
use App\Models\Listing;
use App\Repositories\ContractRepository;
use App\Services\ContractService;
use App\Services\SignatureService;
use App\Jobs\LockSignedContractJob;
use App\Events\ContractStatusUpdated;
use App\Notifications\ContractSignedNotification;
use App\Notifications\ContractSentForSignatureNotification;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class ContractController extends Controller
{
    protected $contractRepository;
    protected $contractService;
    protected $signatureService;
    protected $whatsAppService;

    public function __construct(
        ContractRepository $contractRepository,
        ContractService $contractService,
        SignatureService $signatureService,
        WhatsAppService $whatsAppService
    ) {
        $this->contractRepository = $contractRepository;
        $this->contractService = $contractService;
        $this->signatureService = $signatureService;
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Get all contracts for authenticated user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user->id;
            $role = $request->query('role'); // 'proprietaire' or 'locataire'

            // Admins can see all contracts
            if ($user->hasRole('admin')) {
                $contracts = $this->contractRepository->getAllContracts($request->query('statut'));
            } else {
                $contracts = $this->contractRepository->getUserContracts($userId, $role);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'contracts' => $contracts,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get contracts', [
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
     * Create a new contract
     *
     * @param StoreContractRequest $request
     * @return JsonResponse
     */
    public function store(StoreContractRequest $request): JsonResponse
    {
        try {
            Log::info('Contract store request', [
                'user_id' => $request->user()->id,
                'input' => $request->except(['documents']),
            ]);

            $listing = Listing::findOrFail($request->listing_id);

            Log::info('Contract store - listing found', [
                'listing_id' => $listing->id,
                'listing_statut' => $listing->statut,
            ]);

            // Check if listing is available (accept both 'publiee' and 'ACTIVE' statuses)
            if (!in_array($listing->statut, ['publiee', 'ACTIVE', 'active'])) {
                Log::warning('Contract store - listing not available', [
                    'listing_id' => $listing->id,
                    'listing_statut' => $listing->statut,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Cette annonce n\'est plus disponible',
                ], 422);
            }

            // Check if there's already a SIGNED contract for this listing (property already rented)
            $signedContract = Contract::where('listing_id', $listing->id)
                ->whereIn('statut', ['SIGNE', 'signe', 'ACTIF'])
                ->first();

            if ($signedContract) {
                Log::warning('Contract store - already signed', [
                    'listing_id' => $listing->id,
                    'existing_contract_id' => $signedContract->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Cette propriété est déjà louée (contrat signé)',
                    'data' => [
                        'existing_contract_id' => $signedContract->id,
                        'existing_contract_status' => $signedContract->statut,
                    ],
                ], 422);
            }

            // Check if there's already a pending contract for the SAME listing AND SAME tenant
            // (prevent duplicate proposals to the same person)
            $locataireId = $request->input('locataire_id');
            if ($locataireId) {
                $duplicateContract = Contract::where('listing_id', $listing->id)
                    ->where('locataire_id', $locataireId)
                    ->whereIn('statut', [
                        'EN_ATTENTE_SIGNATURE_LOCATAIRE',
                        'EN_ATTENTE_SIGNATURE_BAILLEUR',
                        'en_attente_signature',
                        'SIGNE_PARTIELLEMENT',
                    ])
                    ->first();

                if ($duplicateContract) {
                    Log::warning('Contract store - duplicate contract', [
                        'listing_id' => $listing->id,
                        'locataire_id' => $locataireId,
                        'existing_contract_id' => $duplicateContract->id,
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Un contrat existe déjà pour ce locataire sur cette annonce',
                        'data' => [
                            'existing_contract_id' => $duplicateContract->id,
                            'existing_contract_status' => $duplicateContract->statut,
                        ],
                    ], 422);
                }
            }

            Log::info('Contract store - all checks passed, proceeding with creation');

            $data = $request->validated();
            $user = $request->user();

            Log::info('Contract creation - validated data', [
                'raw_locataire_id' => $request->input('locataire_id'),
                'validated_locataire_id' => $data['locataire_id'] ?? 'NOT_SET',
                'all_validated_keys' => array_keys($data),
            ]);

            // The logged-in user (owner of the listing) is the bailleur
            // The locataire is either specified in the request or defaults to null
            $data['bailleur_id'] = $user->id;

            // If locataire_id is provided, use it; otherwise, the contract waits for a tenant
            if (empty($data['locataire_id'])) {
                // No tenant specified - contract created without tenant (owner creates template)
                $data['locataire_id'] = null;
                $data['statut'] = 'BROUILLON';
            } else {
                // Tenant specified - contract ready for tenant signature
                $data['statut'] = 'EN_ATTENTE_SIGNATURE_LOCATAIRE';
            }

            $data['numero_contrat'] = 'CTR-' . strtoupper(uniqid());

            // Map API field names to database column names
            if (isset($data['montant_loyer'])) {
                $data['loyer_mensuel'] = $data['montant_loyer'];
                unset($data['montant_loyer']);
            }
            if (isset($data['montant_caution'])) {
                $data['caution'] = $data['montant_caution'];
                unset($data['montant_caution']);
            }

            // Calculate date_fin from duree_mois if not provided
            if (empty($data['date_fin']) && !empty($data['duree_mois'])) {
                $dateDebut = \Carbon\Carbon::parse($data['date_debut']);
                $data['date_fin'] = $dateDebut->addMonths($data['duree_mois'])->format('Y-m-d');
            }

            // For indefinite duration, set a far future date (e.g., 10 years)
            if (!empty($data['duree_indeterminee'])) {
                $dateDebut = \Carbon\Carbon::parse($data['date_debut']);
                $data['date_fin'] = $dateDebut->addYears(10)->format('Y-m-d');
                $data['duree_mois'] = 120; // 10 years in months
                unset($data['duree_indeterminee']);
            }

            // Generate contract conditions
            $data['conditions_generales'] = $this->generateConditionsGenerales($data['type_contrat']);

            $contract = $this->contractRepository->create($data);

            Log::info('Contract created', [
                'contract_id' => $contract->id,
                'listing_id' => $listing->id,
                'bailleur_id' => $contract->bailleur_id,
                'locataire_id' => $contract->locataire_id,
            ]);

            // Load relationships for PDF generation and notification
            $contract->load(['listing', 'bailleur', 'locataire', 'proprietaire']);

            // Generate PDF immediately after contract creation and store in MinIO
            try {
                $pdfUrl = $this->contractService->generatePdf($contract);
                Log::info('Contract PDF generated on creation', [
                    'contract_id' => $contract->id,
                    'pdf_url' => $pdfUrl,
                ]);
            } catch (Exception $pdfException) {
                Log::error('Failed to generate PDF on contract creation', [
                    'contract_id' => $contract->id,
                    'error' => $pdfException->getMessage(),
                ]);
                // Continue without PDF - can be generated later
            }

            // Refresh contract to get updated pdf_url
            $contract->refresh();

            // Send WhatsApp notification to the locataire (tenant) with deep link
            // Only send if a locataire is specified
            if ($contract->locataire_id) {
                $this->sendContractWhatsAppNotification($contract, $listing);
            }

            return response()->json([
                'success' => true,
                'message' => 'Contrat créé avec succès',
                'data' => [
                    'contract' => $contract,
                ],
            ], 201);

        } catch (Exception $e) {
            Log::error('Failed to create contract', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la création du contrat',
            ], 500);
        }
    }

    /**
     * Get a single contract
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Use policy for authorization
            $user = $request->user();
            if (!$user->can('view', $contract)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé. Seuls le propriétaire, le locataire ou un administrateur peuvent voir ce contrat.',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'contract' => $contract->load(['listing', 'proprietaire', 'locataire']),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get contract', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Request OTP for contract signature (T131 - Step 1)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function requestSignatureOtp(Request $request, string $id): JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            $user = $request->user();
            $userId = $user->id;
            $isProprietaire = $contract->bailleur_id === $userId;
            $isLocataire = $contract->locataire_id === $userId;

            if (!$isProprietaire && !$isLocataire) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check if user already signed
            $signatureField = $isProprietaire ? 'bailleur_signed_at' : 'locataire_signed_at';
            if ($contract->$signatureField) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà signé ce contrat',
                ], 422);
            }

            // Request OTP via SignatureService
            $result = $this->signatureService->requestSignatureOtp($user, $contract);

            return response()->json([
                'success' => true,
                'message' => 'Code OTP envoyé par SMS',
                'data' => [
                    'expires_in' => $result['expires_in'],
                    'contract_reference' => ($contract->numero_contrat ?? $contract->id),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to request signature OTP', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sign a contract with OTP verification (T131 - Step 2: FR-028)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function sign(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'otp' => 'required|string|size:6',
        ]);

        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            $user = $request->user();

            // Verify OTP and sign using SignatureService
            $result = $this->signatureService->verifyAndSign(
                $contract,
                $user,
                $request->otp,
                $request->ip(),
                $request->userAgent()
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 422);
            }

            // Refresh contract
            $contract->refresh();

            // Check if both parties have signed
            if ($result['both_signed']) {
                // Update status to ACTIF (contrat actif avec fond vert)
                $contract->update(['statut' => 'ACTIF']);

                // Lock the contract after both signatures
                $this->signatureService->lockContract($contract);

                // Dispatch job to handle post-signature tasks
                LockSignedContractJob::dispatch($contract)->delay(now()->addSeconds(10));

                // Notify both parties
                $contract->proprietaire->notify(new ContractSignedNotification($contract));
                $contract->locataire->notify(new ContractSignedNotification($contract));

                // Send WhatsApp notification with PDF to both parties
                $this->sendSignedContractWhatsApp($contract);

                // Broadcast event
                event(new ContractStatusUpdated($contract));
            }

            return response()->json([
                'success' => true,
                'message' => 'Contrat signé avec succès',
                'data' => [
                    'contract' => $contract->load(['listing', 'proprietaire', 'locataire']),
                    'signature' => $result['signature'],
                    'both_signed' => $result['both_signed'],
                    'retraction_period' => $result['both_signed'] ? [
                        'expires_at' => $contract->fresh()->delai_retractation_expire,
                        'hours_remaining' => 48,
                    ] : null,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to sign contract', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la signature',
            ], 500);
        }
    }

    /**
     * Get signature certificate for a contract
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function signatureCertificate(Request $request, string $id): JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Use policy for authorization
            $user = $request->user();
            if (!$user->can('view', $contract)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            $certificate = $this->signatureService->getSignatureCertificate($contract);

            return response()->json([
                'success' => true,
                'data' => [
                    'certificate' => $certificate,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get signature certificate', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Cancel a contract
     * - If not signed by both parties: owner can cancel and DELETE the contract
     * - If signed by both parties: during retraction period, can cancel (sets status to resilie)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'motif' => 'nullable|string|max:1000',
        ]);

        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            $user = $request->user();
            $userId = $user->id;
            $isAdmin = $user->hasRole('admin');
            $isProprietaire = $contract->bailleur_id === $userId;
            $isLocataire = $contract->locataire_id === $userId;

            // Check if contract is signed by both parties
            $isBothSigned = $contract->bailleur_signed_at && $contract->locataire_signed_at;
            $locataireHasSigned = !empty($contract->locataire_signed_at);

            // Check authorization
            // - Admin can always cancel
            // - Owner can always cancel if not fully signed
            // - Tenant can cancel only if they haven't signed yet
            if (!$isAdmin && !$isProprietaire && !($isLocataire && !$locataireHasSigned)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à annuler ce contrat',
                ], 403);
            }

            if (!$isBothSigned) {
                // Contract not fully signed - DELETE it completely
                // First, delete PDF if exists
                if ($contract->pdf_url) {
                    $disk = $contract->pdf_storage_disk ?? 'documents';
                    $pdfPath = $contract->pdf_url;
                    if ($disk === 'public') {
                        $baseUrl = Storage::disk($disk)->url('');
                        $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
                    }
                    try {
                        Storage::disk($disk)->delete($pdfPath);
                    } catch (Exception $e) {
                        Log::warning('Failed to delete contract PDF', [
                            'contract_id' => $contract->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $contractId = $contract->id;
                $contract->delete();

                Log::info('Contract cancelled and deleted (not fully signed)', [
                    'contract_id' => $contractId,
                    'user_id' => $userId,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Contrat annulé et supprimé avec succès',
                    'data' => [
                        'deleted' => true,
                    ],
                ]);
            }

            // Contract is signed by both parties - check retraction period
            if (!$this->contractRepository->canRetract($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La période de rétractation est expirée. Le contrat ne peut plus être annulé.',
                ], 422);
            }

            // Within retraction period - update status to resilie
            $contract->update([
                'statut' => 'RESILIE',
                'motif_resiliation' => $request->motif ?? 'Annulé par le propriétaire',
            ]);

            // Broadcast event
            event(new ContractStatusUpdated($contract));

            Log::info('Contract cancelled (within retraction period)', [
                'contract_id' => $contract->id,
                'user_id' => $userId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Contrat annulé avec succès',
                'data' => [
                    'deleted' => false,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to cancel contract', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Send WhatsApp notification with PDF to both parties after contract is fully signed
     */
    protected function sendSignedContractWhatsApp(Contract $contract): void
    {
        try {
            $contract->load(['listing', 'proprietaire', 'locataire']);
            $listing = $contract->listing;
            $proprietaire = $contract->proprietaire;
            $locataire = $contract->locataire;

            $loyer = number_format($contract->loyer_mensuel ?? 0, 0, ',', ' ');
            $reference = $contract->numero_contrat ?? $contract->reference ?? $contract->id;
            $frontendUrl = config('app.frontend_url', 'https://immoguinee.com');

            // Get PDF URL
            $pdfUrl = null;
            if ($contract->pdf_url) {
                $disk = $contract->pdf_storage_disk ?? 'documents';
                if ($disk === 'public') {
                    $pdfUrl = $contract->pdf_url;
                } else {
                    // For MinIO or other S3-compatible storage, generate temporary URL
                    try {
                        $pdfUrl = Storage::disk($disk)->temporaryUrl($contract->pdf_url, now()->addHours(24));
                    } catch (Exception $e) {
                        Log::warning('Could not generate temporary URL for PDF', [
                            'contract_id' => $contract->id,
                            'error' => $e->getMessage(),
                        ]);
                        $pdfUrl = null;
                    }
                }
            }

            // Message for proprietaire (owner)
            if ($proprietaire && $proprietaire->telephone) {
                $messageProprietaire = "✅ *Contrat signé avec succès - ImmoGuinée*\n\n";
                $messageProprietaire .= "Félicitations! Votre contrat a été signé par les deux parties.\n\n";
                $messageProprietaire .= "*📋 Référence:* {$reference}\n";
                $messageProprietaire .= "*🏠 Bien:* {$listing->titre}\n";
                $messageProprietaire .= "*📍 Adresse:* {$listing->quartier}, {$listing->commune}\n";
                $messageProprietaire .= "*👤 Locataire:* {$locataire->nom_complet}\n";
                $messageProprietaire .= "*💰 Loyer:* {$loyer} GNF/mois\n\n";
                $messageProprietaire .= "📄 *Téléchargez votre contrat signé:*\n{$frontendUrl}/contrats/{$contract->id}\n\n";
                $messageProprietaire .= "_Le contrat est maintenant archivé de manière sécurisée pendant 10 ans._";

                try {
                    if ($pdfUrl) {
                        // Send PDF file
                        $this->whatsAppService->sendFile(
                            $proprietaire->telephone,
                            $pdfUrl,
                            $messageProprietaire
                        );
                    } else {
                        // Send just the message
                        $this->whatsAppService->send(
                            $proprietaire->telephone,
                            $messageProprietaire,
                            'contract_signed',
                            ['contract_id' => $contract->id, 'role' => 'proprietaire']
                        );
                    }

                    Log::info('WhatsApp signed contract notification sent to proprietaire', [
                        'contract_id' => $contract->id,
                        'proprietaire_phone' => $proprietaire->telephone,
                    ]);
                } catch (Exception $e) {
                    Log::error('Failed to send WhatsApp to proprietaire', [
                        'contract_id' => $contract->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Message for locataire (tenant)
            if ($locataire && $locataire->telephone) {
                $messageLocataire = "✅ *Contrat signé avec succès - ImmoGuinée*\n\n";
                $messageLocataire .= "Félicitations! Votre contrat de location a été finalisé.\n\n";
                $messageLocataire .= "*📋 Référence:* {$reference}\n";
                $messageLocataire .= "*🏠 Bien:* {$listing->titre}\n";
                $messageLocataire .= "*📍 Adresse:* {$listing->quartier}, {$listing->commune}\n";
                $messageLocataire .= "*👤 Propriétaire:* {$proprietaire->nom_complet}\n";
                $messageLocataire .= "*💰 Loyer:* {$loyer} GNF/mois\n";
                $messageLocataire .= "*📅 Début:* {$contract->date_debut}\n\n";
                $messageLocataire .= "📄 *Téléchargez votre contrat signé:*\n{$frontendUrl}/contrats/{$contract->id}\n\n";
                $messageLocataire .= "_Le contrat est maintenant archivé de manière sécurisée pendant 10 ans._";

                try {
                    if ($pdfUrl) {
                        // Send PDF file
                        $this->whatsAppService->sendFile(
                            $locataire->telephone,
                            $pdfUrl,
                            $messageLocataire
                        );
                    } else {
                        // Send just the message
                        $this->whatsAppService->send(
                            $locataire->telephone,
                            $messageLocataire,
                            'contract_signed',
                            ['contract_id' => $contract->id, 'role' => 'locataire']
                        );
                    }

                    Log::info('WhatsApp signed contract notification sent to locataire', [
                        'contract_id' => $contract->id,
                        'locataire_phone' => $locataire->telephone,
                    ]);
                } catch (Exception $e) {
                    Log::error('Failed to send WhatsApp to locataire', [
                        'contract_id' => $contract->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

        } catch (Exception $e) {
            // Don't fail the signature if WhatsApp fails
            Log::error('Failed to send WhatsApp notifications for signed contract', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send WhatsApp notification to locataire about new contract with deep link
     */
    protected function sendContractWhatsAppNotification(Contract $contract, Listing $listing): void
    {
        try {
            $locataire = $contract->locataire;
            $proprietaire = $contract->proprietaire;

            if (!$locataire || !$locataire->telephone) {
                Log::warning('Cannot send WhatsApp: No locataire phone number', [
                    'contract_id' => $contract->id,
                ]);
                return;
            }

            $loyer = number_format($contract->loyer_mensuel ?? 0, 0, ',', ' ');
            $frontendUrl = config('app.frontend_url', 'https://immoguinee.com');

            // Generate signature token for the locataire (allows signing without login)
            $signatureToken = $contract->generateSignatureToken();
            $deepLink = "{$frontendUrl}/contrat/signer/{$signatureToken}";

            $message = "📄 *Nouveau contrat de location - ImmoGuinée*\n\n";
            $message .= "Bonjour {$locataire->nom_complet},\n\n";
            $message .= "{$proprietaire->nom_complet} vous propose un contrat de location:\n\n";
            $message .= "*🏠 Bien:* {$listing->titre}\n";
            $message .= "*📍 Adresse:* {$listing->quartier}, {$listing->commune}\n";
            $message .= "*💰 Loyer:* {$loyer} GNF/mois\n";
            $message .= "*📅 Début:* {$contract->date_debut}\n\n";
            $message .= "👉 *Consultez et signez votre contrat:*\n{$deepLink}\n\n";
            $message .= "_Vous avez 7 jours pour signer ce contrat._";

            // Try to send with buttons, fall back to simple text if buttons not supported
            try {
                $buttons = [
                    ['id' => "sign_{$contract->id}", 'text' => '✍️ Signer'],
                    ['id' => "view_{$contract->id}", 'text' => '👁️ Voir détails'],
                ];

                $this->whatsAppService->sendButtons(
                    $locataire->telephone,
                    $message,
                    $buttons,
                    'Nouveau contrat',
                    'ImmoGuinée',
                    'contract_notification',
                    [
                        'contract_id' => $contract->id,
                        'listing_id' => $listing->id,
                        'deep_link' => $deepLink,
                    ]
                );
            } catch (Exception $buttonError) {
                // Fall back to simple text message if buttons fail
                Log::warning('WhatsApp buttons failed, sending text message', [
                    'error' => $buttonError->getMessage(),
                ]);

                $this->whatsAppService->send(
                    $locataire->telephone,
                    $message,
                    'contract_notification',
                    [
                        'contract_id' => $contract->id,
                        'listing_id' => $listing->id,
                        'deep_link' => $deepLink,
                    ]
                );
            }

            Log::info('WhatsApp notification sent for contract', [
                'contract_id' => $contract->id,
                'locataire_phone' => $locataire->telephone,
            ]);

        } catch (Exception $e) {
            // Don't fail the contract creation if WhatsApp fails
            Log::error('Failed to send WhatsApp notification for contract', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generate contract general conditions
     */
    protected function generateConditionsGenerales(string $typeContrat): array
    {
        if ($typeContrat === 'location') {
            return [
                'Le locataire s\'engage à payer le loyer mensuellement avant le 5 de chaque mois.',
                'Le locataire s\'engage à entretenir le logement et à le restituer en bon état.',
                'Le propriétaire s\'engage à assurer la jouissance paisible du bien.',
                'Toute modification du bien doit être approuvée par le propriétaire.',
                'Un préavis de 3 mois est requis pour la résiliation du contrat.',
                'La caution sera restituée dans un délai de 30 jours après l\'état des lieux de sortie.',
            ];
        } else {
            return [
                'Le vendeur garantit être le propriétaire légitime du bien.',
                'L\'acheteur s\'engage à payer le prix convenu selon les modalités définies.',
                'Les frais de notaire et d\'enregistrement sont à la charge de l\'acheteur.',
                'La remise des clés se fera après paiement intégral.',
                'Période de rétractation de 48 heures à compter de la signature.',
                'Le vendeur garantit le bien contre les vices cachés pendant 6 mois.',
            ];
        }
    }

    /**
     * Preview contract PDF (T120: PDF streaming)
     *
     * @param Request $request
     * @param string $id
     * @return Response|JsonResponse
     */
    public function preview(Request $request, string $id): Response|JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Use policy for authorization
            $user = $request->user();
            $userId = $user->id;
            if (!$user->can('preview', $contract)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé. Seuls le propriétaire, le locataire ou un administrateur peuvent voir ce contrat.',
                ], 403);
            }

            // Check if we need to generate/regenerate PDF
            // Regenerate if: no URL, no storage disk set (old format), or file doesn't exist
            $needsGeneration = !$contract->pdf_url || !$contract->pdf_storage_disk;

            if (!$needsGeneration) {
                // Check if file exists in storage
                $disk = $contract->pdf_storage_disk;
                $pdfPath = $contract->pdf_url;
                if ($disk === 'public') {
                    $baseUrl = Storage::disk($disk)->url('');
                    $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
                }
                try {
                    $needsGeneration = !$pdfPath || !Storage::disk($disk)->exists($pdfPath);
                } catch (\Exception $e) {
                    $needsGeneration = true;
                }
            }

            if ($needsGeneration) {
                $generatedPath = $this->contractService->generatePdf($contract);
                // Reload contract from database to get updated values
                $contract = Contract::find($contract->id);
            }

            // Get PDF from storage
            $disk = $contract->pdf_storage_disk ?? 'documents';
            $pdfPath = $contract->pdf_url ?? null;

            if (!$pdfPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de la génération du PDF',
                ], 500);
            }
            if ($disk === 'public') {
                $baseUrl = Storage::disk($disk)->url('');
                $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
            }

            $pdfContent = Storage::disk($disk)->get($pdfPath);
            $fileName = 'contrat_' . ($contract->numero_contrat ?? $contract->id) . '.pdf';

            Log::info('Contract PDF preview', [
                'contract_id' => $contract->id,
                'user_id' => $userId,
            ]);

            // Stream PDF response with appropriate headers
            return response($pdfContent, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $fileName . '"')
                ->header('Content-Length', strlen($pdfContent))
                ->header('Cache-Control', 'private, max-age=3600')
                ->header('X-Content-Type-Options', 'nosniff');

        } catch (Exception $e) {
            Log::error('Failed to preview contract PDF', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la génération de l\'aperçu',
            ], 500);
        }
    }

    /**
     * Delete a contract (T121: only if not signed)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Check if user is the contract creator (proprietaire)
            $userId = $request->user()->id;
            if ($contract->bailleur_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seul le propriétaire peut supprimer le contrat',
                ], 403);
            }

            // Check if contract is not signed
            if (in_array($contract->statut, ['SIGNE', 'ACTIF', 'TERMINE'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer un contrat signé',
                ], 422);
            }

            // Check if any party has already signed
            if ($contract->bailleur_signed_at || $contract->locataire_signed_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer un contrat en cours de signature',
                ], 422);
            }

            // Delete PDF from storage if exists
            if ($contract->pdf_url) {
                $disk = $contract->pdf_storage_disk ?? 'documents';
                $pdfPath = $contract->pdf_url;
                if ($disk === 'public') {
                    $baseUrl = Storage::disk($disk)->url('');
                    $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
                }
                Storage::disk($disk)->delete($pdfPath);
            }

            // Delete contract
            $contract->delete();

            Log::info('Contract deleted', [
                'contract_id' => $id,
                'user_id' => $userId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Contrat supprimé avec succès',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to delete contract', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la suppression',
            ], 500);
        }
    }

    /**
     * Send contract for signature (T122: multi-channel notifications)
     *
     * @param Request $request
     * @param string $id
     * @return JsonResponse
     */
    public function send(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'message' => 'nullable|string|max:500',
            'channels' => 'nullable|array',
            'channels.*' => 'in:sms,email,push,whatsapp',
        ]);

        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Check if user is the contract creator (proprietaire)
            $userId = $request->user()->id;
            if ($contract->bailleur_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seul le propriétaire peut envoyer le contrat',
                ], 403);
            }

            // Check if contract is in valid state
            if (in_array($contract->statut, ['SIGNE', 'ACTIF', 'TERMINE'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce contrat est déjà signé',
                ], 422);
            }

            // Generate PDF if not exists
            if (!$contract->pdf_url) {
                $this->contractService->generatePdf($contract);
                $contract->refresh();
            }

            // Update contract status
            $contract->update([
                'statut' => 'en_attente_signature',
                'envoye_le' => now(),
            ]);

            // Get notification channels (default: all enabled by user preferences)
            $channels = $request->input('channels', ['sms', 'email', 'push', 'whatsapp']);
            $customMessage = $request->input('message');

            // Load related data
            $contract->load(['locataire', 'proprietaire', 'listing']);

            // Send notification to tenant via all specified channels
            $notificationData = [
                'contract' => $contract,
                'message' => $customMessage,
                'channels' => $channels,
            ];

            // Notify the tenant
            $contract->locataire->notify(new ContractSentForSignatureNotification($contract, $customMessage, $channels));

            // Broadcast event for real-time updates
            event(new ContractStatusUpdated($contract));

            Log::info('Contract sent for signature', [
                'contract_id' => $contract->id,
                'locataire_id' => $contract->locataire_id,
                'channels' => $channels,
                'sent_by' => $userId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Contrat envoyé pour signature',
                'data' => [
                    'contract' => $contract,
                    'sent_to' => $contract->locataire->nom_complet ?? $contract->locataire->telephone,
                    'channels' => $channels,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to send contract for signature', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'envoi',
            ], 500);
        }
    }

    /**
     * Download contract PDF (T137: FR-036)
     * Uses ContractPolicy to authorize: only bailleur, locataire, or admin can download.
     *
     * @param Request $request
     * @param string $id
     * @return Response|JsonResponse
     */
    public function download(Request $request, string $id): Response|JsonResponse
    {
        try {
            $contract = $this->contractRepository->findById($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat introuvable',
                ], 404);
            }

            // Use policy for authorization
            $user = $request->user();
            if (!$user->can('download', $contract)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé. Seuls le propriétaire, le locataire ou un administrateur peuvent télécharger ce contrat.',
                ], 403);
            }

            // Check if we need to generate PDF (similar to preview)
            $needsGeneration = !$contract->pdf_url || !$contract->pdf_storage_disk;

            if (!$needsGeneration) {
                // Check if file exists in storage
                $disk = $contract->pdf_storage_disk;
                $pdfPath = $contract->pdf_url;
                if ($disk === 'public') {
                    $baseUrl = Storage::disk($disk)->url('');
                    $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
                }
                try {
                    $needsGeneration = !$pdfPath || !Storage::disk($disk)->exists($pdfPath);
                } catch (\Exception $e) {
                    $needsGeneration = true;
                }
            }

            if ($needsGeneration) {
                try {
                    $this->contractService->generatePdf($contract);
                    // Reload contract from database to get updated values
                    $contract = Contract::find($contract->id);
                } catch (\Exception $e) {
                    Log::error('Failed to generate PDF for download', [
                        'contract_id' => $contract->id,
                        'error' => $e->getMessage(),
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Impossible de générer le PDF du contrat',
                    ], 500);
                }
            }

            // Determine which disk was used
            $disk = $contract->pdf_storage_disk ?? 'documents';

            // Get PDF path
            $pdfPath = $contract->pdf_url;
            if (!$pdfPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier PDF non disponible',
                ], 404);
            }

            if ($disk === 'public') {
                $baseUrl = Storage::disk($disk)->url('');
                $pdfPath = str_replace($baseUrl, '', $contract->pdf_url);
            }

            if (!Storage::disk($disk)->exists($pdfPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier PDF introuvable',
                ], 404);
            }

            // Get PDF content - decrypt if encrypted
            if ($contract->pdf_encrypted ?? false) {
                // Use ContractService to decrypt
                $pdfContent = $this->contractService->getDecryptedPdf($contract);
            } else {
                // Legacy: unencrypted PDF
                $pdfContent = Storage::disk($disk)->get($pdfPath);
            }

            // Generate watermark text (FR-036)
            $userName = $user->nom_complet ?? $user->telephone;
            $downloadDate = now()->format('d/m/Y à H:i');
            $watermarkText = "Téléchargé par {$userName} le {$downloadDate}";

            // Add download watermark to PDF (simplified - in production use TCPDF/FPDF)
            // For now, we'll add it as a header comment
            $fileName = 'contrat_' . ($contract->numero_contrat ?? $contract->id) . '_' . now()->format('YmdHis') . '.pdf';

            // Log the download
            Log::info('Contract PDF downloaded', [
                'contract_id' => $contract->id,
                'user_id' => $user->id,
                'user_name' => $userName,
                'watermark' => $watermarkText,
            ]);

            // Return PDF with download headers
            return response($pdfContent, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"')
                ->header('Content-Length', strlen($pdfContent))
                ->header('X-Watermark', $watermarkText)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate');

        } catch (Exception $e) {
            Log::error('Failed to download contract PDF', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors du téléchargement',
            ], 500);
        }
    }

    /**
     * Request contract termination with 3-month notice period (préavis)
     * Both landlord and tenant can request termination
     */
    public function requestTermination(Request $request, string $id): JsonResponse
    {
        try {
            $contract = Contract::find($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat non trouvé',
                ], 404);
            }

            $user = $request->user();

            // Check authorization - only parties to the contract can request termination
            if ($contract->bailleur_id !== $user->id && $contract->locataire_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé. Seules les parties du contrat peuvent demander la résiliation.',
                ], 403);
            }

            // Check if contract is active/signed
            if (!in_array($contract->statut, ['ACTIF', 'SIGNE', 'signe'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les contrats actifs ou signés peuvent être résiliés.',
                ], 422);
            }

            // Check if termination is already pending
            if ($contract->resiliation_requested_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Une demande de résiliation est déjà en cours.',
                    'data' => [
                        'requested_at' => $contract->resiliation_requested_at,
                        'effective_date' => $contract->resiliation_effective_date,
                        'requested_by' => $contract->resiliation_requested_by,
                    ],
                ], 422);
            }

            $request->validate([
                'motif' => 'required|string|max:500',
            ]);

            // Calculate effective date (3 months from now by default)
            $preavisMonths = $request->input('preavis_months', 3);
            $effectiveDate = now()->addMonths($preavisMonths);

            // Determine user role
            $userRole = $contract->bailleur_id === $user->id ? 'bailleur' : 'locataire';

            // Update contract with termination request
            $contract->update([
                'resiliation_requested_at' => now(),
                'resiliation_requested_by' => $user->id,
                'resiliation_motif' => $request->motif,
                'resiliation_effective_date' => $effectiveDate,
                'preavis_months' => $preavisMonths,
                'statut' => 'EN_PREAVIS',
            ]);

            // Notify the other party
            $otherPartyId = $userRole === 'bailleur' ? $contract->locataire_id : $contract->bailleur_id;
            $otherParty = User::find($otherPartyId);

            if ($otherParty) {
                // Send notification (WhatsApp or in-app)
                try {
                    $this->sendTerminationNotification($contract, $user, $otherParty);
                } catch (Exception $e) {
                    Log::warning('Failed to send termination notification', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('Contract termination requested', [
                'contract_id' => $contract->id,
                'requested_by' => $user->id,
                'user_role' => $userRole,
                'effective_date' => $effectiveDate->format('Y-m-d'),
                'motif' => $request->motif,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Demande de résiliation enregistrée. Le préavis de ' . $preavisMonths . ' mois commence aujourd\'hui.',
                'data' => [
                    'contract' => $contract->fresh(['listing', 'bailleur', 'locataire']),
                    'termination' => [
                        'requested_at' => $contract->resiliation_requested_at,
                        'effective_date' => $effectiveDate->format('Y-m-d'),
                        'preavis_months' => $preavisMonths,
                        'motif' => $request->motif,
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to request contract termination', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Confirm/acknowledge a termination request (by the other party)
     */
    public function confirmTermination(Request $request, string $id): JsonResponse
    {
        try {
            $contract = Contract::find($id);

            if (!$contract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contrat non trouvé',
                ], 404);
            }

            $user = $request->user();

            // Check authorization
            if ($contract->bailleur_id !== $user->id && $contract->locataire_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check if termination was requested
            if (!$contract->resiliation_requested_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune demande de résiliation en cours',
                ], 422);
            }

            // Check that the confirming user is NOT the one who requested
            if ($contract->resiliation_requested_by === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà initié cette demande de résiliation',
                ], 422);
            }

            // Already confirmed
            if ($contract->resiliation_confirmed_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'La résiliation a déjà été confirmée',
                ], 422);
            }

            // Confirm termination
            $contract->update([
                'resiliation_confirmed_at' => now(),
                'resiliation_confirmed_by' => $user->id,
            ]);

            Log::info('Contract termination confirmed', [
                'contract_id' => $contract->id,
                'confirmed_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Résiliation confirmée. Le contrat prendra fin le ' . $contract->resiliation_effective_date->format('d/m/Y'),
                'data' => [
                    'contract' => $contract->fresh(['listing', 'bailleur', 'locataire']),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to confirm contract termination', [
                'error' => $e->getMessage(),
                'contract_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Get termination status for a contract
     */
    public function getTerminationStatus(string $id): JsonResponse
    {
        $contract = Contract::with(['bailleur', 'locataire', 'terminationRequestedBy'])->find($id);

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Contrat non trouvé',
            ], 404);
        }

        $user = request()->user();
        if ($contract->bailleur_id !== $user->id && $contract->locataire_id !== $user->id && !$user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé',
            ], 403);
        }

        $terminationData = null;
        if ($contract->resiliation_requested_at) {
            $daysRemaining = $contract->resiliation_effective_date
                ? now()->diffInDays($contract->resiliation_effective_date, false)
                : null;

            $terminationData = [
                'is_pending' => $contract->isTerminationPending(),
                'is_terminated' => $contract->isTerminated(),
                'requested_at' => $contract->resiliation_requested_at,
                'requested_by' => $contract->terminationRequestedBy,
                'motif' => $contract->resiliation_motif,
                'effective_date' => $contract->resiliation_effective_date,
                'preavis_months' => $contract->preavis_months,
                'days_remaining' => max(0, $daysRemaining),
                'confirmed_at' => $contract->resiliation_confirmed_at,
                'confirmed_by' => $contract->resiliation_confirmed_by,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'has_termination_request' => $contract->resiliation_requested_at !== null,
                'termination' => $terminationData,
            ],
        ]);
    }

    /**
     * Send WhatsApp notification about termination to the other party
     */
    protected function sendTerminationNotification(Contract $contract, User $requestor, User $otherParty): void
    {
        $contract->load('listing');
        $listing = $contract->listing;

        $requestorRole = $contract->bailleur_id === $requestor->id ? 'propriétaire' : 'locataire';
        $otherRole = $requestorRole === 'propriétaire' ? 'locataire' : 'propriétaire';

        $message = "Bonjour {$otherParty->nom_complet},\n\n"
            . "Le {$requestorRole} a demandé la résiliation du contrat pour le bien:\n"
            . "📍 {$listing->titre}\n"
            . "📅 Date de fin effective: {$contract->resiliation_effective_date->format('d/m/Y')}\n"
            . "📋 Motif: {$contract->resiliation_motif}\n\n"
            . "Préavis: {$contract->preavis_months} mois\n\n"
            . "Veuillez vous connecter à ImmoGuinée pour confirmer cette demande.";

        try {
            app(\App\Services\WhatsAppService::class)->sendText(
                $otherParty->telephone,
                $message
            );
        } catch (Exception $e) {
            Log::warning('Failed to send termination WhatsApp', [
                'error' => $e->getMessage(),
                'to' => $otherParty->telephone,
            ]);
        }
    }

    /**
     * Show contract by signature token (public, no auth required)
     */
    public function showByToken(string $token): JsonResponse
    {
        $contract = Contract::where('locataire_signature_token', $token)
            ->with(['listing', 'bailleur:id,nom_complet,telephone', 'locataire:id,nom_complet,telephone'])
            ->first();

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Contrat introuvable ou lien invalide',
            ], 404);
        }

        if (!$contract->verifySignatureToken($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Le lien de signature a expiré. Veuillez demander un nouveau lien.',
            ], 410);
        }

        // Check if already signed by locataire
        if ($contract->locataire_signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Ce contrat a déjà été signé.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'contract' => $contract,
                'can_sign' => true,
                'expires_at' => $contract->locataire_signature_token_expires_at,
            ],
        ]);
    }

    /**
     * Request OTP for signing by token (public, no auth required)
     */
    public function requestOtpByToken(Request $request, string $token): JsonResponse
    {
        $contract = Contract::where('locataire_signature_token', $token)
            ->with(['locataire'])
            ->first();

        if (!$contract || !$contract->verifySignatureToken($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Lien de signature invalide ou expiré',
            ], 404);
        }

        if ($contract->locataire_signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Ce contrat a déjà été signé.',
            ], 400);
        }

        // Generate and send OTP to locataire
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $contract->update([
            'locataire_signature_otp' => bcrypt($otp),
        ]);

        // Send OTP via WhatsApp
        $locataire = $contract->locataire;
        try {
            app(\App\Services\WhatsAppService::class)->sendText(
                $locataire->telephone,
                "🔐 *Code de signature ImmoGuinée*\n\nVotre code de vérification pour signer le contrat est:\n\n*{$otp}*\n\nCe code expire dans 10 minutes."
            );
        } catch (Exception $e) {
            Log::error('Failed to send signature OTP', [
                'error' => $e->getMessage(),
                'contract_id' => $contract->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Code de vérification envoyé par WhatsApp',
            'data' => [
                'phone_masked' => substr($locataire->telephone, 0, 6) . '****' . substr($locataire->telephone, -2),
            ],
        ]);
    }

    /**
     * Sign contract by token (public, no auth required)
     */
    public function signByToken(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'otp' => 'required|string|size:6',
        ]);

        $contract = Contract::where('locataire_signature_token', $token)
            ->with(['locataire', 'bailleur', 'listing'])
            ->first();

        if (!$contract || !$contract->verifySignatureToken($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Lien de signature invalide ou expiré',
            ], 404);
        }

        if ($contract->locataire_signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Ce contrat a déjà été signé.',
            ], 400);
        }

        // Verify OTP
        if (!Hash::check($request->otp, $contract->locataire_signature_otp)) {
            return response()->json([
                'success' => false,
                'message' => 'Code de vérification incorrect',
            ], 422);
        }

        // Sign the contract
        $contract->update([
            'locataire_signed_at' => now(),
            'locataire_signature_ip' => $request->ip(),
            'locataire_signature_data' => json_encode([
                'user_agent' => $request->userAgent(),
                'signed_via' => 'token_link',
                'timestamp' => now()->toIso8601String(),
            ]),
            'locataire_signature_otp' => null, // Clear OTP after use
        ]);

        // Check if both parties have signed
        $bothSigned = $contract->bailleur_signed_at && $contract->locataire_signed_at;

        if ($bothSigned) {
            $contract->update(['statut' => 'ACTIF']);

            // Lock the contract
            $this->signatureService->lockContract($contract);

            // Notify both parties
            $contract->bailleur->notify(new \App\Notifications\ContractSignedNotification($contract));
            $contract->locataire->notify(new \App\Notifications\ContractSignedNotification($contract));
        } else {
            // Update status to pending owner signature
            $contract->update(['statut' => 'EN_ATTENTE_SIGNATURE_BAILLEUR']);
        }

        Log::info('Contract signed via token', [
            'contract_id' => $contract->id,
            'locataire_id' => $contract->locataire_id,
            'both_signed' => $bothSigned,
        ]);

        return response()->json([
            'success' => true,
            'message' => $bothSigned
                ? 'Contrat signé avec succès ! Les deux parties ont signé.'
                : 'Contrat signé avec succès ! En attente de la signature du propriétaire.',
            'data' => [
                'contract_id' => $contract->id,
                'both_signed' => $bothSigned,
                'new_status' => $contract->statut,
            ],
        ]);
    }
}
