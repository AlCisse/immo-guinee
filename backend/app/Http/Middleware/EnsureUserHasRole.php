<?php

namespace App\Http\Middleware;

use App\Services\RoleRedirectService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    protected RoleRedirectService $roleRedirectService;

    public function __construct(RoleRedirectService $roleRedirectService)
    {
        $this->roleRedirectService = $roleRedirectService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  The roles to check (user must have at least one)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            Log::warning('EnsureUserHasRole: No authenticated user', [
                'path' => $request->path(),
                'required_roles' => $roles,
            ]);

            return $this->unauthorized($request, 'Authentication required');
        }

        // If no roles specified, just check if authenticated
        if (empty($roles)) {
            return $next($request);
        }

        // Check if user has any of the required roles
        foreach ($roles as $role) {
            if ($user->hasRole($role)) {
                Log::debug('EnsureUserHasRole: Access granted', [
                    'user_id' => $user->id,
                    'matched_role' => $role,
                    'path' => $request->path(),
                ]);

                return $next($request);
            }
        }

        Log::warning('EnsureUserHasRole: Access denied', [
            'user_id' => $user->id,
            'user_roles' => $user->getRoleNames()->toArray(),
            'required_roles' => $roles,
            'path' => $request->path(),
        ]);

        return $this->forbidden($request, $roles);
    }

    /**
     * Return an unauthorized response.
     *
     * @param Request $request
     * @param string $message
     * @return Response
     */
    protected function unauthorized(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => $message,
                'error' => 'unauthenticated',
            ], 401);
        }

        return redirect()->guest(
            $this->roleRedirectService->getFrontendUrl() . '/connexion'
        );
    }

    /**
     * Return a forbidden response.
     *
     * @param Request $request
     * @param array $requiredRoles
     * @return Response
     */
    protected function forbidden(Request $request, array $requiredRoles): Response
    {
        $user = $request->user();
        $correctDashboard = $this->roleRedirectService->getDashboardUrl($user);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to access this resource',
                'error' => 'forbidden',
                'required_roles' => $requiredRoles,
                'your_roles' => $user->getRoleNames()->toArray(),
                'redirect_url' => $correctDashboard,
            ], 403);
        }

        return redirect($correctDashboard)->with('error', 'Access denied');
    }
}
