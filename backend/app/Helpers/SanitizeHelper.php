<?php

namespace App\Helpers;

class SanitizeHelper
{
    /**
     * Sanitize string input to prevent XSS attacks
     *
     * @param string|null $input
     * @return string|null
     */
    public static function sanitizeString(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        // Remove HTML tags
        $sanitized = strip_tags($input);

        // Convert special characters to HTML entities
        $sanitized = htmlspecialchars($sanitized, ENT_QUOTES, 'UTF-8');

        // Trim whitespace
        $sanitized = trim($sanitized);

        return $sanitized;
    }

    /**
     * Sanitize HTML input (for rich text editors)
     * Allows specific safe HTML tags
     *
     * @param string|null $input
     * @return string|null
     */
    public static function sanitizeHtml(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        // Allow only specific safe HTML tags
        $allowedTags = '<p><br><strong><em><u><ul><ol><li><a><h1><h2><h3><h4><h5><h6>';

        $sanitized = strip_tags($input, $allowedTags);

        // Remove javascript: and data: protocols from href
        $sanitized = preg_replace('/(<a[^>]+href=["\'](javascript|data):[^"\']*["\'][^>]*>)/i', '', $sanitized);

        // Remove on* event handlers
        $sanitized = preg_replace('/(<[^>]+)(on\w+\s*=\s*["\'][^"\']*["\'])/i', '$1', $sanitized);

        return trim($sanitized);
    }

    /**
     * Sanitize phone number for Guinea
     *
     * @param string|null $phone
     * @return string|null
     */
    public static function sanitizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        // Remove all non-numeric characters
        $sanitized = preg_replace('/[^0-9]/', '', $phone);

        // Remove leading zeros if present
        $sanitized = ltrim($sanitized, '0');

        // Remove country code if present
        if (str_starts_with($sanitized, '224')) {
            $sanitized = substr($sanitized, 3);
        }

        // Add Guinea country code
        if (strlen($sanitized) === 9) {
            $sanitized = '224' . $sanitized;
        }

        return $sanitized;
    }

    /**
     * Sanitize email address
     *
     * @param string|null $email
     * @return string|null
     */
    public static function sanitizeEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }

        // Convert to lowercase
        $sanitized = strtolower(trim($email));

        // Filter email
        $sanitized = filter_var($sanitized, FILTER_SANITIZE_EMAIL);

        // Validate email format
        if (!filter_var($sanitized, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $sanitized;
    }

    /**
     * Sanitize URL
     *
     * @param string|null $url
     * @return string|null
     */
    public static function sanitizeUrl(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        // Filter URL
        $sanitized = filter_var(trim($url), FILTER_SANITIZE_URL);

        // Validate URL format
        if (!filter_var($sanitized, FILTER_VALIDATE_URL)) {
            return null;
        }

        // Only allow http and https protocols
        if (!preg_match('/^https?:\/\//i', $sanitized)) {
            return null;
        }

        return $sanitized;
    }

    /**
     * Sanitize integer input
     *
     * @param mixed $input
     * @return int|null
     */
    public static function sanitizeInt($input): ?int
    {
        if ($input === null || $input === '') {
            return null;
        }

        return filter_var($input, FILTER_SANITIZE_NUMBER_INT);
    }

    /**
     * Sanitize float input
     *
     * @param mixed $input
     * @return float|null
     */
    public static function sanitizeFloat($input): ?float
    {
        if ($input === null || $input === '') {
            return null;
        }

        return filter_var($input, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }

    /**
     * Sanitize array of strings
     *
     * @param array|null $input
     * @return array|null
     */
    public static function sanitizeArray(?array $input): ?array
    {
        if ($input === null) {
            return null;
        }

        return array_map(function ($item) {
            if (is_string($item)) {
                return self::sanitizeString($item);
            }
            return $item;
        }, $input);
    }

    /**
     * Check if string contains SQL injection patterns
     *
     * @param string $input
     * @return bool
     */
    public static function containsSqlInjection(string $input): bool
    {
        $patterns = [
            '/(\bUNION\b.*\bSELECT\b)/i',
            '/(\bDROP\b.*\bTABLE\b)/i',
            '/(\bINSERT\b.*\bINTO\b)/i',
            '/(\bUPDATE\b.*\bSET\b)/i',
            '/(\bDELETE\b.*\bFROM\b)/i',
            '/(\bEXEC\b|\bEXECUTE\b)/i',
            '/(--|#|\/\*|\*\/)/i',
            '/(\bOR\b.*=.*)/i',
            '/(\bAND\b.*=.*)/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if string contains XSS patterns
     *
     * @param string $input
     * @return bool
     */
    public static function containsXss(string $input): bool
    {
        $patterns = [
            '/<script\b[^>]*>(.*?)<\/script>/is',
            '/<iframe\b[^>]*>(.*?)<\/iframe>/is',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<embed\b/i',
            '/<object\b/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize filename for upload
     *
     * @param string $filename
     * @return string
     */
    public static function sanitizeFilename(string $filename): string
    {
        // Get file extension
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $basename = pathinfo($filename, PATHINFO_FILENAME);

        // Remove special characters from basename
        $basename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $basename);

        // Limit length
        $basename = substr($basename, 0, 100);

        // Reconstruct filename
        return $basename . '.' . strtolower($extension);
    }

    /**
     * Remove spam keywords from message
     * FR-062: Anti-spam filter
     *
     * @param string $message
     * @return bool
     */
    public static function containsSpam(string $message): bool
    {
        $spamKeywords = [
            'whatsapp',
            'telegram',
            'signal',
            'viber',
            'appel moi',
            'appelle moi',
            'numero',
            'numéro',
            'virement',
            'western union',
            'moneygram',
            'transfert',
            'bitcoin',
            'crypto',
            'urgent urgent',
            'besoin urgent',
        ];

        $lowerMessage = strtolower($message);

        foreach ($spamKeywords as $keyword) {
            if (str_contains($lowerMessage, $keyword)) {
                return true;
            }
        }

        return false;
    }
}
