<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInput
{
    /**
     * Fields that should not be HTML-encoded (sensitive data that needs exact values)
     */
    private const SKIP_ENCODING_FIELDS = [
        'password',
        'password_confirmation',
        'mot_de_passe',
        'mot_de_passe_confirmation',
        'token',
        'access_token',
        'refresh_token',
        'api_key',
        'secret',
        'signature',
        'code', // OTP codes
        'otp_code',
    ];

    /**
     * Fields that should skip XSS sanitization entirely (raw content needed)
     */
    private const SKIP_SANITIZE_FIELDS = [
        'password',
        'password_confirmation',
        'mot_de_passe',
        'mot_de_passe_confirmation',
    ];

    /**
     * Handle an incoming request.
     * FR-009: Sanitize all user inputs to prevent XSS and injection attacks
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get all input data
        $input = $request->all();

        // Recursively sanitize input with key awareness
        $sanitized = $this->sanitizeWithKeys($input);

        // Replace request input with sanitized data
        $request->replace($sanitized);

        return $next($request);
    }

    /**
     * Recursively sanitize data while preserving keys for field-specific logic
     */
    private function sanitizeWithKeys(array $data, string $parentKey = ''): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            $fullKey = $parentKey ? "{$parentKey}.{$key}" : (string) $key;

            if (is_array($value)) {
                $result[$key] = $this->sanitizeWithKeys($value, $fullKey);
            } elseif (is_string($value)) {
                $result[$key] = $this->sanitizeString($value, (string) $key);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Sanitize string input with XSS protection
     */
    private function sanitizeString(string $value, string $key): string
    {
        // Skip sanitization entirely for password fields (preserve exact input)
        if ($this->shouldSkipSanitize($key)) {
            return $value;
        }

        // Remove null bytes (security risk)
        $value = str_replace(chr(0), '', $value);

        // Remove control characters except line breaks and tabs
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);

        // Trim whitespace
        $value = trim($value);

        // Apply HTML encoding for XSS protection (unless field should be skipped)
        if (!$this->shouldSkipEncoding($key)) {
            // Convert special characters to HTML entities (prevents XSS)
            // This is the primary XSS defense layer
            $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8', false);
        }

        return $value;
    }

    /**
     * Check if field should skip HTML encoding
     */
    private function shouldSkipEncoding(string $key): bool
    {
        $lowercaseKey = strtolower($key);

        foreach (self::SKIP_ENCODING_FIELDS as $skipField) {
            if ($lowercaseKey === $skipField || str_ends_with($lowercaseKey, "_{$skipField}")) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if field should skip all sanitization
     */
    private function shouldSkipSanitize(string $key): bool
    {
        $lowercaseKey = strtolower($key);

        foreach (self::SKIP_SANITIZE_FIELDS as $skipField) {
            if ($lowercaseKey === $skipField || str_ends_with($lowercaseKey, "_{$skipField}")) {
                return true;
            }
        }

        return false;
    }
}
