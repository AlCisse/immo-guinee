<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AdminPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view analytics dashboard.
     */
    public function viewAnalytics(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can moderate content.
     */
    public function moderateContent(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('moderator');
    }

    /**
     * Determine whether the user can manage users.
     */
    public function manageUsers(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can suspend users.
     */
    public function suspendUser(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can ban users.
     */
    public function banUser(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can verify certification documents.
     */
    public function verifyCertifications(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('moderator');
    }

    /**
     * Determine whether the user can assign mediators to disputes.
     */
    public function assignMediators(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can view audit logs.
     */
    public function viewAuditLogs(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can manage site configuration.
     */
    public function manageConfiguration(User $user): bool
    {
        return $user->hasRole('admin');
    }
}
