<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EscrowService
{
    /**
     * Place payment in escrow
     */
    public function placeInEscrow(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            // Update payment status
            $payment->update([
                'statut' => 'EN_ESCROW',
                'date_confirmation' => now(),
            ]);

            // Set expiration timer (48 hours)
            $this->setEscrowTimer($payment->id, 48);

            // Log escrow placement
            activity()
                ->performedOn($payment)
                ->log('Payment placed in escrow');
        });
    }

    /**
     * Release payment from escrow to beneficiary
     */
    public function releaseFromEscrow(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            // Collect platform commission first
            $this->collectCommission($payment);

            // Release to beneficiary
            $payment->update([
                'statut' => 'CONFIRME',
                'date_deblocage_escrow' => now(),
            ]);

            // Clear escrow timer
            $this->clearEscrowTimer($payment->id);

            // Log release
            activity()
                ->performedOn($payment)
                ->log('Payment released from escrow to beneficiary');
        });
    }

    /**
     * Collect platform commission before releasing payment
     */
    private function collectCommission(Payment $payment): void
    {
        // Update commission status
        $payment->update([
            'statut' => 'COMMISSION_COLLECTEE',
        ]);

        // Here you would integrate with actual payment gateway
        // to transfer commission to platform account
        // For now, just log it
        activity()
            ->performedOn($payment)
            ->withProperties([
                'commission_gnf' => $payment->commission_plateforme_gnf,
            ])
            ->log('Platform commission collected');
    }

    /**
     * Set escrow timer using Redis
     */
    private function setEscrowTimer(string $paymentId, int $hours): void
    {
        $expiresAt = now()->addHours($hours);

        Cache::put(
            "escrow_timer:{$paymentId}",
            $expiresAt->toIso8601String(),
            $expiresAt
        );
    }

    /**
     * Clear escrow timer
     */
    private function clearEscrowTimer(string $paymentId): void
    {
        Cache::forget("escrow_timer:{$paymentId}");
    }

    /**
     * Check if escrow has expired (48h timeout)
     */
    public function hasExpired(Payment $payment): bool
    {
        if ($payment->statut !== 'EN_ESCROW') {
            return false;
        }

        $timerValue = Cache::get("escrow_timer:{$payment->id}");

        if (!$timerValue) {
            // Fallback to date_confirmation
            return $payment->date_confirmation
                && $payment->date_confirmation->diffInHours(now()) >= 48;
        }

        return now()->greaterThan($timerValue);
    }

    /**
     * Auto-release expired escrow payments
     */
    public function autoReleaseExpired(Payment $payment): void
    {
        if ($this->hasExpired($payment)) {
            $this->releaseFromEscrow($payment);

            // Notify both parties
            activity()
                ->performedOn($payment)
                ->log('Payment auto-released after 48h escrow timeout');
        }
    }

    /**
     * Refund payment from escrow (in case of dispute)
     */
    public function refundFromEscrow(Payment $payment, string $reason): void
    {
        DB::transaction(function () use ($payment, $reason) {
            $payment->update([
                'statut' => 'REMBOURSE',
                'date_deblocage_escrow' => now(),
            ]);

            // Clear escrow timer
            $this->clearEscrowTimer($payment->id);

            // Log refund
            activity()
                ->performedOn($payment)
                ->withProperties(['reason' => $reason])
                ->log('Payment refunded from escrow');
        });
    }

    /**
     * Release funds to landlord (alias for releaseFromEscrow with return value)
     * Used by PaymentController::validateByLandlord
     */
    public function releaseFunds(Payment $payment): array
    {
        try {
            $this->releaseFromEscrow($payment);

            return [
                'success' => true,
                'message' => 'Fonds libérés avec succès',
                'released_at' => now()->toISOString(),
                'amount' => $payment->montant_loyer + $payment->montant_caution,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get escrow status for a payment
     */
    public function getEscrowStatus(Payment $payment): array
    {
        $timerValue = Cache::get("escrow_timer:{$payment->id}");
        $expiresAt = $timerValue ? new \DateTime($timerValue) : null;

        return [
            'in_escrow' => $payment->statut_paiement === 'escrow' || $payment->statut === 'EN_ESCROW',
            'expires_at' => $expiresAt?->format('c'),
            'hours_remaining' => $expiresAt ? max(0, now()->diffInHours($expiresAt, false)) : null,
            'is_expired' => $this->hasExpired($payment),
            'can_be_released' => $payment->statut_paiement === 'escrow',
        ];
    }

    /**
     * Get all payments currently in escrow
     */
    public function getPaymentsInEscrow(): \Illuminate\Database\Eloquent\Collection
    {
        return Payment::whereIn('statut_paiement', ['escrow', 'EN_ESCROW'])
            ->with(['contrat', 'payeur', 'beneficiaire'])
            ->orderBy('created_at', 'asc')
            ->get();
    }
}
