<?php

namespace App\Console\Commands;

use App\Models\EncryptedMedia;
use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * CleanupExpiredEncryptedMedia Command
 *
 * Cleans up encrypted media blobs based on:
 * 1. Expired (5+ days old and not downloaded)
 * 2. Downloaded by recipient
 * 3. Associated listing is no longer available (rented, sold, or deleted)
 *
 * Run hourly via scheduler.
 */
class CleanupExpiredEncryptedMedia extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'media:cleanup-encrypted
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--include-downloaded : Also delete media that has been downloaded}
                            {--force : Delete without confirmation}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up expired, downloaded, or listing-unavailable encrypted media from storage';

    /**
     * Listing statuses that indicate the property is no longer available
     */
    protected array $unavailableStatuses = ['LOUEE', 'VENDUE', 'SUSPENDUE', 'ARCHIVEE', 'EXPIREE'];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $includeDownloaded = $this->option('include-downloaded');

        $this->info('=== Encrypted Media Cleanup ===');
        $this->info('Started at: ' . now()->toDateTimeString());
        $this->newLine();

        // Collect all media to delete with their reasons
        $mediaToDelete = collect();

        // 1. Media expired (5+ days old, not downloaded)
        $expiredMedia = EncryptedMedia::expiredAndNotDownloaded()->get();
        foreach ($expiredMedia as $media) {
            $mediaToDelete->put($media->id, [
                'media' => $media,
                'reason' => EncryptedMedia::DELETION_REASON_EXPIRED,
                'reason_label' => 'expired (5+ days)',
            ]);
        }
        $this->info("Found {$expiredMedia->count()} expired media (5+ days old, not downloaded)");

        // 2. Media downloaded by recipient (if option enabled)
        if ($includeDownloaded) {
            $downloadedMedia = EncryptedMedia::downloaded()->get();
            foreach ($downloadedMedia as $media) {
                if (!$mediaToDelete->has($media->id)) {
                    $mediaToDelete->put($media->id, [
                        'media' => $media,
                        'reason' => EncryptedMedia::DELETION_REASON_DOWNLOADED,
                        'reason_label' => 'downloaded by recipient',
                    ]);
                }
            }
            $this->info("Found {$downloadedMedia->count()} downloaded media");
        }

        // 3. Media where listing is no longer available
        $listingUnavailableMedia = $this->findMediaWithUnavailableListing();
        foreach ($listingUnavailableMedia as $item) {
            if (!$mediaToDelete->has($item['media']->id)) {
                $mediaToDelete->put($item['media']->id, $item);
            }
        }
        $this->info("Found {$listingUnavailableMedia->count()} media with unavailable listings");

        $count = $mediaToDelete->count();
        $this->newLine();
        $this->info("Total media to clean up: {$count}");

        if ($count === 0) {
            $this->info('Nothing to clean up.');
            return Command::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('DRY RUN - No files will be deleted');
            $this->newLine();

            foreach ($mediaToDelete as $item) {
                $media = $item['media'];
                $size = $this->formatBytes($media->encrypted_size);
                $this->line("  [DRY] Would delete: {$media->id}");
                $this->line("        Type: {$media->media_type}, Size: {$size}");
                $this->line("        Reason: {$item['reason_label']}");
                $this->line("        Uploaded: {$media->created_at}");
                $this->newLine();
            }

            return Command::SUCCESS;
        }

        $deleted = 0;
        $errors = 0;
        $bytesFreed = 0;
        $errorDetails = [];

        $this->newLine();
        $this->info('Processing...');

        $progressBar = $this->output->createProgressBar($count);
        $progressBar->start();

        foreach ($mediaToDelete as $item) {
            $media = $item['media'];
            $reason = $item['reason'];

            try {
                // Delete from storage
                $disk = Storage::disk($media->storage_disk);

                if ($disk->exists($media->storage_path)) {
                    $bytesFreed += $media->encrypted_size;
                    $disk->delete($media->storage_path);
                }

                // Mark as deleted in database with reason
                $media->markAsDeleted($reason);

                $deleted++;

                Log::info('[ENCRYPTED_MEDIA_CLEANUP] Deleted', [
                    'media_id' => $media->id,
                    'conversation_id' => $media->conversation_id,
                    'media_type' => $media->media_type,
                    'size' => $media->encrypted_size,
                    'reason' => $reason,
                ]);

            } catch (\Exception $e) {
                $errors++;
                $errorDetails[] = [
                    'media_id' => $media->id,
                    'error' => $e->getMessage(),
                ];

                Log::error('[ENCRYPTED_MEDIA_CLEANUP] Failed to delete', [
                    'media_id' => $media->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Summary
        $this->info('=== Cleanup Summary ===');
        $this->info("Deleted:     {$deleted} files");
        $this->info("Errors:      {$errors}");
        $this->info("Freed:       " . $this->formatBytes($bytesFreed));
        $this->info("Completed:   " . now()->toDateTimeString());

        if ($errors > 0) {
            $this->newLine();
            $this->error('Errors occurred:');
            foreach ($errorDetails as $detail) {
                $this->error("  - {$detail['media_id']}: {$detail['error']}");
            }
        }

        // Log summary
        Log::info('[ENCRYPTED_MEDIA_CLEANUP] Completed', [
            'deleted' => $deleted,
            'errors' => $errors,
            'bytes_freed' => $bytesFreed,
            'include_downloaded' => $includeDownloaded,
        ]);

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * Find media where the associated listing is no longer available
     * (rented, sold, deleted, suspended, archived, or expired)
     */
    private function findMediaWithUnavailableListing(): \Illuminate\Support\Collection
    {
        $result = collect();

        // Get all active media with their conversations and listings
        $activeMedia = EncryptedMedia::where('is_deleted', false)
            ->with(['conversation.listing'])
            ->get();

        foreach ($activeMedia as $media) {
            $conversation = $media->conversation;

            if (!$conversation) {
                // Conversation deleted, media should be cleaned up
                $result->push([
                    'media' => $media,
                    'reason' => EncryptedMedia::DELETION_REASON_LISTING_UNAVAILABLE,
                    'reason_label' => 'conversation deleted',
                ]);
                continue;
            }

            $listing = $conversation->listing;

            if (!$listing) {
                // Listing deleted, media should be cleaned up
                $result->push([
                    'media' => $media,
                    'reason' => EncryptedMedia::DELETION_REASON_LISTING_UNAVAILABLE,
                    'reason_label' => 'listing deleted',
                ]);
                continue;
            }

            // Check if listing status indicates it's no longer available
            if (in_array($listing->statut, $this->unavailableStatuses)) {
                $statusLabel = match ($listing->statut) {
                    'LOUEE' => 'rented',
                    'VENDUE' => 'sold',
                    'SUSPENDUE' => 'suspended',
                    'ARCHIVEE' => 'archived',
                    'EXPIREE' => 'expired listing',
                    default => $listing->statut,
                };

                $result->push([
                    'media' => $media,
                    'reason' => EncryptedMedia::DELETION_REASON_LISTING_UNAVAILABLE,
                    'reason_label' => "listing {$statusLabel}",
                ]);
            }
        }

        return $result;
    }

    /**
     * Format bytes to human readable string
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }
}
