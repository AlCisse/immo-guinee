<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Payment;
use App\Models\Contract;
use App\Repositories\PaymentRepository;
use App\Services\OrangeMoneyService;
use App\Services\MtnMomoService;
use App\Services\CommissionCalculatorService;
use App\Services\EscrowService;
use App\Services\QuittanceService;
use App\Events\PaymentStatusUpdated;
use App\Notifications\PaymentConfirmedNotification;
use App\Jobs\ProcessPaymentConfirmationJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class PaymentController extends Controller
{
    protected $paymentRepository;
    protected $orangeMoneyService;
    protected $mtnMomoService;
    protected $commissionCalculator;
    protected $escrowService;
    protected $quittanceService;

    public function __construct(
        PaymentRepository $paymentRepository,
        OrangeMoneyService $orangeMoneyService,
        MtnMomoService $mtnMomoService,
        CommissionCalculatorService $commissionCalculator,
        EscrowService $escrowService,
        QuittanceService $quittanceService
    ) {
        $this->paymentRepository = $paymentRepository;
        $this->orangeMoneyService = $orangeMoneyService;
        $this->mtnMomoService = $mtnMomoService;
        $this->commissionCalculator = $commissionCalculator;
        $this->escrowService = $escrowService;
        $this->quittanceService = $quittanceService;
    }

    /**
     * Get all payments for authenticated user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $payments = $this->paymentRepository->getUserPayments($userId);

            return response()->json([
                'success' => true,
                'data' => [
                    'payments' => $payments,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get payments', [
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
     * Create a new payment
     *
     * @param StorePaymentRequest $request
     * @return JsonResponse
     */
    public function store(StorePaymentRequest $request): JsonResponse
    {
        try {
            $contract = Contract::findOrFail($request->contrat_id);

            // Check if user is the locataire
            if ($contract->locataire_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check if contract is signed
            if ($contract->statut !== 'signe' && $contract->statut !== 'actif') {
                return response()->json([
                    'success' => false,
                    'message' => 'Le contrat doit être signé avant de pouvoir payer',
                ], 422);
            }

            // Calculate amounts
            $montantLoyer = $request->montant_loyer;
            $montantCaution = $request->montant_caution ?? 0;
            $montantFraisService = $this->paymentRepository->calculateCommission($montantLoyer, $contract->type_contrat);
            $montantTotal = $montantLoyer + $montantCaution + $montantFraisService;

            $data = [
                'contrat_id' => $contract->id,
                'payeur_id' => $request->user()->id,
                'beneficiaire_id' => $contract->proprietaire_id,
                'reference_paiement' => 'PAY-' . strtoupper(uniqid()),
                'montant_loyer' => $montantLoyer,
                'montant_caution' => $montantCaution,
                'montant_frais_service' => $montantFraisService,
                'montant_total' => $montantTotal,
                'methode_paiement' => $request->methode_paiement,
                'statut_paiement' => 'en_attente',
            ];

            $payment = $this->paymentRepository->create($data);

            // Process payment based on method
            $paymentResult = $this->processPayment($payment, $request);

            if (!$paymentResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $paymentResult['message'],
                ], 422);
            }

            // Update payment with external reference
            if (isset($paymentResult['reference_id'])) {
                $payment->update([
                    'reference_externe' => $paymentResult['reference_id'],
                    'statut_paiement' => 'en_cours',
                ]);
            }

            Log::info('Payment initiated', [
                'payment_id' => $payment->id,
                'method' => $request->methode_paiement,
                'amount' => $montantTotal,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Paiement initié avec succès',
                'data' => [
                    'payment' => $payment,
                    'payment_url' => $paymentResult['payment_url'] ?? null,
                ],
            ], 201);

        } catch (Exception $e) {
            Log::error('Failed to create payment', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors du paiement',
            ], 500);
        }
    }

    /**
     * Get a single payment
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $payment = $this->paymentRepository->findById($id);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paiement introuvable',
                ], 404);
            }

            // Check if user is part of payment
            $userId = $request->user()->id;
            if ($payment->payeur_id !== $userId && $payment->beneficiaire_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment' => $payment->load(['contrat', 'payeur', 'beneficiaire']),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get payment', [
                'error' => $e->getMessage(),
                'payment_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Check payment status
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function checkStatus(Request $request, int $id): JsonResponse
    {
        try {
            $payment = $this->paymentRepository->findById($id);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paiement introuvable',
                ], 404);
            }

            // Check status from payment provider
            if ($payment->methode_paiement === 'orange_money') {
                $result = $this->orangeMoneyService->checkPaymentStatus($payment->reference_externe);
            } elseif ($payment->methode_paiement === 'mtn_momo') {
                $result = $this->mtnMomoService->checkPaymentStatus($payment->reference_externe);
            } else {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment' => $payment,
                    ],
                ]);
            }

            // Update payment status
            if ($result['success'] && $result['status'] === 'SUCCESSFUL') {
                $this->paymentRepository->updateStatus($id, 'escrow');
                $payment->refresh();

                // Broadcast event
                event(new PaymentStatusUpdated($payment));
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment' => $payment,
                    'provider_status' => $result,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to check payment status', [
                'error' => $e->getMessage(),
                'payment_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Process payment based on method
     */
    protected function processPayment(Payment $payment, Request $request): array
    {
        try {
            switch ($payment->methode_paiement) {
                case 'orange_money':
                    return $this->processOrangeMoney($payment, $request);

                case 'mtn_momo':
                    return $this->processMtnMomo($payment, $request);

                case 'virement':
                case 'especes':
                case 'cheque':
                    return [
                        'success' => true,
                        'message' => 'Paiement en attente de confirmation',
                    ];

                default:
                    return [
                        'success' => false,
                        'message' => 'Méthode de paiement non supportée',
                    ];
            }
        } catch (Exception $e) {
            Log::error('Payment processing failed', [
                'payment_id' => $payment->id,
                'method' => $payment->methode_paiement,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors du traitement du paiement',
            ];
        }
    }

    /**
     * Process Orange Money payment
     */
    protected function processOrangeMoney(Payment $payment, Request $request): array
    {
        $result = $this->orangeMoneyService->initiatePayment([
            'order_id' => $payment->reference_paiement,
            'amount' => $payment->montant_total,
            'reference' => $payment->reference_paiement,
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'reference_id' => $result['pay_token'],
                'payment_url' => $result['payment_url'],
            ];
        }

        return [
            'success' => false,
            'message' => 'Échec de l\'initiation du paiement Orange Money',
        ];
    }

    /**
     * Process MTN Mobile Money payment
     */
    protected function processMtnMomo(Payment $payment, Request $request): array
    {
        $result = $this->mtnMomoService->requestToPay([
            'amount' => $payment->montant_total,
            'external_id' => $payment->reference_paiement,
            'phone_number' => $request->numero_telephone,
            'payer_message' => 'Paiement ImmoGuinée',
            'reference' => $payment->reference_paiement,
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'reference_id' => $result['reference_id'],
            ];
        }

        return [
            'success' => false,
            'message' => 'Échec de l\'initiation du paiement MTN MoMo',
        ];
    }

    /**
     * T147: Initiate payment with invoice breakdown (FR-043 step 1-3)
     */
    public function initiate(Request $request): JsonResponse
    {
        $request->validate([
            'contract_id' => 'required|uuid|exists:contracts,id',
        ]);

        try {
            $contract = Contract::with(['locataire', 'proprietaire', 'listing'])
                ->findOrFail($request->contract_id);

            // Check authorization
            if ($contract->locataire_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check contract status
            if (!in_array($contract->statut, ['signe', 'actif'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le contrat doit être signé avant le paiement',
                ], 422);
            }

            // Get invoice breakdown with commission (FR-041)
            $breakdown = $this->commissionCalculator->getInvoiceBreakdown(
                $contract,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'contract' => [
                        'id' => $contract->id,
                        'reference' => $contract->reference,
                        'type' => $contract->type_contrat,
                        'listing' => [
                            'titre' => $contract->listing->titre ?? 'N/A',
                            'quartier' => $contract->listing->quartier ?? 'N/A',
                        ],
                        'proprietaire' => [
                            'nom' => $contract->proprietaire->nom_complet,
                        ],
                    ],
                    'invoice' => $breakdown,
                    'payment_methods' => [
                        [
                            'id' => 'orange_money',
                            'name' => 'Orange Money',
                            'icon' => 'orange-money',
                            'available' => true,
                        ],
                        [
                            'id' => 'mtn_momo',
                            'name' => 'MTN Mobile Money',
                            'icon' => 'mtn-momo',
                            'available' => true,
                        ],
                        [
                            'id' => 'especes',
                            'name' => 'Espèces (rendez-vous)',
                            'icon' => 'cash',
                            'available' => true,
                        ],
                    ],
                    'transparency_notice' => 'La commission plateforme n\'est pas remboursable (FR-042)',
                ],
            ]);
        } catch (Exception $e) {
            Log::error('Payment initiation failed', [
                'error' => $e->getMessage(),
                'contract_id' => $request->contract_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * T152: Landlord validates payment to release from escrow (FR-044)
     */
    public function validateByLandlord(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'validated' => 'required|boolean',
            'note' => 'nullable|string|max:500',
        ]);

        try {
            $payment = Payment::with('contrat')->findOrFail($id);

            // Check authorization - only landlord can validate
            if ($payment->beneficiaire_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seul le propriétaire peut valider ce paiement',
                ], 403);
            }

            // Check payment status
            if ($payment->statut_paiement !== 'escrow') {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce paiement n\'est pas en escrow',
                ], 422);
            }

            DB::beginTransaction();

            if ($request->validated) {
                // Release funds to landlord
                $releaseResult = $this->escrowService->releaseFunds($payment);

                if ($releaseResult['success']) {
                    $payment->update([
                        'statut_paiement' => 'confirme',
                        'date_validation_proprietaire' => now(),
                        'note_validation' => $request->note,
                    ]);

                    // Generate quittance (FR-046)
                    $quittance = $this->quittanceService->generate($payment);
                    $payment->update(['quittance_url' => $quittance['url']]);

                    // Dispatch notification job
                    ProcessPaymentConfirmationJob::dispatch($payment);

                    event(new PaymentStatusUpdated($payment));
                }
            } else {
                // Landlord rejects - initiate dispute
                $payment->update([
                    'statut_paiement' => 'litige',
                    'note_validation' => $request->note,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $request->validated
                    ? 'Paiement validé et fonds libérés'
                    : 'Paiement contesté - un litige a été ouvert',
                'data' => [
                    'payment' => $payment->fresh(),
                ],
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Payment validation failed', [
                'error' => $e->getMessage(),
                'payment_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * T157: Refund payment (FR-049)
     */
    public function refund(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:500',
            'amount' => 'nullable|integer|min:0',
        ]);

        try {
            $payment = Payment::findOrFail($id);

            // Check authorization - only admin or involved parties can refund
            $user = $request->user();
            $isAdmin = $user->hasRole('admin');
            $isInvolved = in_array($user->id, [$payment->payeur_id, $payment->beneficiaire_id]);

            if (!$isAdmin && !$isInvolved) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Check if payment can be refunded
            if (!in_array($payment->statut_paiement, ['escrow', 'confirme', 'litige'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce paiement ne peut pas être remboursé',
                ], 422);
            }

            // Calculate refund amount (excluding non-refundable commission FR-042)
            $refundAmount = $request->amount ?? ($payment->montant_loyer + $payment->montant_caution);
            // Commission is NEVER refunded

            DB::beginTransaction();

            // Process refund through payment provider
            $refundResult = $this->processRefund($payment, $refundAmount);

            if ($refundResult['success']) {
                $payment->update([
                    'statut_paiement' => 'rembourse',
                    'montant_rembourse' => $refundAmount,
                    'date_remboursement' => now(),
                    'motif_remboursement' => $request->reason,
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Remboursement effectué',
                    'data' => [
                        'payment' => $payment->fresh(),
                        'refund_amount' => $refundAmount,
                        'commission_retained' => $payment->montant_frais_service,
                    ],
                ]);
            }

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Échec du remboursement',
            ], 422);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Refund failed', [
                'error' => $e->getMessage(),
                'payment_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * T158: Record cash payment (FR-052)
     */
    public function cashPayment(Request $request): JsonResponse
    {
        $request->validate([
            'contract_id' => 'required|uuid|exists:contracts,id',
            'amount_received' => 'required|integer|min:1',
            'received_by' => 'required|in:proprietaire,plateforme',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $contract = Contract::findOrFail($request->contract_id);

            // Check authorization
            $user = $request->user();
            $isProprietaire = $contract->proprietaire_id === $user->id;
            $isAdmin = $user->hasRole('admin');

            if (!$isProprietaire && !$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non autorisé',
                ], 403);
            }

            // Get expected amounts
            $breakdown = $this->commissionCalculator->getInvoiceBreakdown($contract);
            $expectedTotal = $breakdown['total']['amount'];

            if ($request->amount_received < $expectedTotal) {
                return response()->json([
                    'success' => false,
                    'message' => "Montant insuffisant. Attendu: {$breakdown['total']['formatted']}",
                    'data' => [
                        'expected' => $expectedTotal,
                        'received' => $request->amount_received,
                    ],
                ], 422);
            }

            DB::beginTransaction();

            // Create payment record for cash
            $payment = Payment::create([
                'contrat_id' => $contract->id,
                'payeur_id' => $contract->locataire_id,
                'beneficiaire_id' => $contract->proprietaire_id,
                'reference_paiement' => 'PAY-CASH-' . strtoupper(uniqid()),
                'montant_loyer' => $breakdown['sections'][1]['amount'] ?? 0,
                'montant_caution' => $breakdown['sections'][0]['amount'] ?? 0,
                'montant_frais_service' => $breakdown['pour_plateforme']['amount'],
                'montant_total' => $request->amount_received,
                'methode_paiement' => 'especes',
                'statut_paiement' => 'confirme',
                'date_validation_proprietaire' => now(),
                'note_validation' => $request->notes ?? 'Paiement en espèces',
            ]);

            // If received by proprietaire, platform commission needs to be collected separately
            if ($request->received_by === 'proprietaire') {
                $payment->update([
                    'commission_collectee' => false,
                    'note_validation' => ($request->notes ?? '') . ' - Commission à collecter',
                ]);
            } else {
                $payment->update(['commission_collectee' => true]);
            }

            // Generate quittance
            $quittance = $this->quittanceService->generate($payment);
            $payment->update(['quittance_url' => $quittance['url']]);

            // Update contract status
            $contract->update(['statut' => 'actif']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Paiement en espèces enregistré',
                'data' => [
                    'payment' => $payment,
                    'quittance_url' => $quittance['url'],
                    'commission_status' => $request->received_by === 'proprietaire'
                        ? 'À collecter: ' . $breakdown['pour_plateforme']['formatted']
                        : 'Collectée',
                ],
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Cash payment recording failed', [
                'error' => $e->getMessage(),
                'contract_id' => $request->contract_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Process refund through payment provider
     */
    protected function processRefund(Payment $payment, int $amount): array
    {
        try {
            switch ($payment->methode_paiement) {
                case 'orange_money':
                    return $this->orangeMoneyService->refund(
                        $payment->reference_externe,
                        $amount
                    );

                case 'mtn_momo':
                    return $this->mtnMomoService->refund(
                        $payment->reference_externe,
                        $amount
                    );

                case 'especes':
                case 'virement':
                    // Manual refund - just mark as refunded
                    return ['success' => true, 'manual' => true];

                default:
                    return ['success' => false, 'message' => 'Méthode non supportée'];
            }
        } catch (Exception $e) {
            Log::error('Refund processing failed', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
