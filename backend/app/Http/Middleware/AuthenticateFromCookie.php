<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to authenticate API requests from httpOnly cookies.
 *
 * This provides XSS-resistant token storage by:
 * 1. Storing the access token in an httpOnly cookie (not accessible via JavaScript)
 * 2. Extracting the token from the cookie and adding it to the Authorization header
 * 3. Allowing the standard Passport auth:api middleware to validate the token
 */
class AuthenticateFromCookie
{
    /**
     * The name of the cookie that stores the access token.
     */
    public const TOKEN_COOKIE_NAME = 'immoguinee_access_token';

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If no Authorization header is present, try to get token from cookie
        if (!$request->hasHeader('Authorization')) {
            $token = $request->cookie(self::TOKEN_COOKIE_NAME);

            if ($token) {
                // Add the token to the request headers
                $request->headers->set('Authorization', 'Bearer ' . $token);
            }
        }

        return $next($request);
    }

    /**
     * Create an httpOnly cookie with the access token.
     *
     * @param string $token The access token
     * @param int $expireMinutes Cookie expiration in minutes (default 24 hours)
     * @return \Symfony\Component\HttpFoundation\Cookie
     */
    public static function createTokenCookie(string $token, int $expireMinutes = 1440): \Symfony\Component\HttpFoundation\Cookie
    {
        $secure = config('app.env') === 'production';
        $sameSite = $secure ? 'None' : 'Lax';

        return cookie(
            name: self::TOKEN_COOKIE_NAME,
            value: $token,
            minutes: $expireMinutes,
            path: '/',
            domain: config('session.domain'),
            secure: $secure,
            httpOnly: true,
            raw: false,
            sameSite: $sameSite
        );
    }

    /**
     * Create a cookie that will clear/forget the access token.
     *
     * @return \Symfony\Component\HttpFoundation\Cookie
     */
    public static function forgetTokenCookie(): \Symfony\Component\HttpFoundation\Cookie
    {
        return cookie()->forget(self::TOKEN_COOKIE_NAME);
    }
}
