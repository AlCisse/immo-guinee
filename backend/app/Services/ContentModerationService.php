<?php

namespace App\Services;

class ContentModerationService
{
    /**
     * Blacklisted keywords for auto-moderation
     */
    private const BLACKLIST_KEYWORDS = [
        // Insulting words
        'con', 'connard', 'salaud', 'imbécile', 'idiot', 'crétin',
        // Scam indicators
        'arnaque', 'arnaquer', 'escroc', 'voleur', 'voler',
        // External contact attempts (violates FR-060)
        'whatsapp', 'téléphone', 'appelle-moi', 'contacte-moi',
        '+224', '0', // Phone number patterns
        '@', 'gmail', 'yahoo', 'hotmail', // Email patterns
        // Other
        'raciste', 'discrimination',
    ];

    /**
     * Moderate text content (ratings, messages, disputes)
     */
    public function moderate(string $content): array
    {
        $detectedKeywords = [];
        $lowerContent = mb_strtolower($content);

        foreach (self::BLACKLIST_KEYWORDS as $keyword) {
            if (str_contains($lowerContent, $keyword)) {
                $detectedKeywords[] = $keyword;
            }
        }

        // Check for phone number patterns
        if ($this->containsPhoneNumber($content)) {
            $detectedKeywords[] = 'phone_number_detected';
        }

        // Check for email patterns
        if ($this->containsEmail($content)) {
            $detectedKeywords[] = 'email_detected';
        }

        $isApproved = empty($detectedKeywords);

        return [
            'is_approved' => $isApproved,
            'detected_keywords' => $detectedKeywords,
            'status' => $isApproved ? 'APPROUVE' : 'EN_ATTENTE',
            'requires_manual_review' => !$isApproved,
        ];
    }

    /**
     * Check if content contains phone number
     */
    private function containsPhoneNumber(string $content): bool
    {
        // Guinea phone number patterns: +224 6XX XXX XXX or 6XX XXX XXX
        $patterns = [
            '/\+224\s*6\d{2}\s*\d{3}\s*\d{3}/',
            '/6\d{2}\s*\d{3}\s*\d{3}/',
            '/\d{9,}/', // Generic 9+ digit sequences
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if content contains email address
     */
    private function containsEmail(string $content): bool
    {
        $pattern = '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/';

        return preg_match($pattern, $content) === 1;
    }

    /**
     * Sanitize content by removing detected keywords
     */
    public function sanitize(string $content): string
    {
        $sanitized = $content;

        foreach (self::BLACKLIST_KEYWORDS as $keyword) {
            $sanitized = str_ireplace($keyword, str_repeat('*', mb_strlen($keyword)), $sanitized);
        }

        // Remove phone numbers
        $sanitized = preg_replace('/\+224\s*6\d{2}\s*\d{3}\s*\d{3}/', '[NUMÉRO MASQUÉ]', $sanitized);
        $sanitized = preg_replace('/6\d{2}\s*\d{3}\s*\d{3}/', '[NUMÉRO MASQUÉ]', $sanitized);

        // Remove emails
        $sanitized = preg_replace(
            '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/',
            '[EMAIL MASQUÉ]',
            $sanitized
        );

        return $sanitized;
    }

    /**
     * Get moderation statistics for admin dashboard
     */
    public function getStatistics(): array
    {
        return [
            'total_moderated' => \DB::table('ratings')->count(),
            'auto_approved' => \DB::table('ratings')->where('statut_moderation', 'APPROUVE')->count(),
            'pending_review' => \DB::table('ratings')->where('statut_moderation', 'EN_ATTENTE')->count(),
            'rejected' => \DB::table('ratings')->where('statut_moderation', 'REJETE')->count(),
            'most_common_keywords' => $this->getMostCommonKeywords(),
        ];
    }

    /**
     * Get most frequently detected keywords
     */
    private function getMostCommonKeywords(): array
    {
        $ratings = \DB::table('ratings')
            ->whereNotNull('mots_cles_detectes')
            ->get();

        $keywordCounts = [];

        foreach ($ratings as $rating) {
            $keywords = json_decode($rating->mots_cles_detectes, true) ?? [];
            foreach ($keywords as $keyword) {
                $keywordCounts[$keyword] = ($keywordCounts[$keyword] ?? 0) + 1;
            }
        }

        arsort($keywordCounts);

        return array_slice($keywordCounts, 0, 10, true);
    }
}
