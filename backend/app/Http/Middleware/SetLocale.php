<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to set application locale based on Accept-Language header
 *
 * This enables translated API responses based on client language preference.
 */
class SetLocale
{
    /**
     * Supported locales
     */
    private array $supportedLocales = ['fr', 'en', 'ar'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->detectLocale($request);
        app()->setLocale($locale);

        return $next($request);
    }

    /**
     * Detect locale from request
     */
    private function detectLocale(Request $request): string
    {
        // 1. Check X-Locale header (explicit override)
        $xLocale = $request->header('X-Locale');
        if ($xLocale && in_array($xLocale, $this->supportedLocales)) {
            return $xLocale;
        }

        // 2. Check Accept-Language header
        $acceptLanguage = $request->header('Accept-Language', 'fr');

        // Parse Accept-Language header (e.g., "fr-FR,fr;q=0.9,en;q=0.8")
        $languages = explode(',', $acceptLanguage);

        foreach ($languages as $lang) {
            $langCode = strtolower(trim(explode(';', $lang)[0]));
            $langCode = explode('-', $langCode)[0]; // Get primary subtag (fr-FR -> fr)

            if (in_array($langCode, $this->supportedLocales)) {
                return $langCode;
            }
        }

        // Default to French
        return 'fr';
    }
}
