<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorAuthentication
{
    /**
     * Handle an incoming request.
     * FR-006: Require 2FA verification for sensitive operations
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip 2FA if user is not authenticated
        if (!$user) {
            return $next($request);
        }

        // Check if 2FA is enabled for this user
        if (!$user->deux_facteurs_actif) {
            return $next($request);
        }

        // Check if 2FA has been verified in this session
        if ($request->session()->has('2fa_verified') && $request->session()->get('2fa_verified') === true) {
            return $next($request);
        }

        // 2FA required but not verified
        return response()->json([
            'error' => '2FA verification required',
            'message' => 'Vous devez vérifier votre authentification à deux facteurs pour accéder à cette ressource.',
            'requires_2fa' => true,
        ], 403);
    }
}
