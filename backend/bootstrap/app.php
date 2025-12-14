<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Note: Sanctum EnsureFrontendRequestsAreStateful removed from global api middleware
        // to allow public API routes. Auth routes use auth:api (Passport) directly.

        // Configure authentication redirect - return null for API routes to get 401 JSON
        $middleware->redirectGuestsTo(function ($request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return null;
            }
            return '/login';
        });

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'admin' => \App\Http\Middleware\CheckAdmin::class,
            'verified.phone' => \App\Http\Middleware\EnsurePhoneIsVerified::class,
            '2fa' => \App\Http\Middleware\TwoFactorAuthentication::class,
            'sanitize' => \App\Http\Middleware\SanitizeInput::class,
            'ensure.role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);

        // Apply security headers to all responses
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        $middleware->throttleApi();

        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Return JSON for API authentication errors instead of redirect/404
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifie. Veuillez vous connecter.',
                ], 401);
            }
        });
    })->create();
