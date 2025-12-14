<?php

namespace App\Policies;

use App\Models\Insurance;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InsurancePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any insurances.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the insurance.
     */
    public function view(User $user, Insurance $insurance): bool
    {
        // User can view their own insurance or admin
        return $insurance->utilisateur_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can subscribe to insurance.
     */
    public function subscribe(User $user): bool
    {
        // User must be active and verified (at least CNI)
        return $user->statut_compte === 'ACTIF'
            && in_array($user->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE']);
    }

    /**
     * Determine whether the user can make a claim.
     */
    public function claim(User $user, Insurance $insurance): bool
    {
        // User must be the insurance holder and insurance must be active
        return $insurance->utilisateur_id === $user->id
            && $insurance->statut === 'ACTIVE'
            && now() <= $insurance->date_expiration;
    }

    /**
     * Determine whether the user can cancel the insurance.
     */
    public function cancel(User $user, Insurance $insurance): bool
    {
        // User can cancel their own active insurance
        return $insurance->utilisateur_id === $user->id
            && $insurance->statut === 'ACTIVE';
    }

    /**
     * Determine whether the user can download the insurance certificate.
     */
    public function downloadCertificate(User $user, Insurance $insurance): bool
    {
        // User can download their own certificate
        return $insurance->utilisateur_id === $user->id
            && $insurance->statut === 'ACTIVE';
    }
}
