<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class RoleRedirectService
{
    /**
     * Get the dashboard URL for a user based on their role.
     *
     * @param User $user
     * @return string
     */
    public function getDashboardUrl(User $user): string
    {
        $frontendUrl = $this->getFrontendUrl();
        $path = $this->getDashboardPath($user);

        return rtrim($frontendUrl, '/') . $path;
    }

    /**
     * Get the dashboard path for a user based on their role.
     *
     * @param User $user
     * @return string
     */
    public function getDashboardPath(User $user): string
    {
        $priority = config('dashboard.priority', []);
        $routes = config('dashboard.routes', []);

        // Check roles in priority order
        foreach ($priority as $role) {
            if ($user->hasRole($role)) {
                Log::info('RoleRedirectService: Role matched', [
                    'user_id' => $user->id,
                    'role' => $role,
                    'path' => $routes[$role] ?? config('dashboard.default'),
                ]);

                return $routes[$role] ?? config('dashboard.default', '/');
            }
        }

        // Fallback to default
        Log::info('RoleRedirectService: No role matched, using default', [
            'user_id' => $user->id,
            'user_roles' => $user->getRoleNames()->toArray(),
        ]);

        return config('dashboard.default', '/');
    }

    /**
     * Get the frontend URL from configuration.
     *
     * @return string
     */
    public function getFrontendUrl(): string
    {
        return config('dashboard.frontend_url', config('app.frontend_url', 'http://localhost:3000'));
    }

    /**
     * Get the primary role for a user.
     *
     * @param User $user
     * @return string|null
     */
    public function getPrimaryRole(User $user): ?string
    {
        $priority = config('dashboard.priority', []);

        foreach ($priority as $role) {
            if ($user->hasRole($role)) {
                return $role;
            }
        }

        // Return first role if no priority match
        $roles = $user->getRoleNames();
        return $roles->isNotEmpty() ? $roles->first() : null;
    }

    /**
     * Check if a user has access to a specific API prefix.
     *
     * @param User $user
     * @param string $prefix
     * @return bool
     */
    public function hasAccessToPrefix(User $user, string $prefix): bool
    {
        $apiPrefixes = config('dashboard.api_prefixes', []);

        // Admin has access to everything
        if ($user->hasRole('admin')) {
            return true;
        }

        // Check each role the user has
        foreach ($user->getRoleNames() as $role) {
            $allowedPrefixes = $apiPrefixes[$role] ?? [];
            if (in_array($prefix, $allowedPrefixes)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the redirect URL after login.
     *
     * @param User $user
     * @return string
     */
    public function getLoginRedirectUrl(User $user): string
    {
        return $this->getDashboardUrl($user);
    }

    /**
     * Get the redirect URL after logout.
     *
     * @return string
     */
    public function getLogoutRedirectUrl(): string
    {
        return $this->getFrontendUrl() . '/connexion';
    }

    /**
     * Build response data for login including redirect information.
     *
     * @param User $user
     * @return array
     */
    public function buildLoginResponseData(User $user): array
    {
        return [
            'redirect_url' => $this->getDashboardUrl($user),
            'dashboard_path' => $this->getDashboardPath($user),
            'primary_role' => $this->getPrimaryRole($user),
            'roles' => $user->getRoleNames()->toArray(),
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
        ];
    }
}
