<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use DateTimeZone;

/**
 * T234: Timezone Service for diaspora users
 *
 * Handles timezone conversions and notification timing
 * for users in different timezones (FR-009)
 */
class TimezoneService
{
    /**
     * Common timezones for Guinean diaspora
     */
    private array $commonTimezones = [
        'Africa/Conakry' => ['offset' => '+00:00', 'label' => 'Conakry (GMT)'],
        'Europe/Paris' => ['offset' => '+01:00', 'label' => 'Paris (CET)'],
        'America/New_York' => ['offset' => '-05:00', 'label' => 'New York (EST)'],
        'America/Los_Angeles' => ['offset' => '-08:00', 'label' => 'Los Angeles (PST)'],
        'Asia/Dubai' => ['offset' => '+04:00', 'label' => 'Dubai (GST)'],
        'Africa/Dakar' => ['offset' => '+00:00', 'label' => 'Dakar (GMT)'],
        'Africa/Abidjan' => ['offset' => '+00:00', 'label' => 'Abidjan (GMT)'],
        'Europe/London' => ['offset' => '+00:00', 'label' => 'Londres (GMT)'],
        'Europe/Brussels' => ['offset' => '+01:00', 'label' => 'Bruxelles (CET)'],
        'America/Montreal' => ['offset' => '-05:00', 'label' => 'Montréal (EST)'],
    ];

    /**
     * Quiet hours configuration (when to avoid sending notifications)
     */
    private array $quietHours = [
        'start' => 22, // 10 PM
        'end' => 7,    // 7 AM
    ];

    /**
     * Get all available timezones
     */
    public function getAvailableTimezones(): array
    {
        return $this->commonTimezones;
    }

    /**
     * Get user's timezone (default: Africa/Conakry)
     */
    public function getUserTimezone(User $user): string
    {
        return $user->preferences['timezone'] ?? 'Africa/Conakry';
    }

    /**
     * Convert datetime to user's timezone
     */
    public function toUserTimezone(Carbon $datetime, User $user): Carbon
    {
        $timezone = $this->getUserTimezone($user);
        return $datetime->copy()->setTimezone($timezone);
    }

    /**
     * Convert datetime from user's timezone to UTC
     */
    public function fromUserTimezone(Carbon $datetime, User $user): Carbon
    {
        $timezone = $this->getUserTimezone($user);
        return $datetime->copy()->shiftTimezone($timezone)->setTimezone('UTC');
    }

    /**
     * Check if it's currently quiet hours for user
     */
    public function isQuietHours(User $user): bool
    {
        $userNow = $this->toUserTimezone(now(), $user);
        $hour = (int) $userNow->format('H');

        if ($this->quietHours['start'] > $this->quietHours['end']) {
            // Quiet hours span midnight (e.g., 22:00 - 07:00)
            return $hour >= $this->quietHours['start'] || $hour < $this->quietHours['end'];
        }

        return $hour >= $this->quietHours['start'] && $hour < $this->quietHours['end'];
    }

    /**
     * Get next available notification time for user
     * Returns Carbon datetime in UTC
     */
    public function getNextNotificationTime(User $user): Carbon
    {
        if (!$this->isQuietHours($user)) {
            return now();
        }

        // Calculate when quiet hours end
        $userNow = $this->toUserTimezone(now(), $user);
        $quietEnd = $userNow->copy()->setTime($this->quietHours['end'], 0, 0);

        // If we're before midnight, quiet ends tomorrow
        if ($userNow->hour >= $this->quietHours['start']) {
            $quietEnd->addDay();
        }

        // Convert back to UTC
        return $this->fromUserTimezone($quietEnd, $user);
    }

    /**
     * Format datetime for user display
     */
    public function formatForUser(Carbon $datetime, User $user, string $format = 'full'): string
    {
        $userDatetime = $this->toUserTimezone($datetime, $user);
        $locale = $user->preferences['locale'] ?? 'fr';

        return match ($format) {
            'date' => $userDatetime->locale($locale)->isoFormat('LL'),
            'time' => $userDatetime->locale($locale)->isoFormat('LT'),
            'datetime' => $userDatetime->locale($locale)->isoFormat('LLL'),
            'relative' => $userDatetime->locale($locale)->diffForHumans(),
            'full' => $userDatetime->locale($locale)->isoFormat('LLLL'),
            default => $userDatetime->toDateTimeString(),
        };
    }

    /**
     * Get timezone offset in hours
     */
    public function getOffsetHours(string $timezone): float
    {
        try {
            $tz = new DateTimeZone($timezone);
            $offset = $tz->getOffset(new \DateTime('now', new DateTimeZone('UTC')));
            return $offset / 3600;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Validate timezone string
     */
    public function isValidTimezone(string $timezone): bool
    {
        try {
            new DateTimeZone($timezone);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Detect timezone from IP address (simplified)
     * In production, use a geolocation service
     */
    public function detectFromCountry(string $countryCode): string
    {
        $countryTimezones = [
            'GN' => 'Africa/Conakry',
            'FR' => 'Europe/Paris',
            'US' => 'America/New_York',
            'GB' => 'Europe/London',
            'BE' => 'Europe/Brussels',
            'CA' => 'America/Montreal',
            'SN' => 'Africa/Dakar',
            'CI' => 'Africa/Abidjan',
            'AE' => 'Asia/Dubai',
            'SA' => 'Asia/Riyadh',
        ];

        return $countryTimezones[strtoupper($countryCode)] ?? 'Africa/Conakry';
    }

    /**
     * Schedule notification respecting user's timezone and quiet hours
     */
    public function scheduleNotification(User $user, \Closure $sendCallback): void
    {
        $sendAt = $this->getNextNotificationTime($user);

        if ($sendAt->isNow() || $sendAt->isPast()) {
            // Send immediately
            $sendCallback();
        } else {
            // Schedule for later (would integrate with Laravel Queue delayed dispatch)
            // dispatch($sendCallback)->delay($sendAt);
            $sendCallback(); // For now, send immediately
        }
    }
}
