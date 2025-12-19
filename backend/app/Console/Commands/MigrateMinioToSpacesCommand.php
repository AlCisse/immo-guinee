<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\ListingPhoto;

/**
 * Migrate files from MinIO to DigitalOcean Spaces.
 *
 * This one-time migration command copies all files from MinIO
 * to Spaces and updates database references.
 */
class MigrateMinioToSpacesCommand extends Command
{
    protected $signature = 'storage:migrate-to-spaces
                            {--dry-run : Show what would be migrated without actually migrating}
                            {--bucket=all : Specific bucket to migrate (listings, documents, avatars) or all}
                            {--skip-existing : Skip files that already exist in Spaces}
                            {--update-db : Update database disk references after migration}';

    protected $description = 'Migrate files from MinIO to DigitalOcean Spaces';

    /**
     * Disk mappings: MinIO disk => Spaces disk
     */
    protected array $diskMappings = [
        'listings-minio' => 'spaces-listings',
        'listings' => 'spaces-listings',
        'documents' => 'spaces-documents',
        'avatars' => 'spaces-avatars',
        'messages' => 'spaces-messages',
        'certificates' => 'spaces-certificates',
        'contracts-secure' => 'spaces-contracts',
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $targetBucket = $this->option('bucket');
        $skipExisting = $this->option('skip-existing');
        $updateDb = $this->option('update-db');

        $this->info('Starting MinIO to Spaces migration');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No files will be copied');
        }

        $totalMigrated = 0;
        $totalSkipped = 0;
        $totalErrors = 0;
        $totalSize = 0;

        foreach ($this->diskMappings as $sourceDisk => $targetDisk) {
            // Extract bucket name from disk name
            $bucketName = str_replace(['spaces-', '-minio'], '', $targetDisk);

            // Skip if specific bucket requested and this isn't it
            if ($targetBucket !== 'all' && $bucketName !== $targetBucket) {
                continue;
            }

            $this->info("\nMigrating: {$sourceDisk} → {$targetDisk}");

            try {
                $source = Storage::disk($sourceDisk);
                $target = Storage::disk($targetDisk);

                $files = $source->allFiles();
                $this->info("  Found " . count($files) . " files");

                $bar = $this->output->createProgressBar(count($files));
                $bar->start();

                foreach ($files as $file) {
                    try {
                        // Check if file already exists in target
                        if ($skipExisting && $target->exists($file)) {
                            $totalSkipped++;
                            $bar->advance();
                            continue;
                        }

                        $fileSize = $source->size($file);

                        if (!$dryRun) {
                            // Get file contents and copy to Spaces
                            $contents = $source->get($file);
                            $visibility = $source->getVisibility($file);

                            $target->put($file, $contents, $visibility);
                        }

                        $totalMigrated++;
                        $totalSize += $fileSize;

                    } catch (\Exception $e) {
                        $totalErrors++;
                        Log::error("[STORAGE] Migration error for {$file}", [
                            'source_disk' => $sourceDisk,
                            'target_disk' => $targetDisk,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    $bar->advance();
                }

                $bar->finish();
                $this->newLine();

            } catch (\Exception $e) {
                $this->error("Error accessing disk {$sourceDisk}: " . $e->getMessage());
                $totalErrors++;
            }
        }

        // Update database references if requested
        if ($updateDb && !$dryRun) {
            $this->updateDatabaseReferences();
        }

        $this->newLine();
        $this->info('Migration Summary:');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Files Migrated', $totalMigrated],
                ['Files Skipped', $totalSkipped],
                ['Errors', $totalErrors],
                ['Total Size', $this->formatBytes($totalSize)],
            ]
        );

        Log::info('[STORAGE] MinIO to Spaces migration completed', [
            'files_migrated' => $totalMigrated,
            'files_skipped' => $totalSkipped,
            'errors' => $totalErrors,
            'bytes_migrated' => $totalSize,
            'dry_run' => $dryRun,
        ]);

        return $totalErrors > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * Update database disk references from MinIO to Spaces.
     */
    protected function updateDatabaseReferences(): void
    {
        $this->info("\nUpdating database references...");

        // Update listing_photos table
        $updated = ListingPhoto::whereIn('disk', ['listings', 'listings-minio'])
            ->update(['disk' => 'spaces-listings']);

        $this->info("  Updated {$updated} listing_photos records");

        // Update other tables as needed
        // You can add more updates here for other models that store disk references

        Log::info('[STORAGE] Database disk references updated', [
            'listing_photos_updated' => $updated,
        ]);
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
