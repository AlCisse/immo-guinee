<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
                'error' => 'Unauthenticated'
            ], 401);
        }

        // Check if user has admin role using Spatie Permission
        if (!auth()->user()->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Droits administrateur requis.',
                'error' => 'Forbidden'
            ], 403);
        }

        return $next($request);
    }
}
