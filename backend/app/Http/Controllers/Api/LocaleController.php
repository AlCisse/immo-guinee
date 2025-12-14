<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * T232: Locale Controller for i18n support
 *
 * Provides available locales and user locale management
 * for diaspora users (FR-092 Phase 2)
 */
class LocaleController extends Controller
{
    /**
     * Available locales configuration
     */
    private array $availableLocales = [
        'fr' => [
            'code' => 'fr',
            'name' => 'Français',
            'native_name' => 'Français',
            'direction' => 'ltr',
            'flag' => '🇫🇷',
            'date_format' => 'dd/MM/yyyy',
            'time_format' => 'HH:mm',
            'currency_format' => '# ### GNF',
        ],
        'ar' => [
            'code' => 'ar',
            'name' => 'Arabic',
            'native_name' => 'العربية',
            'direction' => 'rtl',
            'flag' => '🇸🇦',
            'date_format' => 'yyyy/MM/dd',
            'time_format' => 'HH:mm',
            'currency_format' => 'GNF # ###',
        ],
        'en' => [
            'code' => 'en',
            'name' => 'English',
            'native_name' => 'English',
            'direction' => 'ltr',
            'flag' => '🇬🇧',
            'date_format' => 'MM/dd/yyyy',
            'time_format' => 'h:mm a',
            'currency_format' => 'GNF #,###',
        ],
    ];

    /**
     * List available locales
     * GET /api/locales
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => array_values($this->availableLocales),
            'default' => 'fr',
            'supported' => array_keys($this->availableLocales),
        ]);
    }

    /**
     * Get specific locale details
     * GET /api/locales/{locale}
     */
    public function show(string $locale): JsonResponse
    {
        if (!isset($this->availableLocales[$locale])) {
            return response()->json([
                'message' => 'Locale not found',
                'available' => array_keys($this->availableLocales),
            ], 404);
        }

        return response()->json([
            'data' => $this->availableLocales[$locale],
        ]);
    }

    /**
     * Detect user's preferred locale from Accept-Language header
     * GET /api/locales/detect
     */
    public function detect(Request $request): JsonResponse
    {
        $acceptLanguage = $request->header('Accept-Language', 'fr');

        // Parse Accept-Language header
        $languages = explode(',', $acceptLanguage);
        $detectedLocale = 'fr'; // Default

        foreach ($languages as $lang) {
            $langCode = strtolower(trim(explode(';', $lang)[0]));
            $langCode = explode('-', $langCode)[0]; // Get primary subtag

            if (isset($this->availableLocales[$langCode])) {
                $detectedLocale = $langCode;
                break;
            }
        }

        return response()->json([
            'detected' => $detectedLocale,
            'locale' => $this->availableLocales[$detectedLocale],
        ]);
    }
}
