<?php

namespace App\Console\Commands;

use App\Services\ImageWatermarkService;
use Illuminate\Console\Command;

/**
 * Clean up old temporary watermarked files.
 *
 * This command removes temporary watermarked images that are older than
 * a specified age. Should be run periodically via cron to prevent disk
 * space accumulation.
 *
 * @see App\Services\ImageWatermarkService
 */
class CleanupWatermarkedFilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'watermark:cleanup
                            {--minutes=60 : Delete files older than this many minutes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up old temporary watermarked files from Facebook publishing';

    /**
     * Execute the console command.
     */
    public function handle(ImageWatermarkService $watermarkService): int
    {
        $minutes = (int) $this->option('minutes');

        $this->info("Cleaning up watermarked files older than {$minutes} minutes...");

        $cleaned = $watermarkService->cleanupOldFiles($minutes);

        if ($cleaned > 0) {
            $this->info("Cleaned up {$cleaned} temporary watermarked file(s).");
        } else {
            $this->info('No old watermarked files to clean up.');
        }

        return Command::SUCCESS;
    }
}
