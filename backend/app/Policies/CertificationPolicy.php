<?php

namespace App\Policies;

use App\Models\CertificationDocument;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CertificationPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any certification documents.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the certification document.
     */
    public function view(User $user, CertificationDocument $document): bool
    {
        // User can view their own documents or admin can view any
        return $document->utilisateur_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can upload certification documents.
     */
    public function upload(User $user): bool
    {
        // User must be active
        return $user->is_active && !$user->is_suspended;
    }

    /**
     * Determine whether the user can verify a certification document.
     */
    public function verify(User $user, CertificationDocument $document): bool
    {
        // Only admin can verify documents
        return $user->hasRole('admin') && $document->statut_verification === 'EN_ATTENTE';
    }

    /**
     * Determine whether the user can delete the certification document.
     */
    public function delete(User $user, CertificationDocument $document): bool
    {
        // User can delete their own documents if not verified
        if ($document->utilisateur_id === $user->id
            && $document->statut_verification !== 'APPROUVE') {
            return true;
        }

        // Admin can always delete
        return $user->hasRole('admin');
    }
}
