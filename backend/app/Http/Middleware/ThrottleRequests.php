<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Symfony\Component\HttpFoundation\Response;

/**
 * Brute-force protection middleware with configurable rate limiting.
 *
 * Provides protection against:
 * - Authentication brute-force attacks
 * - OTP enumeration attempts
 * - API abuse and DoS attempts
 * - Form spam and bot attacks
 */
class ThrottleRequests
{
    /**
     * Rate limiter instance.
     */
    protected RateLimiter $limiter;

    /**
     * Create a new middleware instance.
     */
    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $limiterName = 'global'): Response
    {
        $key = $this->resolveRequestSignature($request, $limiterName);
        $limit = $this->getLimit($limiterName);

        if ($this->limiter->tooManyAttempts($key, $limit->maxAttempts)) {
            $this->logThrottledRequest($request, $limiterName);

            return $this->buildThrottleResponse($key, $limit->maxAttempts);
        }

        $this->limiter->hit($key, $limit->decaySeconds);

        $response = $next($request);

        return $this->addHeaders(
            $response,
            $limit->maxAttempts,
            $this->calculateRemainingAttempts($key, $limit->maxAttempts)
        );
    }

    /**
     * Resolve the request signature for rate limiting.
     */
    protected function resolveRequestSignature(Request $request, string $limiterName): string
    {
        $user = $request->user();

        if ($user) {
            return 'throttle:'.$limiterName.':'.$user->getAuthIdentifier();
        }

        return 'throttle:'.$limiterName.':'.$this->resolveRequestIp($request);
    }

    /**
     * Resolve the client IP address, considering proxies.
     *
     * Priority: CF-Connecting-IP (Cloudflare) > X-Real-IP (Nginx) > X-Forwarded-For > Direct IP
     * Only trusts headers if request comes from known proxy ranges.
     */
    protected function resolveRequestIp(Request $request): string
    {
        $directIp = $request->ip() ?? '0.0.0.0';

        // In production, only trust headers if from Cloudflare/Traefik
        if (app()->isProduction() && !$this->isFromTrustedProxy($directIp)) {
            return $directIp;
        }

        // CF-Connecting-IP is the most reliable (set by Cloudflare)
        if ($request->hasHeader('CF-Connecting-IP')) {
            $cfIp = $request->header('CF-Connecting-IP');
            if ($cfIp && filter_var($cfIp, FILTER_VALIDATE_IP)) {
                return $cfIp;
            }
        }

        // X-Real-IP (set by Nginx)
        if ($request->hasHeader('X-Real-IP')) {
            $realIp = $request->header('X-Real-IP');
            if ($realIp && filter_var($realIp, FILTER_VALIDATE_IP)) {
                return $realIp;
            }
        }

        // X-Forwarded-For (take first valid IP)
        if ($request->hasHeader('X-Forwarded-For')) {
            $ips = explode(',', $request->header('X-Forwarded-For') ?? '');
            foreach ($ips as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }

        return $directIp;
    }

    /**
     * Check if request comes from a trusted proxy.
     */
    protected function isFromTrustedProxy(string $ip): bool
    {
        // Docker/Traefik internal networks
        $trustedRanges = [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '127.0.0.0/8',
        ];

        foreach ($trustedRanges as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if IP is in CIDR range.
     */
    protected function ipInRange(string $ip, string $range): bool
    {
        [$subnet, $bits] = explode('/', $range);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        if ($ipLong === false || $subnetLong === false) {
            return false;
        }
        $mask = -1 << (32 - (int) $bits);

        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    /**
     * Get the rate limit configuration for a given limiter name.
     */
    protected function getLimit(string $limiterName): Limit
    {
        return match ($limiterName) {
            // Authentication endpoints (strict)
            'auth' => Limit::perMinute(5)->by('auth'),
            'auth:login' => Limit::perMinute(5)->by('auth:login'),
            'auth:register' => Limit::perMinute(3)->by('auth:register'),

            // OTP endpoints (very strict to prevent enumeration)
            'otp:request' => Limit::perMinute(3)->by('otp:request'),
            'otp:verify' => Limit::perMinute(5)->by('otp:verify'),
            'otp:resend' => Limit::perHour(10)->by('otp:resend'),

            // Password reset (strict)
            'password:reset' => Limit::perMinute(3)->by('password:reset'),
            'password:forgot' => Limit::perHour(5)->by('password:forgot'),

            // API endpoints (moderate)
            'api' => Limit::perMinute(60)->by('api'),
            'api:search' => Limit::perMinute(30)->by('api:search'),
            'api:listing:create' => Limit::perHour(10)->by('api:listing:create'),
            'api:message:send' => Limit::perMinute(20)->by('api:message:send'),
            'api:message:conversation' => Limit::perHour(50)->by('api:message:conversation'),

            // Payment endpoints (strict)
            'payment:initiate' => Limit::perHour(10)->by('payment:initiate'),
            'payment:webhook' => Limit::perMinute(100)->by('payment:webhook'),

            // Contract endpoints
            'contract:generate' => Limit::perHour(5)->by('contract:generate'),
            'contract:sign' => Limit::perMinute(10)->by('contract:sign'),

            // File uploads
            'upload:photo' => Limit::perMinute(30)->by('upload:photo'),
            'upload:document' => Limit::perMinute(10)->by('upload:document'),

            // Contact/messaging forms
            'contact' => Limit::perHour(10)->by('contact'),

            // Default global limit
            default => Limit::perMinute(60)->by('global'),
        };
    }

    /**
     * Build the throttle response.
     */
    protected function buildThrottleResponse(string $key, int $maxAttempts): Response
    {
        $retryAfter = $this->limiter->availableIn($key);

        throw new ThrottleRequestsException(
            message: 'Trop de requêtes. Veuillez réessayer dans '.$this->formatRetryAfter($retryAfter).'.',
            headers: $this->getHeaders(
                $maxAttempts,
                0,
                $retryAfter
            )
        );
    }

    /**
     * Format retry after duration for user display.
     */
    protected function formatRetryAfter(int $seconds): string
    {
        if ($seconds < 60) {
            return $seconds.' secondes';
        }

        $minutes = ceil($seconds / 60);

        return $minutes.' '.($minutes === 1.0 ? 'minute' : 'minutes');
    }

    /**
     * Calculate the number of remaining attempts.
     */
    protected function calculateRemainingAttempts(string $key, int $maxAttempts): int
    {
        return $this->limiter->remaining($key, $maxAttempts);
    }

    /**
     * Add rate limit headers to the response.
     */
    protected function addHeaders(Response $response, int $maxAttempts, int $remainingAttempts): Response
    {
        $response->headers->add($this->getHeaders($maxAttempts, $remainingAttempts));

        return $response;
    }

    /**
     * Get rate limit headers.
     */
    protected function getHeaders(int $maxAttempts, int $remainingAttempts, ?int $retryAfter = null): array
    {
        $headers = [
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => max(0, $remainingAttempts),
        ];

        if ($retryAfter !== null) {
            $headers['Retry-After'] = $retryAfter;
            $headers['X-RateLimit-Reset'] = time() + $retryAfter;
        }

        return $headers;
    }

    /**
     * Log throttled requests for security monitoring.
     */
    protected function logThrottledRequest(Request $request, string $limiterName): void
    {
        $logData = [
            'ip' => $this->resolveRequestIp($request),
            'user_agent' => $request->userAgent(),
            'path' => $request->path(),
            'method' => $request->method(),
            'limiter' => $limiterName,
            'user_id' => $request->user()?->id,
        ];

        // Log to security channel if configured
        if (config('logging.channels.security')) {
            \Illuminate\Support\Facades\Log::channel('security')
                ->warning('Rate limit exceeded', $logData);
        } else {
            \Illuminate\Support\Facades\Log::warning('Rate limit exceeded', $logData);
        }
    }

    /**
     * Boot rate limiters in the service provider.
     * Call this method from AppServiceProvider::boot()
     */
    public static function configureRateLimiting(): void
    {
        // Authentication rate limiters
        RateLimiterFacade::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->input('phone') ?? $request->ip()
            );
        });

        RateLimiterFacade::for('otp', function (Request $request) {
            return Limit::perMinute(3)->by(
                $request->input('phone') ?? $request->ip()
            );
        });

        // API rate limiter
        RateLimiterFacade::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?? $request->ip()
            );
        });

        // Messaging rate limiter (FR-066: 50 msg/h, 10 conv/day)
        RateLimiterFacade::for('messaging', function (Request $request) {
            $user = $request->user();
            if (!$user) {
                return Limit::perMinute(10)->by($request->ip());
            }

            return [
                Limit::perHour(50)->by($user->id), // 50 messages per hour
                Limit::perDay(10)->by($user->id.':conversations'), // 10 new conversations per day
            ];
        });

        // Search rate limiter
        RateLimiterFacade::for('search', function (Request $request) {
            return Limit::perMinute(30)->by(
                $request->user()?->id ?? $request->ip()
            );
        });

        // Upload rate limiter
        RateLimiterFacade::for('upload', function (Request $request) {
            return Limit::perMinute(30)->by(
                $request->user()?->id ?? $request->ip()
            );
        });
    }
}
