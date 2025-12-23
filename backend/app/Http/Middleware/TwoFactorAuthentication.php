<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorAuthentication
{
    /**
     * Handle an incoming request.
     * Requires 2FA verification for admin users with TOTP enabled.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip 2FA if user is not authenticated
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifie.',
            ], 401);
        }

        // Check if 2FA is enabled and confirmed for this user
        if (empty($user->two_factor_secret) || empty($user->two_factor_confirmed_at)) {
            // 2FA not configured - require setup for admins
            if ($user->hasRole('admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration 2FA requise pour les administrateurs.',
                    'requires_2fa_setup' => true,
                ], 403);
            }
            return $next($request);
        }

        // Check if 2FA has been verified in cache
        $sessionKey = "2fa_verified:{$user->id}";
        if (Cache::has($sessionKey) && Cache::get($sessionKey) === true) {
            return $next($request);
        }

        // 2FA required but not verified
        return response()->json([
            'success' => false,
            'message' => 'Verification 2FA requise.',
            'requires_2fa' => true,
        ], 403);
    }
}
