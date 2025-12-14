<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TimezoneService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T241: Locale and i18n Feature Tests
 *
 * Tests internationalization features for diaspora users:
 * - Locale detection and management
 * - Timezone handling for notifications
 * - Multi-language support (FR-092)
 */
class LocaleTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private TimezoneService $timezoneService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'preferences' => [
                'locale' => 'fr',
                'timezone' => 'Africa/Conakry',
            ],
        ]);

        $this->timezoneService = new TimezoneService();
    }

    // ==================== LOCALE ENDPOINT TESTS ====================

    /** @test */
    public function can_list_available_locales(): void
    {
        $response = $this->getJson('/api/locales');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'code',
                        'name',
                        'native_name',
                        'direction',
                        'flag',
                    ],
                ],
                'default',
                'supported',
            ])
            ->assertJsonFragment(['default' => 'fr'])
            ->assertJsonFragment(['code' => 'fr'])
            ->assertJsonFragment(['code' => 'ar'])
            ->assertJsonFragment(['code' => 'en']);
    }

    /** @test */
    public function can_get_specific_locale_details(): void
    {
        $response = $this->getJson('/api/locales/ar');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'code' => 'ar',
                    'native_name' => 'العربية',
                    'direction' => 'rtl',
                ],
            ]);
    }

    /** @test */
    public function returns_404_for_unsupported_locale(): void
    {
        $response = $this->getJson('/api/locales/zh');

        $response->assertStatus(404)
            ->assertJsonStructure(['message', 'available']);
    }

    /** @test */
    public function can_detect_locale_from_accept_language_header(): void
    {
        $response = $this->withHeader('Accept-Language', 'ar-SA,ar;q=0.9,en;q=0.8')
            ->getJson('/api/locales/detect');

        $response->assertStatus(200)
            ->assertJson([
                'detected' => 'ar',
            ]);
    }

    /** @test */
    public function defaults_to_french_when_locale_not_detected(): void
    {
        $response = $this->withHeader('Accept-Language', 'zh-CN,zh;q=0.9')
            ->getJson('/api/locales/detect');

        $response->assertStatus(200)
            ->assertJson([
                'detected' => 'fr',
            ]);
    }

    /** @test */
    public function user_can_update_locale_preference(): void
    {
        $response = $this->actingAs($this->user)
            ->patchJson('/api/auth/me/locale', [
                'locale' => 'ar',
            ]);

        $response->assertStatus(200);

        $this->user->refresh();
        $this->assertEquals('ar', $this->user->preferences['locale']);
    }

    /** @test */
    public function locale_update_validates_supported_locales(): void
    {
        $response = $this->actingAs($this->user)
            ->patchJson('/api/auth/me/locale', [
                'locale' => 'invalid',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['locale']);
    }

    // ==================== TIMEZONE SERVICE TESTS ====================

    /** @test */
    public function can_get_user_timezone(): void
    {
        $timezone = $this->timezoneService->getUserTimezone($this->user);

        $this->assertEquals('Africa/Conakry', $timezone);
    }

    /** @test */
    public function can_convert_datetime_to_user_timezone(): void
    {
        // User in Paris timezone
        $this->user->preferences = ['timezone' => 'Europe/Paris'];
        $this->user->save();

        $utcTime = Carbon::parse('2025-01-15 12:00:00', 'UTC');
        $userTime = $this->timezoneService->toUserTimezone($utcTime, $this->user);

        // Paris is UTC+1 in winter
        $this->assertEquals('Europe/Paris', $userTime->timezone->getName());
        $this->assertEquals(13, $userTime->hour);
    }

    /** @test */
    public function can_convert_datetime_from_user_timezone(): void
    {
        $this->user->preferences = ['timezone' => 'America/New_York'];
        $this->user->save();

        $userTime = Carbon::parse('2025-01-15 12:00:00', 'America/New_York');
        $utcTime = $this->timezoneService->fromUserTimezone($userTime, $this->user);

        $this->assertEquals('UTC', $utcTime->timezone->getName());
        // New York is UTC-5 in winter
        $this->assertEquals(17, $utcTime->hour);
    }

    /** @test */
    public function can_detect_quiet_hours(): void
    {
        // Set user to timezone where it's currently night
        $this->user->preferences = ['timezone' => 'Asia/Dubai']; // UTC+4
        $this->user->save();

        // Test at different times
        Carbon::setTestNow(Carbon::parse('2025-01-15 20:00:00', 'UTC')); // Midnight in Dubai

        $isQuiet = $this->timezoneService->isQuietHours($this->user);

        // Reset test time
        Carbon::setTestNow();

        // At midnight Dubai time (22:00-07:00 is quiet)
        $this->assertTrue($isQuiet);
    }

    /** @test */
    public function can_get_next_notification_time(): void
    {
        $this->user->preferences = ['timezone' => 'Europe/Paris'];
        $this->user->save();

        // Set time to 23:00 Paris (quiet hours)
        Carbon::setTestNow(Carbon::parse('2025-01-15 22:00:00', 'UTC')); // 23:00 Paris

        $nextTime = $this->timezoneService->getNextNotificationTime($this->user);

        // Should be next morning at 07:00 Paris time (06:00 UTC in winter)
        $this->assertGreaterThan(now(), $nextTime);

        Carbon::setTestNow();
    }

    /** @test */
    public function can_format_datetime_for_user(): void
    {
        $this->user->preferences = [
            'timezone' => 'Europe/Paris',
            'locale' => 'fr',
        ];
        $this->user->save();

        $datetime = Carbon::parse('2025-01-15 12:00:00', 'UTC');
        $formatted = $this->timezoneService->formatForUser($datetime, $this->user, 'date');

        // Should be formatted in French
        $this->assertStringContainsString('janvier', $formatted);
        $this->assertStringContainsString('2025', $formatted);
    }

    /** @test */
    public function can_validate_timezone(): void
    {
        $this->assertTrue($this->timezoneService->isValidTimezone('Europe/Paris'));
        $this->assertTrue($this->timezoneService->isValidTimezone('America/New_York'));
        $this->assertFalse($this->timezoneService->isValidTimezone('Invalid/Timezone'));
    }

    /** @test */
    public function can_detect_timezone_from_country(): void
    {
        $this->assertEquals('Africa/Conakry', $this->timezoneService->detectFromCountry('GN'));
        $this->assertEquals('Europe/Paris', $this->timezoneService->detectFromCountry('FR'));
        $this->assertEquals('America/New_York', $this->timezoneService->detectFromCountry('US'));
        $this->assertEquals('Africa/Conakry', $this->timezoneService->detectFromCountry('XX')); // Unknown defaults to Conakry
    }

    /** @test */
    public function can_get_timezone_offset_hours(): void
    {
        $this->assertEquals(0.0, $this->timezoneService->getOffsetHours('UTC'));
        // Note: These may vary based on DST
        $this->assertIsFloat($this->timezoneService->getOffsetHours('Europe/Paris'));
        $this->assertIsFloat($this->timezoneService->getOffsetHours('America/New_York'));
    }

    // ==================== USER TIMEZONE PREFERENCE TESTS ====================

    /** @test */
    public function user_can_update_timezone_preference(): void
    {
        $response = $this->actingAs($this->user)
            ->patchJson('/api/auth/me/timezone', [
                'timezone' => 'Europe/Paris',
            ]);

        $response->assertStatus(200);

        $this->user->refresh();
        $this->assertEquals('Europe/Paris', $this->user->preferences['timezone']);
    }

    /** @test */
    public function timezone_update_validates_valid_timezones(): void
    {
        $response = $this->actingAs($this->user)
            ->patchJson('/api/auth/me/timezone', [
                'timezone' => 'Invalid/Timezone',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['timezone']);
    }

    // ==================== RTL SUPPORT TESTS ====================

    /** @test */
    public function arabic_locale_returns_rtl_direction(): void
    {
        $response = $this->getJson('/api/locales/ar');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'direction' => 'rtl',
                ],
            ]);
    }

    /** @test */
    public function french_locale_returns_ltr_direction(): void
    {
        $response = $this->getJson('/api/locales/fr');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'direction' => 'ltr',
                ],
            ]);
    }

    // ==================== AVAILABLE TIMEZONES TESTS ====================

    /** @test */
    public function can_get_available_timezones(): void
    {
        $timezones = $this->timezoneService->getAvailableTimezones();

        $this->assertIsArray($timezones);
        $this->assertArrayHasKey('Africa/Conakry', $timezones);
        $this->assertArrayHasKey('Europe/Paris', $timezones);
        $this->assertArrayHasKey('America/New_York', $timezones);
    }
}
