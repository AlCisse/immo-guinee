<?php

namespace App\Policies;

use App\Models\Dispute;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DisputePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any disputes.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the dispute.
     */
    public function view(User $user, Dispute $dispute): bool
    {
        // User can view if they are demandeur, defendeur, mediator, or admin
        return $dispute->demandeur_id === $user->id
            || $dispute->defendeur_id === $user->id
            || $dispute->mediateur_assigne_id === $user->id
            || $user->hasRole('admin')
            || $user->hasRole('mediator');
    }

    /**
     * Determine whether the user can create a dispute.
     */
    public function create(User $user): bool
    {
        // User must be active and have completed at least one transaction
        return $user->is_active && !$user->is_suspended
            && $user->total_transactions > 0;
    }

    /**
     * Determine whether the user can assign a mediator to the dispute.
     */
    public function assignMediator(User $user, Dispute $dispute): bool
    {
        // Only admin can assign mediator
        return $user->hasRole('admin') && $dispute->statut === 'OUVERT';
    }

    /**
     * Determine whether the user can resolve the dispute.
     */
    public function resolve(User $user, Dispute $dispute): bool
    {
        // Mediator or admin can resolve
        return ($dispute->mediateur_assigne_id === $user->id
                || $user->hasRole('admin'))
            && in_array($dispute->statut, ['EN_COURS', 'OUVERT']);
    }

    /**
     * Determine whether the user can escalate the dispute.
     */
    public function escalate(User $user, Dispute $dispute): bool
    {
        // Demandeur or defendeur can escalate if resolution failed
        return ($dispute->demandeur_id === $user->id
                || $dispute->defendeur_id === $user->id)
            && $dispute->statut === 'ECHOUE_ESCALADE';
    }
}
