<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Cleanup old files from MinIO cache.
 *
 * Since DigitalOcean Spaces is now the primary storage,
 * MinIO is only used as temporary cache for upload processing.
 * This command removes files older than the retention period.
 */
class CleanupMinioCommand extends Command
{
    protected $signature = 'minio:cleanup
                            {--hours=48 : Delete files older than this many hours}
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--bucket=all : Specific bucket to clean (listings, documents, avatars, messages, certificates) or all}';

    protected $description = 'Clean up old files from MinIO temporary cache';

    /**
     * MinIO buckets to clean.
     */
    protected array $buckets = [
        'listings-minio' => 'listings',
        'documents' => 'documents',
        'avatars' => 'avatars',
        'messages' => 'messages',
        'certificates' => 'certificates',
    ];

    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $dryRun = $this->option('dry-run');
        $targetBucket = $this->option('bucket');
        $cutoffTime = Carbon::now()->subHours($hours);

        $this->info("Cleaning MinIO files older than {$hours} hours (before {$cutoffTime})");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No files will be deleted');
        }

        $totalDeleted = 0;
        $totalSize = 0;

        foreach ($this->buckets as $disk => $bucketName) {
            // Skip if specific bucket requested and this isn't it
            if ($targetBucket !== 'all' && $bucketName !== $targetBucket) {
                continue;
            }

            $this->info("\nProcessing bucket: {$bucketName} (disk: {$disk})");

            try {
                $storage = Storage::disk($disk);
                $files = $storage->allFiles();

                $bucketDeleted = 0;
                $bucketSize = 0;

                foreach ($files as $file) {
                    try {
                        $lastModified = Carbon::createFromTimestamp($storage->lastModified($file));

                        if ($lastModified->lt($cutoffTime)) {
                            $fileSize = $storage->size($file);

                            if ($dryRun) {
                                $this->line("  Would delete: {$file} (modified: {$lastModified}, size: " . $this->formatBytes($fileSize) . ")");
                            } else {
                                $storage->delete($file);
                                $this->line("  Deleted: {$file}");
                            }

                            $bucketDeleted++;
                            $bucketSize += $fileSize;
                        }
                    } catch (\Exception $e) {
                        $this->warn("  Error processing {$file}: " . $e->getMessage());
                    }
                }

                $this->info("  {$bucketName}: {$bucketDeleted} files (" . $this->formatBytes($bucketSize) . ")");

                $totalDeleted += $bucketDeleted;
                $totalSize += $bucketSize;

            } catch (\Exception $e) {
                $this->error("Error accessing bucket {$bucketName}: " . $e->getMessage());
            }
        }

        $this->newLine();
        $action = $dryRun ? 'Would delete' : 'Deleted';
        $this->info("{$action} {$totalDeleted} files (" . $this->formatBytes($totalSize) . ") total");

        Log::info('[STORAGE] MinIO cleanup completed', [
            'files_deleted' => $totalDeleted,
            'bytes_freed' => $totalSize,
            'dry_run' => $dryRun,
            'hours_threshold' => $hours,
        ]);

        return Command::SUCCESS;
    }

    protected function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' bytes';
    }
}
