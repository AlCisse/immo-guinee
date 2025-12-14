<?php

namespace App\Repositories;

use App\Models\Payment;
use App\Models\User;
use App\Models\Contract;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentRepository
{
    /**
     * Find payment by ID
     *
     * @param string $id
     * @return Payment|null
     */
    public function findById(string $id): ?Payment
    {
        return Payment::with(['contract', 'payer', 'receiver'])->find($id);
    }

    /**
     * Find payment by reference
     *
     * @param string $reference
     * @return Payment|null
     */
    public function findByReference(string $reference): ?Payment
    {
        return Payment::where('reference_paiement', $reference)->first();
    }

    /**
     * Create a new payment
     *
     * @param array $data
     * @return Payment
     */
    public function create(array $data): Payment
    {
        // Generate reference if not provided
        if (!isset($data['reference_paiement'])) {
            $data['reference_paiement'] = $this->generateReference();
        }

        return Payment::create($data);
    }

    /**
     * Update payment
     *
     * @param Payment $payment
     * @param array $data
     * @return Payment
     */
    public function update(Payment $payment, array $data): Payment
    {
        $payment->update($data);
        return $payment->fresh();
    }

    /**
     * Get payments by user (sent)
     *
     * @param User $user
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByPayer(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::where('payeur_id', $user->id)
            ->with(['contract', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get payments by user (received)
     *
     * @param User $user
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByReceiver(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::where('beneficiaire_id', $user->id)
            ->with(['contract', 'payer'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get payments by contract
     *
     * @param Contract $contract
     * @return Collection
     */
    public function getByContract(Contract $contract): Collection
    {
        return Payment::where('contract_id', $contract->id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get payments by status
     *
     * @param string $status
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByStatus(string $status, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::where('statut', $status)
            ->with(['contract', 'payer', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get payments in escrow
     *
     * @return Collection
     */
    public function getInEscrow(): Collection
    {
        return Payment::where('statut', 'en_escrow')
            ->with(['contract', 'payer', 'receiver'])
            ->get();
    }

    /**
     * Get expired escrow payments (> 48h)
     *
     * @return Collection
     */
    public function getExpiredEscrow(): Collection
    {
        return Payment::where('statut', 'en_escrow')
            ->where('escrow_expires_at', '<', now())
            ->get();
    }

    /**
     * Confirm payment (change status to completed)
     *
     * @param Payment $payment
     * @param string|null $transactionId
     * @return Payment
     */
    public function confirmPayment(Payment $payment, string $transactionId = null): Payment
    {
        $payment->statut = 'complete';
        $payment->date_validation = now();

        if ($transactionId) {
            $payment->transaction_externe_id = $transactionId;
        }

        $payment->save();
        return $payment;
    }

    /**
     * Place payment in escrow
     *
     * @param Payment $payment
     * @param int $hoursUntilExpiry
     * @return Payment
     */
    public function placeInEscrow(Payment $payment, int $hoursUntilExpiry = 48): Payment
    {
        $payment->statut = 'en_escrow';
        $payment->escrow_started_at = now();
        $payment->escrow_expires_at = now()->addHours($hoursUntilExpiry);
        $payment->save();
        return $payment;
    }

    /**
     * Release payment from escrow
     *
     * @param Payment $payment
     * @return Payment
     */
    public function releaseFromEscrow(Payment $payment): Payment
    {
        $payment->statut = 'complete';
        $payment->escrow_released_at = now();
        $payment->date_validation = now();
        $payment->save();
        return $payment;
    }

    /**
     * Fail payment
     *
     * @param Payment $payment
     * @param string|null $reason
     * @return Payment
     */
    public function failPayment(Payment $payment, string $reason = null): Payment
    {
        $payment->statut = 'echoue';
        $payment->failure_reason = $reason;
        $payment->save();
        return $payment;
    }

    /**
     * Refund payment
     *
     * @param Payment $payment
     * @param string|null $reason
     * @return Payment
     */
    public function refundPayment(Payment $payment, string $reason = null): Payment
    {
        $payment->statut = 'rembourse';
        $payment->refund_reason = $reason;
        $payment->refunded_at = now();
        $payment->save();
        return $payment;
    }

    /**
     * Calculate commission amount
     *
     * @param float $amount
     * @param string $commissionType
     * @return float
     */
    public function calculateCommission(float $amount, string $commissionType = 'location'): float
    {
        $rates = [
            'location' => 0.50,      // 50% d'un mois de loyer
            'vente_terrain' => 0.01, // 1%
            'vente_maison' => 0.02,  // 2%
        ];

        $rate = $rates[$commissionType] ?? 0.50;
        return round($amount * $rate, 2);
    }

    /**
     * Generate payment reference
     *
     * @return string
     */
    public function generateReference(): string
    {
        $prefix = 'PAY';
        $timestamp = time();
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));

        return "{$prefix}-{$timestamp}-{$random}";
    }

    /**
     * Get payment statistics for user
     *
     * @param User $user
     * @return array
     */
    public function getUserStatistics(User $user): array
    {
        return [
            'total_sent' => Payment::where('payeur_id', $user->id)
                ->where('statut', 'complete')
                ->sum('montant_total'),
            'total_received' => Payment::where('beneficiaire_id', $user->id)
                ->where('statut', 'complete')
                ->sum('montant_total'),
            'pending_count' => Payment::where(function($q) use ($user) {
                    $q->where('payeur_id', $user->id)
                      ->orWhere('beneficiaire_id', $user->id);
                })
                ->where('statut', 'en_attente')
                ->count(),
            'in_escrow_count' => Payment::where(function($q) use ($user) {
                    $q->where('payeur_id', $user->id)
                      ->orWhere('beneficiaire_id', $user->id);
                })
                ->where('statut', 'en_escrow')
                ->count(),
        ];
    }

    /**
     * Get global payment statistics
     *
     * @return array
     */
    public function getGlobalStatistics(): array
    {
        return [
            'total_transactions' => Payment::where('statut', 'complete')->count(),
            'total_volume' => Payment::where('statut', 'complete')->sum('montant_total'),
            'total_commissions' => Payment::where('statut', 'complete')->sum('montant_commission'),
            'pending_volume' => Payment::where('statut', 'en_attente')->sum('montant_total'),
            'escrow_volume' => Payment::where('statut', 'en_escrow')->sum('montant_total'),
            'failed_count' => Payment::where('statut', 'echoue')->count(),
            'refunded_count' => Payment::where('statut', 'rembourse')->count(),
        ];
    }

    /**
     * Get payments by method
     *
     * @param string $method
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByMethod(string $method, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::where('methode_paiement', $method)
            ->with(['contract', 'payer', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get payments requiring validation
     *
     * @return Collection
     */
    public function getRequiringValidation(): Collection
    {
        return Payment::where('statut', 'en_attente')
            ->where('methode_paiement', 'especes')
            ->with(['contract', 'payer', 'receiver'])
            ->get();
    }

    /**
     * Export payments to CSV format
     *
     * @param array $filters
     * @return array
     */
    public function exportToArray(array $filters = []): array
    {
        $query = Payment::query()->with(['contract', 'payer', 'receiver']);

        // Apply filters
        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['statut'])) {
            $query->where('statut', $filters['statut']);
        }

        if (isset($filters['methode_paiement'])) {
            $query->where('methode_paiement', $filters['methode_paiement']);
        }

        return $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function($payment) {
                return [
                    'reference' => $payment->reference_paiement,
                    'date' => $payment->created_at->format('Y-m-d H:i:s'),
                    'payeur' => $payment->payer->nom . ' ' . $payment->payer->prenom,
                    'beneficiaire' => $payment->receiver->nom . ' ' . $payment->receiver->prenom,
                    'montant_loyer' => $payment->montant_loyer,
                    'montant_caution' => $payment->montant_caution,
                    'montant_commission' => $payment->montant_commission,
                    'montant_total' => $payment->montant_total,
                    'methode' => $payment->methode_paiement,
                    'statut' => $payment->statut,
                ];
            })
            ->toArray();
    }
}
