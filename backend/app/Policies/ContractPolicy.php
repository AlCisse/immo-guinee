<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContractPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any contracts.
     */
    public function viewAny(User $user): bool
    {
        // User can view their own contracts
        return true;
    }

    /**
     * Determine whether the user can view the contract.
     */
    public function view(User $user, Contract $contract): bool
    {
        // User can view if they are landlord or tenant
        return $contract->proprietaire_id === $user->id
            || $contract->locataire_acheteur_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can create contracts.
     */
    public function create(User $user): bool
    {
        // User must be active
        return $user->statut_compte === 'ACTIF';
    }

    /**
     * Determine whether the user can sign the contract.
     */
    public function sign(User $user, Contract $contract): bool
    {
        // User must be one of the parties
        if ($contract->proprietaire_id !== $user->id && $contract->locataire_acheteur_id !== $user->id) {
            return false;
        }

        // Contract must be in signing status
        if (!in_array($contract->statut, ['EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE'])) {
            return false;
        }

        // Check if user already signed
        $signatures = $contract->signatures ?? [];
        foreach ($signatures as $signature) {
            if ($signature['user_id'] === $user->id) {
                return false; // Already signed
            }
        }

        return true;
    }

    /**
     * Determine whether the user can cancel the contract.
     */
    public function cancel(User $user, Contract $contract): bool
    {
        // Can cancel during retraction period (48h)
        if ($contract->delai_retractation_expire && now() < $contract->delai_retractation_expire) {
            return $contract->proprietaire_id === $user->id
                || $contract->locataire_acheteur_id === $user->id;
        }

        // Can cancel if not signed
        if ($contract->statut === 'BROUILLON' || $contract->statut === 'EN_ATTENTE_SIGNATURE') {
            return $contract->proprietaire_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can download the contract.
     */
    public function download(User $user, Contract $contract): bool
    {
        // User can download if they are landlord or tenant, and contract is signed
        return ($contract->proprietaire_id === $user->id
                || $contract->locataire_acheteur_id === $user->id)
            && $contract->statut === 'SIGNE_ARCHIVE';
    }
}
