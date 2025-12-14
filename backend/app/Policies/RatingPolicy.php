<?php

namespace App\Policies;

use App\Models\Rating;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RatingPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any ratings.
     */
    public function viewAny(?User $user): bool
    {
        // Anyone can view ratings (they are public)
        return true;
    }

    /**
     * Determine whether the user can view the rating.
     */
    public function view(?User $user, Rating $rating): bool
    {
        // Ratings are public if approved
        if ($rating->statut_moderation === 'APPROUVE') {
            return true;
        }

        // User can view their own rating
        if ($user && $rating->evaluateur_id === $user->id) {
            return true;
        }

        // Admin can view any rating
        if ($user && $user->hasRole('admin')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create a rating.
     */
    public function create(User $user, Transaction $transaction): bool
    {
        // Transaction must be completed
        if ($transaction->statut !== 'COMPLETEE') {
            return false;
        }

        // User must be one of the parties
        if ($transaction->proprietaire_id !== $user->id
            && $transaction->locataire_acheteur_id !== $user->id) {
            return false;
        }

        // Check if user already rated this transaction
        $existingRating = Rating::where('transaction_id', $transaction->id)
            ->where('evaluateur_id', $user->id)
            ->exists();

        return !$existingRating;
    }

    /**
     * Determine whether the user can moderate a rating (admin only).
     */
    public function moderate(User $user, Rating $rating): bool
    {
        return $user->hasRole('admin') || $user->hasRole('moderator');
    }

    /**
     * Determine whether the user can delete the rating.
     */
    public function delete(User $user, Rating $rating): bool
    {
        // User can delete their own rating within 24h if not yet approved
        if ($rating->evaluateur_id === $user->id
            && $rating->statut_moderation !== 'APPROUVE'
            && $rating->date_creation->diffInHours(now()) <= 24) {
            return true;
        }

        // Admin can always delete
        return $user->hasRole('admin');
    }
}
