<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

/**
 * T188 [US6] RateLimitService
 * FR-066: Rate limiting for messaging (50 msg/h, 10 new conv/day)
 *
 * Implements rate limiting to prevent spam and abuse in the messaging system.
 */
class RateLimitService
{
    /**
     * Rate limit configurations
     */
    private const LIMITS = [
        'messages_per_hour' => 50,
        'new_conversations_per_day' => 10,
        'messages_per_conversation_per_hour' => 20,
        'reports_per_day' => 5,
    ];

    /**
     * Badge-based multipliers (higher badges get more lenient limits)
     */
    private const BADGE_MULTIPLIERS = [
        'BRONZE' => 1.0,
        'ARGENT' => 1.5,
        'OR' => 2.0,
        'DIAMANT' => 3.0,
    ];

    /**
     * Check if user can send a message
     */
    public function canSendMessage(User $user): array
    {
        $hourlyKey = $this->getHourlyMessageKey($user->id);
        $currentCount = (int) Cache::get($hourlyKey, 0);
        $limit = $this->getAdjustedLimit('messages_per_hour', $user);

        $allowed = $currentCount < $limit;

        return [
            'allowed' => $allowed,
            'current' => $currentCount,
            'limit' => $limit,
            'remaining' => max(0, $limit - $currentCount),
            'resets_in' => $allowed ? null : $this->getTimeUntilReset($hourlyKey),
        ];
    }

    /**
     * Record a sent message
     */
    public function recordMessageSent(User $user, string $conversationId): void
    {
        // Increment hourly message count
        $hourlyKey = $this->getHourlyMessageKey($user->id);
        $this->incrementWithExpiry($hourlyKey, 3600);

        // Increment per-conversation count
        $convKey = $this->getConversationMessageKey($user->id, $conversationId);
        $this->incrementWithExpiry($convKey, 3600);
    }

    /**
     * Check if user can start a new conversation
     */
    public function canStartNewConversation(User $user): array
    {
        $dailyKey = $this->getDailyConversationKey($user->id);
        $currentCount = (int) Cache::get($dailyKey, 0);
        $limit = $this->getAdjustedLimit('new_conversations_per_day', $user);

        $allowed = $currentCount < $limit;

        return [
            'allowed' => $allowed,
            'current' => $currentCount,
            'limit' => $limit,
            'remaining' => max(0, $limit - $currentCount),
            'resets_in' => $allowed ? null : $this->getTimeUntilDailyReset(),
        ];
    }

    /**
     * Record a new conversation started
     */
    public function recordNewConversation(User $user): void
    {
        $dailyKey = $this->getDailyConversationKey($user->id);
        $this->incrementWithExpiry($dailyKey, $this->getSecondsUntilMidnight());
    }

    /**
     * Check if user can send in a specific conversation
     */
    public function canSendInConversation(User $user, string $conversationId): array
    {
        $convKey = $this->getConversationMessageKey($user->id, $conversationId);
        $currentCount = (int) Cache::get($convKey, 0);
        $limit = $this->getAdjustedLimit('messages_per_conversation_per_hour', $user);

        $allowed = $currentCount < $limit;

        return [
            'allowed' => $allowed,
            'current' => $currentCount,
            'limit' => $limit,
            'remaining' => max(0, $limit - $currentCount),
            'resets_in' => $allowed ? null : $this->getTimeUntilReset($convKey),
        ];
    }

    /**
     * Check if user can report a message
     */
    public function canReportMessage(User $user): array
    {
        $dailyKey = $this->getDailyReportKey($user->id);
        $currentCount = (int) Cache::get($dailyKey, 0);
        $limit = self::LIMITS['reports_per_day'];

        $allowed = $currentCount < $limit;

        return [
            'allowed' => $allowed,
            'current' => $currentCount,
            'limit' => $limit,
            'remaining' => max(0, $limit - $currentCount),
        ];
    }

    /**
     * Record a message report
     */
    public function recordReport(User $user): void
    {
        $dailyKey = $this->getDailyReportKey($user->id);
        $this->incrementWithExpiry($dailyKey, $this->getSecondsUntilMidnight());
    }

    /**
     * Get all rate limit status for a user
     */
    public function getStatus(User $user): array
    {
        return [
            'messages_per_hour' => $this->canSendMessage($user),
            'new_conversations_per_day' => $this->canStartNewConversation($user),
            'badge' => $user->badge_certification,
            'badge_multiplier' => self::BADGE_MULTIPLIERS[$user->badge_certification] ?? 1.0,
        ];
    }

    /**
     * Reset rate limits for a user (admin action)
     */
    public function resetLimits(User $user): void
    {
        Cache::forget($this->getHourlyMessageKey($user->id));
        Cache::forget($this->getDailyConversationKey($user->id));
        Cache::forget($this->getDailyReportKey($user->id));
    }

    /**
     * Get adjusted limit based on user's badge
     */
    private function getAdjustedLimit(string $limitType, User $user): int
    {
        $baseLimit = self::LIMITS[$limitType] ?? 10;
        $multiplier = self::BADGE_MULTIPLIERS[$user->badge_certification] ?? 1.0;

        return (int) ceil($baseLimit * $multiplier);
    }

    /**
     * Increment a cache key with expiry
     */
    private function incrementWithExpiry(string $key, int $ttl): void
    {
        if (Cache::has($key)) {
            Cache::increment($key);
        } else {
            Cache::put($key, 1, $ttl);
        }
    }

    /**
     * Get hourly message rate limit key
     */
    private function getHourlyMessageKey(string $userId): string
    {
        $hour = date('Y-m-d-H');
        return "rate_limit:messages:{$userId}:{$hour}";
    }

    /**
     * Get daily conversation rate limit key
     */
    private function getDailyConversationKey(string $userId): string
    {
        $date = date('Y-m-d');
        return "rate_limit:conversations:{$userId}:{$date}";
    }

    /**
     * Get per-conversation message rate limit key
     */
    private function getConversationMessageKey(string $userId, string $conversationId): string
    {
        $hour = date('Y-m-d-H');
        return "rate_limit:conv_messages:{$userId}:{$conversationId}:{$hour}";
    }

    /**
     * Get daily report rate limit key
     */
    private function getDailyReportKey(string $userId): string
    {
        $date = date('Y-m-d');
        return "rate_limit:reports:{$userId}:{$date}";
    }

    /**
     * Get time until a cache key resets
     */
    private function getTimeUntilReset(string $key): int
    {
        // Estimate based on key pattern
        if (str_contains($key, date('Y-m-d-H'))) {
            // Hourly key
            return 3600 - (time() % 3600);
        }

        // Daily key
        return $this->getSecondsUntilMidnight();
    }

    /**
     * Get time until daily reset (midnight)
     */
    private function getTimeUntilDailyReset(): int
    {
        return $this->getSecondsUntilMidnight();
    }

    /**
     * Get seconds until midnight (GMT)
     */
    private function getSecondsUntilMidnight(): int
    {
        $now = now();
        $midnight = $now->copy()->addDay()->startOfDay();
        return $now->diffInSeconds($midnight);
    }

    /**
     * Check if user is currently rate limited
     */
    public function isRateLimited(User $user): bool
    {
        $messageCheck = $this->canSendMessage($user);
        $conversationCheck = $this->canStartNewConversation($user);

        return !$messageCheck['allowed'] || !$conversationCheck['allowed'];
    }

    /**
     * Get rate limit error message
     */
    public function getRateLimitMessage(User $user): string
    {
        $messageCheck = $this->canSendMessage($user);
        if (!$messageCheck['allowed']) {
            $minutes = ceil($messageCheck['resets_in'] / 60);
            return "Vous avez atteint la limite de {$messageCheck['limit']} messages par heure. Réessayez dans {$minutes} minutes.";
        }

        $conversationCheck = $this->canStartNewConversation($user);
        if (!$conversationCheck['allowed']) {
            return "Vous avez atteint la limite de {$conversationCheck['limit']} nouvelles conversations par jour. Réessayez demain.";
        }

        return "Limite de débit atteinte. Veuillez patienter.";
    }
}
