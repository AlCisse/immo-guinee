<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Handle an incoming request.
     * FR-008: Add security headers to all responses
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Remove PHP version exposure
        $response->headers->remove('X-Powered-By');

        // Prevent clickjacking attacks
        $response->headers->set('X-Frame-Options', 'DENY');

        // Prevent MIME type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Enable XSS filter
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Enforce HTTPS with preload
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

        // Content Security Policy - Strict mode for production
        // Note: If you need inline scripts, use nonce-based CSP instead
        $cspPolicy = env('APP_ENV') === 'production'
            ? "default-src 'self'; " .
              "script-src 'self'; " .
              "style-src 'self'; " .
              "img-src 'self' data: https:; " .
              "font-src 'self' data:; " .
              "connect-src 'self' https://*.immoguinee.com wss://*.immoguinee.com; " .
              "frame-ancestors 'none'; " .
              "base-uri 'self'; " .
              "form-action 'self';"
            : "default-src 'self'; " .
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " .
              "style-src 'self' 'unsafe-inline'; " .
              "img-src 'self' data: https:; " .
              "font-src 'self' data:; " .
              "connect-src 'self' http://localhost:* ws://localhost:*;";

        $response->headers->set('Content-Security-Policy', $cspPolicy);

        // Referrer Policy
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy (formerly Feature Policy)
        $response->headers->set('Permissions-Policy',
            'geolocation=(self), ' .
            'microphone=(), ' .
            'camera=(), ' .
            'payment=(self)'
        );

        // Cross-Origin security headers (modern replacements for deprecated headers)
        // COOP: Isolate browsing context to prevent cross-origin attacks
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');

        // CORP: Prevent resources from being loaded by other origins
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        return $response;
    }
}
