<?php

namespace App\Policies;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ListingPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any listings.
     */
    public function viewAny(?User $user): bool
    {
        // Anyone can view listings (even guests)
        return true;
    }

    /**
     * Determine whether the user can view the listing.
     */
    public function view(?User $user, Listing $listing): bool
    {
        // Anyone can view a listing if it's available
        if ($listing->statut === 'DISPONIBLE') {
            return true;
        }

        // Owner can always view their own listings
        if ($user && $listing->createur_id === $user->id) {
            return true;
        }

        // Admins can view any listing
        if ($user && $user->hasRole('admin')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create listings.
     */
    public function create(User $user): bool
    {
        // User must be active and not banned
        return $user->statut_compte === 'ACTIF';
    }

    /**
     * Determine whether the user can update the listing.
     */
    public function update(User $user, Listing $listing): bool
    {
        // Only owner can update, and only if listing is not LOUE_VENDU
        return $listing->createur_id === $user->id
            && $listing->statut !== 'LOUE_VENDU';
    }

    /**
     * Determine whether the user can delete the listing.
     */
    public function delete(User $user, Listing $listing): bool
    {
        // Only owner can delete, or admin
        return $listing->createur_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can publish the listing.
     */
    public function publish(User $user, Listing $listing): bool
    {
        // Only owner can publish
        return $listing->createur_id === $user->id;
    }

    /**
     * Determine whether the user can apply premium options.
     */
    public function applyPremium(User $user, Listing $listing): bool
    {
        // Only owner can apply premium options
        return $listing->createur_id === $user->id;
    }

    /**
     * Determine whether the user can suspend the listing (admin only).
     */
    public function suspend(User $user, Listing $listing): bool
    {
        return $user->hasRole('admin') || $user->hasRole('moderator');
    }
}
