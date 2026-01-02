<?php

namespace App\Actions\Auth;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\User;
use App\Services\RoleRedirectService;
use Illuminate\Http\JsonResponse;

class LoginResponse
{
    protected RoleRedirectService $roleRedirectService;

    public function __construct(RoleRedirectService $roleRedirectService)
    {
        $this->roleRedirectService = $roleRedirectService;
    }

    /**
     * Build the login response for a user.
     *
     * @param User $user
     * @param string $token
     * @param string|null $tokenType
     * @return JsonResponse
     */
    public function toResponse(User $user, string $token, ?string $tokenType = 'Bearer'): JsonResponse
    {
        $redirectData = $this->roleRedirectService->buildLoginResponseData($user);

        // Update last login timestamp
        $user->update(['last_login_at' => now()]);

        // Check if user is admin
        $isAdmin = $user->hasRole('admin');

        // Check if user has 2FA enabled and confirmed
        $has2faConfigured = !empty($user->two_factor_secret) && !empty($user->two_factor_confirmed_at);

        // SECURITY: Admin without 2FA must configure it before getting full access
        if ($isAdmin && !$has2faConfigured) {
            // Create a temporary token for 2FA setup
            // Note: Using regular token - scope validation will be done in 2FA middleware
            $setupToken = $user->createToken('2fa-setup-token')->accessToken;

            // Create response with httpOnly cookie for 2FA setup
            $cookie = AuthenticateFromCookie::createTokenCookie($setupToken, 30); // 30 minutes for setup

            return response()->json([
                'success' => true,
                'message' => 'Configuration 2FA requise',
                'data' => [
                    'user' => $this->formatUser($user),
                    'requires_2fa_setup' => true,
                    'setup_token' => $setupToken,
                    'redirect' => [
                        'redirect_url' => config('app.frontend_url', 'https://immoguinee.com') . '/auth/verify-2fa',
                        'dashboard_path' => '/auth/verify-2fa',
                    ],
                ],
            ])->withCookie($cookie);
        }

        // Check if 2FA verification is required (2FA is configured but not yet verified this session)
        $requires2faVerification = $has2faConfigured;

        $responseData = [
            'user' => $this->formatUser($user),
            // Token still included for mobile apps that use Authorization header
            // Web clients should use the httpOnly cookie instead
            'token' => $token,
            'token_type' => $tokenType,
            'redirect' => $redirectData,
        ];

        // If 2FA verification is required, modify the redirect to go to verify-2fa page
        if ($requires2faVerification) {
            $responseData['requires_2fa'] = true;
            $responseData['redirect']['redirect_url'] = config('app.frontend_url', 'https://immoguinee.com') . '/auth/verify-2fa';
            $responseData['redirect']['dashboard_path'] = '/auth/verify-2fa';
        }

        // Create response with httpOnly cookie for web clients (XSS protection)
        // Token expiration: 24 hours (1440 minutes)
        $cookie = AuthenticateFromCookie::createTokenCookie($token, 1440);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $responseData,
        ])->withCookie($cookie);
    }

    /**
     * Build the login response after OTP verification.
     *
     * @param User $user
     * @param string $token
     * @return JsonResponse
     */
    public function afterOtpVerification(User $user, string $token): JsonResponse
    {
        return $this->toResponse($user, $token);
    }

    /**
     * Format the user data for the response.
     *
     * @param User $user
     * @return array
     */
    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'nom_complet' => $user->nom_complet,
            'telephone' => $user->telephone,
            'email' => $user->email,
            'type_compte' => $user->type_compte,
            'badge' => $user->badge,
            'statut_verification' => $user->statut_verification,
            'is_active' => $user->is_active,
            'telephone_verified_at' => $user->telephone_verified_at,
            'email_verified_at' => $user->email_verified_at,
            'roles' => $user->getRoleNames()->toArray(),
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
        ];
    }

    /**
     * Get the redirect URL for a user.
     *
     * @param User $user
     * @return string
     */
    public function getRedirectUrl(User $user): string
    {
        return $this->roleRedirectService->getDashboardUrl($user);
    }

    /**
     * Get the logout response.
     *
     * @return JsonResponse
     */
    public function logoutResponse(): JsonResponse
    {
        // Clear the httpOnly cookie on logout
        $cookie = AuthenticateFromCookie::forgetTokenCookie();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
            'data' => [
                'redirect_url' => $this->roleRedirectService->getLogoutRedirectUrl(),
            ],
        ])->withCookie($cookie);
    }
}
