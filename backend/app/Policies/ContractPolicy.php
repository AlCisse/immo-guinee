<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContractPolicy
{
    use HandlesAuthorization;

    /**
     * Perform pre-authorization checks.
     * Admins can do everything.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine if the user can view any contracts.
     */
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can list their contracts
    }

    /**
     * Determine if the user can view the contract.
     * Only the bailleur (owner), locataire (tenant), or admin can view.
     */
    public function view(User $user, Contract $contract): bool
    {
        return $this->isParticipant($user, $contract);
    }

    /**
     * Determine if the user can create contracts.
     */
    public function create(User $user): bool
    {
        return true; // Any authenticated user can create a contract
    }

    /**
     * Determine if the user can update the contract.
     * Only the bailleur can update, and only if not signed by both parties.
     */
    public function update(User $user, Contract $contract): bool
    {
        if ($contract->is_locked) {
            return false;
        }

        if ($contract->isFullySigned()) {
            return false;
        }

        return $contract->bailleur_id === $user->id;
    }

    /**
     * Determine if the user can delete the contract.
     * Only the bailleur can delete, and only if not signed by anyone.
     */
    public function delete(User $user, Contract $contract): bool
    {
        if ($contract->is_locked) {
            return false;
        }

        if ($contract->bailleur_signed_at || $contract->locataire_signed_at) {
            return false;
        }

        return $contract->bailleur_id === $user->id;
    }

    /**
     * Determine if the user can download the contract PDF.
     * Only the bailleur, locataire, or admin can download.
     */
    public function download(User $user, Contract $contract): bool
    {
        return $this->isParticipant($user, $contract);
    }

    /**
     * Determine if the user can preview the contract PDF.
     * Only the bailleur, locataire, or admin can preview.
     */
    public function preview(User $user, Contract $contract): bool
    {
        return $this->isParticipant($user, $contract);
    }

    /**
     * Determine if the user can sign the contract.
     */
    public function sign(User $user, Contract $contract): bool
    {
        if ($contract->is_locked) {
            return false;
        }

        // Check if user is a participant
        if (!$this->isParticipant($user, $contract)) {
            return false;
        }

        // Check if user already signed
        if ($contract->bailleur_id === $user->id && $contract->bailleur_signed_at) {
            return false;
        }

        if ($contract->locataire_id === $user->id && $contract->locataire_signed_at) {
            return false;
        }

        return true;
    }

    /**
     * Determine if the user can cancel the contract.
     */
    public function cancel(User $user, Contract $contract): bool
    {
        // If not fully signed, only the bailleur or any party who hasn't signed can cancel
        if (!$contract->isFullySigned()) {
            if ($contract->bailleur_id === $user->id) {
                return true;
            }
            // Locataire can cancel only if they haven't signed yet
            if ($contract->locataire_id === $user->id && !$contract->locataire_signed_at) {
                return true;
            }
            return false;
        }

        // If fully signed, check retraction period (48 hours)
        $signingTime = max(
            $contract->bailleur_signed_at?->timestamp ?? 0,
            $contract->locataire_signed_at?->timestamp ?? 0
        );

        $retractionPeriodEnd = $signingTime + (48 * 3600); // 48 hours

        return time() < $retractionPeriodEnd && $this->isParticipant($user, $contract);
    }

    /**
     * Determine if the user can request termination.
     */
    public function requestTermination(User $user, Contract $contract): bool
    {
        // Can only terminate active/signed contracts
        if (!in_array($contract->statut, ['ACTIF', 'SIGNE', 'signe'])) {
            return false;
        }

        // Cannot request if already requested
        if ($contract->resiliation_requested_at) {
            return false;
        }

        return $this->isParticipant($user, $contract);
    }

    /**
     * Determine if the user can confirm termination.
     */
    public function confirmTermination(User $user, Contract $contract): bool
    {
        // Must have a termination request
        if (!$contract->resiliation_requested_at) {
            return false;
        }

        // Already confirmed
        if ($contract->resiliation_confirmed_at) {
            return false;
        }

        // Must be a participant but NOT the one who requested
        if (!$this->isParticipant($user, $contract)) {
            return false;
        }

        return $contract->resiliation_requested_by !== $user->id;
    }

    /**
     * Check if the user is a participant (bailleur or locataire) of the contract.
     */
    protected function isParticipant(User $user, Contract $contract): bool
    {
        return $contract->bailleur_id === $user->id || $contract->locataire_id === $user->id;
    }
}
