<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Bootstrap the console kernel.
     */
    public function bootstrap(): void
    {
        parent::bootstrap();

        // Run WAHA session check immediately on scheduler startup
        // This ensures the session is started as soon as possible after a restart
        if ($this->isRunningScheduler()) {
            $this->ensureWahaSessionOnStartup();
        }
    }

    /**
     * Check if we're running the scheduler.
     */
    protected function isRunningScheduler(): bool
    {
        return isset($_SERVER['argv']) &&
               in_array('schedule:run', $_SERVER['argv'], true);
    }

    /**
     * Ensure WAHA session is running on scheduler startup.
     */
    protected function ensureWahaSessionOnStartup(): void
    {
        static $hasRun = false;

        if ($hasRun) {
            return;
        }
        $hasRun = true;

        // Use a cache flag to prevent running too frequently
        $cacheKey = 'waha_startup_check_' . date('Y-m-d-H-i');
        if (cache()->has($cacheKey)) {
            return;
        }
        cache()->put($cacheKey, true, 60);

        try {
            \Artisan::call('waha:ensure-session');
            \Log::info('[WAHA] Startup session check completed');
        } catch (\Exception $e) {
            \Log::error('[WAHA] Startup session check failed: ' . $e->getMessage());
        }
    }

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Check expired listings daily at 2:00 AM
        $schedule->command('listings:check-expired')
            ->dailyAt('02:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('CheckExpiredListingsCommand completed successfully');
            })
            ->onFailure(function () {
                \Log::error('CheckExpiredListingsCommand failed');
            });

        // Re-index Elasticsearch weekly on Sunday at 3:00 AM
        $schedule->command('listings:index-elasticsearch')
            ->weeklyOn(0, '03:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('IndexListingsInElasticsearch completed successfully');
            })
            ->onFailure(function () {
                \Log::error('IndexListingsInElasticsearch failed');
            });

        // Clean up old notifications (optional)
        $schedule->command('notifications:clean')
            ->weekly()
            ->withoutOverlapping();

        // FR-053: Check badge upgrades daily at 4:00 AM
        $schedule->command('immog:check-badge-upgrades')
            ->dailyAt('04:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::channel('certification')->info('Badge upgrade check completed');
            })
            ->onFailure(function () {
                \Log::channel('certification')->error('Badge upgrade check failed');
            });

        // FR-058: Check badge downgrades weekly on Monday at 5:00 AM
        $schedule->command('immog:check-badge-downgrades')
            ->weeklyOn(1, '05:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::channel('certification')->info('Badge downgrade check completed');
            })
            ->onFailure(function () {
                \Log::channel('certification')->error('Badge downgrade check failed');
            });

        // FR-071: Update average ratings nightly at 3:30 AM
        $schedule->command('immog:update-average-ratings')
            ->dailyAt('03:30')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::channel('ratings')->info('Average ratings update completed');
            })
            ->onFailure(function () {
                \Log::channel('ratings')->error('Average ratings update failed');
            });

        // FR-073: Auto-assign mediators to unassigned disputes daily at 9:00 AM
        $schedule->command('immog:assign-mediators')
            ->dailyAt('09:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::channel('disputes')->info('Mediator auto-assignment completed');
            })
            ->onFailure(function () {
                \Log::channel('disputes')->error('Mediator auto-assignment failed');
            });

        // ============================================
        // Backup Tasks
        // These tasks signal when backups should run
        // Actual execution is handled by Docker services
        // ============================================

        // PostgreSQL backup daily at 2:00 AM UTC
        // Executed by: docker service scale immo_backup-postgres=1
        $schedule->call(function () {
            \Log::channel('backup')->info('[BACKUP] PostgreSQL backup scheduled - triggering Docker service');
            // Signal file for external backup trigger
            file_put_contents(storage_path('app/backup-trigger'), date('Y-m-d H:i:s'));
        })
            ->dailyAt('02:00')
            ->timezone('UTC')
            ->name('backup:postgres')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::channel('backup')->info('[BACKUP] PostgreSQL backup trigger completed');
            })
            ->onFailure(function () {
                \Log::channel('backup')->error('[BACKUP] PostgreSQL backup trigger failed');
            });

        // ============================================
        // Storage Tasks
        // DigitalOcean Spaces is now primary storage
        // MinIO is only used as temporary cache
        // ============================================

        // MinIO cache cleanup daily at 3:00 AM UTC
        // Removes files older than 48 hours from MinIO
        $schedule->command('minio:cleanup --hours=48')
            ->dailyAt('03:00')
            ->timezone('UTC')
            ->name('storage:minio-cleanup')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('[STORAGE] MinIO cache cleanup completed');
            })
            ->onFailure(function () {
                \Log::error('[STORAGE] MinIO cache cleanup failed');
            });

        // ============================================
        // WAHA WhatsApp Session Health Check
        // CRITICAL: Ensures OTP messages can be sent
        // ============================================

        // Check WAHA session every minute for rapid recovery
        $schedule->command('waha:ensure-session')
            ->everyMinute()
            ->withoutOverlapping()
            ->runInBackground()
            ->onSuccess(function () {
                \Log::info('[WAHA] Session health check passed');
            })
            ->onFailure(function () {
                \Log::error('[WAHA] Session health check failed - OTP messages may not work!');
            });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
