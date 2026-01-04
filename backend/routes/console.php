<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

/*
|--------------------------------------------------------------------------
| Console Schedule
|--------------------------------------------------------------------------
|
| Here you may define all of your scheduled commands. These commands will
| run automatically according to the schedule defined below.
|
*/

// Check escrow timeouts every hour (FR-045)
Schedule::command('escrow:check-timeouts')->hourly();

// Send rent payment reminders 3 days before due date (FR-049)
Schedule::command('rent:send-reminders --days=3')->dailyAt('09:00');

// Process pending document verifications (FR-054)
Schedule::command('verifications:process --limit=20')->everyFiveMinutes();

// Clean up expired listings after 90 days
Schedule::command('listings:clean-expired --days=90')->daily();

// Generate daily analytics report (FR-084)
Schedule::command('analytics:generate daily')->dailyAt('00:30');

// Generate weekly analytics report
Schedule::command('analytics:generate weekly')->weekly()->mondays()->at('01:00');

// Generate monthly analytics report
Schedule::command('analytics:generate monthly')->monthlyOn(1, '02:00');

// Generate sitemap for SEO (FR-027)
Schedule::command('sitemap:generate')->daily();

// Backup database daily at 3 AM (FR-086)
Schedule::command('db:backup --compress')->dailyAt('03:00');

// Auto-expire listings after 30 days (FR-013)
Schedule::command('listings:expire')->daily();

// Clean up expired OTP codes
// Removed: otp:cleanup command does not exist

// Sync Elasticsearch index
Schedule::command('scout:import "App\\Models\\Listing"')->hourly();

// Generate monthly reports
Schedule::command('reports:generate')->monthlyOn(1, '00:00');

// Clean up old contracts (archive after 10 years - FR-032)
Schedule::command('contracts:archive')->yearly();

// Verify contract integrity weekly (detect tampering/corruption)
Schedule::command('contracts:verify-integrity --all')->weekly()->sundays()->at('04:00');

// Daily integrity check for recently archived contracts
Schedule::command('contracts:verify-integrity --all')
    ->daily()
    ->at('05:00')
    ->when(function () {
        // Only run if there are contracts archived in the last 7 days
        return \App\Models\IntegrityAudit::where('archived_at', '>=', now()->subDays(7))->exists();
    });

/*
|--------------------------------------------------------------------------
| Encrypted Media Management
|--------------------------------------------------------------------------
|
| - Reminders: WAHA notification after 3 days if media not downloaded
| - Cleanup: Delete media after 5 days if not downloaded, or if listing unavailable
|
*/

// Send WAHA reminders for undownloaded media (3+ days old) - daily at 10:00 AM Conakry time
Schedule::command('media:send-reminders')
    ->dailyAt('10:00')
    ->timezone('Africa/Conakry')
    ->withoutOverlapping()
    ->onSuccess(fn () => \Log::info('[MEDIA] Download reminders sent successfully'))
    ->onFailure(fn () => \Log::error('[MEDIA] Failed to send download reminders'));

// Cleanup expired/unavailable encrypted media - hourly
Schedule::command('media:cleanup-encrypted --include-downloaded')
    ->hourly()
    ->withoutOverlapping()
    ->onSuccess(fn () => \Log::info('[MEDIA] Encrypted media cleanup completed'))
    ->onFailure(fn () => \Log::error('[MEDIA] Encrypted media cleanup failed'));

/*
|--------------------------------------------------------------------------
| Visit Reminders
|--------------------------------------------------------------------------
|
| Send reminders 24h and 12h before scheduled visits
|
*/

// Send visit reminders every hour (checks for visits 24h and 12h away)
Schedule::command('visits:send-reminders')
    ->hourly()
    ->timezone('Africa/Conakry')
    ->withoutOverlapping()
    ->onSuccess(fn () => \Log::info('[VISITS] Reminders sent successfully'))
    ->onFailure(fn () => \Log::error('[VISITS] Failed to send reminders'));
