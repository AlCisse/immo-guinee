<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any payments.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the payment.
     */
    public function view(User $user, Payment $payment): bool
    {
        // User can view if they are payer, beneficiary, or admin
        return $payment->payeur_id === $user->id
            || $payment->beneficiaire_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can initiate a payment.
     */
    public function initiate(User $user): bool
    {
        // User must be active and verified
        return $user->statut_compte === 'ACTIF';
    }

    /**
     * Determine whether the user can validate a payment (landlord validation).
     */
    public function validate(User $user, Payment $payment): bool
    {
        // Only beneficiary can validate
        return $payment->beneficiaire_id === $user->id
            && $payment->statut === 'EN_ESCROW';
    }

    /**
     * Determine whether the user can request a refund.
     */
    public function refund(User $user, Payment $payment): bool
    {
        // Payer can request refund if payment failed or in dispute
        if ($payment->payeur_id === $user->id
            && in_array($payment->statut, ['ECHOUE', 'EN_ESCROW'])) {
            return true;
        }

        // Admin can always refund
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can download the quittance (receipt).
     */
    public function downloadQuittance(User $user, Payment $payment): bool
    {
        // User can download if they are payer or beneficiary, and payment is confirmed
        return ($payment->payeur_id === $user->id
                || $payment->beneficiaire_id === $user->id)
            && $payment->statut === 'CONFIRME'
            && $payment->quittance_pdf_url;
    }
}
