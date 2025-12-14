<?php

namespace App\Services;

use App\Models\Message;
use App\Models\User;
use App\Models\Conversation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * T187 [US6] FraudDetectionService
 * FR-065: Detect fraud attempts and suspicious activity in messages
 *
 * Analyzes messages for phone numbers, external links, suspicious keywords,
 * and other indicators of potential fraud or scam attempts.
 */
class FraudDetectionService
{
    /**
     * Phone number patterns to detect
     */
    private const PHONE_PATTERNS = [
        '/(?:\+?224|00224)?[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{0,3}/',
        '/(?:\+?(?:1|33|225|221|223))[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{2,3}/',
        '/\d{8,15}/', // Generic long number sequences
    ];

    /**
     * External link patterns
     */
    private const LINK_PATTERNS = [
        '/https?:\/\/[^\s]+/',
        '/www\.[^\s]+/',
        '/[a-zA-Z0-9-]+\.(com|org|net|io|fr|gn|info)[^\s]*/i',
    ];

    /**
     * Suspicious keywords in French
     */
    private const SUSPICIOUS_KEYWORDS = [
        // Payment scams
        'western union', 'money gram', 'moneygram', 'virement urgent',
        'transfert argent', 'envoyer argent', 'avance paiement',
        'frais dossier', 'frais agence', 'commission avance',

        // Identity/info harvesting
        'carte identité', 'passeport', 'mot de passe', 'code secret',
        'numéro compte', 'iban', 'swift', 'rib',

        // Urgency tactics
        'urgent', 'immédiatement', 'vite', 'dernière chance',
        'offre limitée', 'aujourd\'hui seulement',

        // Too good to be true
        'gratuit', 'prix négociable 50%', 'moitié prix',
        'gagné', 'félicitations', 'héritage',

        // Off-platform
        'appeler moi', 'contactez moi sur', 'whatsapp', 'telegram',
        'viber', 'signal', 'hors plateforme',

        // Suspicious behavior
        'ne pas utiliser plateforme', 'contourner', 'éviter commission',
        'pas besoin contrat', 'sans contrat', 'cash seulement',
    ];

    /**
     * Analyze a message for potential fraud
     */
    public function analyze(Message $message): array
    {
        $content = strtolower($message->contenu_texte ?? '');

        $result = [
            'is_suspicious' => false,
            'risk_score' => 0,
            'flags' => [],
            'details' => [],
        ];

        // Check for phone numbers
        $phoneDetection = $this->detectPhoneNumbers($content);
        if ($phoneDetection['found']) {
            $result['risk_score'] += 30;
            $result['flags'][] = 'phone_number_shared';
            $result['details']['phone_numbers'] = $phoneDetection['matches'];
        }

        // Check for external links
        $linkDetection = $this->detectExternalLinks($content);
        if ($linkDetection['found']) {
            $result['risk_score'] += 20;
            $result['flags'][] = 'external_link_shared';
            $result['details']['links'] = $linkDetection['matches'];
        }

        // Check for suspicious keywords
        $keywordDetection = $this->detectSuspiciousKeywords($content);
        if ($keywordDetection['found']) {
            $result['risk_score'] += $keywordDetection['score'];
            $result['flags'][] = 'suspicious_keywords';
            $result['details']['keywords'] = $keywordDetection['matches'];
        }

        // Check sender behavior patterns
        $behaviorAnalysis = $this->analyzeSenderBehavior($message);
        $result['risk_score'] += $behaviorAnalysis['score'];
        if (!empty($behaviorAnalysis['flags'])) {
            $result['flags'] = array_merge($result['flags'], $behaviorAnalysis['flags']);
        }

        // Determine if suspicious (threshold: 40)
        $result['is_suspicious'] = $result['risk_score'] >= 40;

        // Log if suspicious
        if ($result['is_suspicious']) {
            $this->logSuspiciousActivity($message, $result);
        }

        return $result;
    }

    /**
     * Detect phone numbers in text
     */
    private function detectPhoneNumbers(string $text): array
    {
        $matches = [];

        foreach (self::PHONE_PATTERNS as $pattern) {
            if (preg_match_all($pattern, $text, $found)) {
                $matches = array_merge($matches, $found[0]);
            }
        }

        // Filter out false positives (prices, dates, etc.)
        $matches = array_filter($matches, function ($match) {
            $cleaned = preg_replace('/[^0-9]/', '', $match);
            return strlen($cleaned) >= 8; // Phone numbers are at least 8 digits
        });

        return [
            'found' => !empty($matches),
            'matches' => array_values(array_unique($matches)),
        ];
    }

    /**
     * Detect external links in text
     */
    private function detectExternalLinks(string $text): array
    {
        $matches = [];

        foreach (self::LINK_PATTERNS as $pattern) {
            if (preg_match_all($pattern, $text, $found)) {
                $matches = array_merge($matches, $found[0]);
            }
        }

        // Filter out ImmoGuinée links
        $matches = array_filter($matches, function ($link) {
            return !str_contains($link, 'immoguinee') &&
                   !str_contains($link, 'immog.');
        });

        return [
            'found' => !empty($matches),
            'matches' => array_values(array_unique($matches)),
        ];
    }

    /**
     * Detect suspicious keywords in text
     */
    private function detectSuspiciousKeywords(string $text): array
    {
        $matches = [];
        $score = 0;

        foreach (self::SUSPICIOUS_KEYWORDS as $keyword) {
            if (str_contains($text, strtolower($keyword))) {
                $matches[] = $keyword;
                $score += 10;
            }
        }

        return [
            'found' => !empty($matches),
            'matches' => $matches,
            'score' => min($score, 50), // Cap at 50
        ];
    }

    /**
     * Analyze sender behavior patterns
     */
    private function analyzeSenderBehavior(Message $message): array
    {
        $sender = $message->sender;
        $flags = [];
        $score = 0;

        // Check if new account
        if ($sender->created_at->diffInDays(now()) < 7) {
            $flags[] = 'new_account';
            $score += 10;
        }

        // Check if unverified
        if ($sender->statut_verification === 'NON_VERIFIE') {
            $flags[] = 'unverified_sender';
            $score += 5;
        }

        // Check message rate (spam detection)
        $recentMessages = Cache::get("message_count:{$sender->id}", 0);
        if ($recentMessages > 20) {
            $flags[] = 'high_message_volume';
            $score += 15;
        }

        // Check if first message in conversation is very long
        $conversation = $message->conversation;
        $isFirstMessage = $conversation->messages()->count() === 1;
        if ($isFirstMessage && strlen($message->contenu_texte ?? '') > 500) {
            $flags[] = 'long_first_message';
            $score += 10;
        }

        return [
            'flags' => $flags,
            'score' => $score,
        ];
    }

    /**
     * Log suspicious activity for admin review
     */
    private function logSuspiciousActivity(Message $message, array $analysis): void
    {
        Log::channel('fraud')->warning('Suspicious message detected', [
            'message_id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->expediteur_id,
            'risk_score' => $analysis['risk_score'],
            'flags' => $analysis['flags'],
            'details' => $analysis['details'],
        ]);

        // Create admin notification
        \App\Models\Notification::create([
            'user_id' => null, // System notification for admins
            'type' => 'fraud_detection',
            'titre' => 'Message suspect détecté',
            'message' => "Score de risque: {$analysis['risk_score']}",
            'data' => [
                'message_id' => $message->id,
                'analysis' => $analysis,
            ],
            'lu' => false,
        ]);
    }

    /**
     * Check if user should be flagged for review
     */
    public function shouldFlagUser(User $user): bool
    {
        $cacheKey = "fraud_flags:{$user->id}";
        $flagCount = Cache::get($cacheKey, 0);

        return $flagCount >= 3;
    }

    /**
     * Increment fraud flag count for user
     */
    public function incrementFlagCount(User $user): void
    {
        $cacheKey = "fraud_flags:{$user->id}";
        Cache::increment($cacheKey);
        Cache::put($cacheKey, Cache::get($cacheKey, 1), now()->addDays(30));
    }

    /**
     * Mask phone numbers in message content for display
     */
    public function maskPhoneNumbers(string $text): string
    {
        foreach (self::PHONE_PATTERNS as $pattern) {
            $text = preg_replace_callback($pattern, function ($matches) {
                $number = $matches[0];
                $cleaned = preg_replace('/[^0-9]/', '', $number);
                if (strlen($cleaned) >= 8) {
                    return '***-***-****';
                }
                return $number;
            }, $text);
        }

        return $text;
    }

    /**
     * Mask external links in message content
     */
    public function maskExternalLinks(string $text): string
    {
        foreach (self::LINK_PATTERNS as $pattern) {
            $text = preg_replace_callback($pattern, function ($matches) {
                $link = $matches[0];
                if (!str_contains($link, 'immoguinee') && !str_contains($link, 'immog.')) {
                    return '[lien masqué]';
                }
                return $link;
            }, $text);
        }

        return $text;
    }
}
