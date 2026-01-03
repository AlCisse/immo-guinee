<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UserRepository
{
    /**
     * Find user by ID
     *
     * @param string $id
     * @return User|null
     */
    public function findById(string $id): ?User
    {
        return User::find($id);
    }

    /**
     * Find user by phone number
     *
     * @param string $phoneNumber
     * @return User|null
     */
    public function findByPhone(string $phoneNumber): ?User
    {
        return User::where('telephone', $phoneNumber)->first();
    }

    /**
     * Find user by email
     *
     * @param string $email
     * @return User|null
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * Create a new user
     *
     * @param array $data
     * @return User
     */
    public function create(array $data): User
    {
        // Hash password if provided
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // Set default values
        $data['badge'] = $data['badge'] ?? 'bronze';
        $data['type_compte'] = $data['type_compte'] ?? 'particulier';
        $data['statut_verification'] = $data['statut_verification'] ?? 'non_verifie';

        return User::create($data);
    }

    /**
     * Update user
     *
     * @param User $user
     * @param array $data
     * @return User
     */
    public function update(User $user, array $data): User
    {
        // Hash password if provided
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        return $user->fresh();
    }

    /**
     * Delete user
     *
     * @param User $user
     * @return bool
     */
    public function delete(User $user): bool
    {
        return $user->delete();
    }

    /**
     * Get all users with pagination
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function getAllPaginated(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = User::query();

        // Apply filters
        if (isset($filters['badge'])) {
            $query->where('badge', $filters['badge']);
        }

        if (isset($filters['type_compte'])) {
            $query->where('type_compte', $filters['type_compte']);
        }

        if (isset($filters['statut_verification'])) {
            $query->where('statut_verification', $filters['statut_verification']);
        }

        if (isset($filters['search'])) {
            $query->where(function($q) use ($filters) {
                $q->where('nom_complet', 'ILIKE', "%{$filters['search']}%")
                  ->orWhere('email', 'ILIKE', "%{$filters['search']}%")
                  ->orWhere('telephone', 'ILIKE', "%{$filters['search']}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Get users by role
     *
     * @param string $role
     * @return Collection
     */
    public function getUsersByRole(string $role): Collection
    {
        return User::role($role)->get();
    }

    /**
     * Update user badge
     *
     * @param User $user
     * @param string $badge
     * @return User
     */
    public function updateBadge(User $user, string $badge): User
    {
        $user->badge = $badge;
        $user->save();
        return $user;
    }

    /**
     * Update verification status
     *
     * @param User $user
     * @param string $status
     * @return User
     */
    public function updateVerificationStatus(User $user, string $status): User
    {
        $user->statut_verification = $status;
        if ($status === 'verifie') {
            $user->email_verified_at = now();
        }
        $user->save();
        return $user;
    }

    /**
     * Get user statistics
     *
     * @param User $user
     * @return array
     */
    public function getUserStats(User $user): array
    {
        return [
            'total_listings' => $user->listings()->count(),
            'active_listings' => $user->listings()->where('statut', 'publie')->count(),
            'total_contracts' => $user->contractsAsOwner()->count() + $user->contractsAsTenant()->count(),
            'completed_transactions' => $user->contractsAsOwner()->where('statut', 'termine')->count()
                + $user->contractsAsTenant()->where('statut', 'termine')->count(),
            'average_rating' => $user->receivedRatings()->avg('note_globale') ?? 0,
            'total_ratings' => $user->receivedRatings()->count(),
        ];
    }

    /**
     * Check if user can publish more listings
     *
     * @param User $user
     * @return bool
     */
    public function canPublishMoreListings(User $user): bool
    {
        $activeListings = $user->listings()->where('statut', 'publie')->count();

        // Limits based on badge
        $limits = [
            'bronze' => 5,
            'argent' => 15,
            'or' => 50,
            'diamant' => 100,
        ];

        return $activeListings < ($limits[$user->badge] ?? 5);
    }

    /**
     * Get users with expired verification documents
     *
     * @return Collection
     */
    public function getUsersWithExpiredDocuments(): Collection
    {
        return User::whereHas('certificationDocuments', function($query) {
            $query->where('date_expiration', '<', now())
                  ->where('statut', 'approuve');
        })->get();
    }

    /**
     * Ban user
     *
     * @param User $user
     * @param string $reason
     * @return User
     */
    public function banUser(User $user, string $reason = null): User
    {
        $user->statut_verification = 'banni';
        $user->ban_reason = $reason;
        $user->banned_at = now();
        $user->save();
        return $user;
    }

    /**
     * Unban user
     *
     * @param User $user
     * @return User
     */
    public function unbanUser(User $user): User
    {
        $user->statut_verification = 'non_verifie';
        $user->ban_reason = null;
        $user->banned_at = null;
        $user->save();
        return $user;
    }
}
