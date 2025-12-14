<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInput
{
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

        // Recursively sanitize input
        $sanitized = $this->sanitize($input);

        // Replace request input with sanitized data
        $request->replace($sanitized);

        return $next($request);
    }

    /**
     * Recursively sanitize data
     */
    private function sanitize($data)
    {
        if (is_array($data)) {
            return array_map([$this, 'sanitize'], $data);
        }

        if (is_string($data)) {
            return $this->sanitizeString($data);
        }

        return $data;
    }

    /**
     * Sanitize string input
     */
    private function sanitizeString(string $value): string
    {
        // Remove null bytes
        $value = str_replace(chr(0), '', $value);

        // Remove control characters except line breaks
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);

        // Trim whitespace
        $value = trim($value);

        // Convert special characters to HTML entities (prevents XSS)
        // Note: Use this carefully - for rich text fields, you may want to skip this
        // $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Remove potential SQL injection characters (basic protection - use prepared statements!)
        // This is a backup measure; rely on Laravel's query builder for SQL safety
        // $value = str_replace(['--', ';', '/*', '*/'], '', $value);

        return $value;
    }

    /**
     * Fields that should not be sanitized (e.g., passwords, tokens)
     */
    private function shouldSkipField(string $key): bool
    {
        $skipFields = [
            'password',
            'password_confirmation',
            'token',
            'access_token',
            'refresh_token',
            'api_key',
            'secret',
            'signature',
        ];

        return in_array($key, $skipFields);
    }
}
