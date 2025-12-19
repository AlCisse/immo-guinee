<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Centralized Storage Service
 *
 * Manages file storage with DigitalOcean Spaces as primary permanent storage.
 * MinIO is used only as temporary cache for upload processing.
 *
 * Strategy:
 * - 'spaces': Direct upload to DigitalOcean Spaces (recommended for production)
 * - 'minio': Upload to MinIO only (legacy/development)
 * - 'local': Local storage only (development)
 */
class StorageService
{
    /**
     * Disk mapping for each content type.
     * Maps logical disk names to their Spaces equivalents.
     */
    protected array $diskMapping = [
        'listings' => 'spaces-listings',
        'avatars' => 'spaces-avatars',
        'documents' => 'spaces-documents',
        'contracts' => 'spaces-contracts',
        'contracts-secure' => 'spaces-contracts',
        'certificates' => 'spaces-certificates',
        'messages' => 'spaces-messages',
    ];

    /**
     * MinIO disk mapping for temporary storage.
     */
    protected array $minioDiskMapping = [
        'listings' => 'listings-minio',
        'avatars' => 'avatars',
        'documents' => 'documents',
        'contracts' => 'contracts-secure',
        'contracts-secure' => 'contracts-secure',
        'certificates' => 'certificates',
        'messages' => 'messages',
    ];

    /**
     * Get the current storage strategy.
     */
    public function getStrategy(): string
    {
        return config('filesystems.strategy', 'spaces');
    }

    /**
     * Get the appropriate disk for a content type.
     */
    public function getDisk(string $type): string
    {
        $strategy = $this->getStrategy();

        if ($strategy === 'spaces') {
            return $this->diskMapping[$type] ?? 'spaces';
        }

        if ($strategy === 'minio') {
            return $this->minioDiskMapping[$type] ?? $type;
        }

        // Local strategy
        return $type;
    }

    /**
     * Upload a file to the appropriate storage.
     */
    public function put(string $type, string $path, $contents, string $visibility = 'public'): bool
    {
        $disk = $this->getDisk($type);

        try {
            $result = Storage::disk($disk)->put($path, $contents, $visibility);

            Log::info("[STORAGE] File uploaded", [
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
                'strategy' => $this->getStrategy(),
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error("[STORAGE] Upload failed", [
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get the URL for a file.
     */
    public function url(string $type, string $path): string
    {
        $disk = $this->getDisk($type);
        return Storage::disk($disk)->url($path);
    }

    /**
     * Check if a file exists.
     */
    public function exists(string $type, string $path): bool
    {
        $disk = $this->getDisk($type);
        return Storage::disk($disk)->exists($path);
    }

    /**
     * Delete a file.
     */
    public function delete(string $type, string $path): bool
    {
        $disk = $this->getDisk($type);

        try {
            $result = Storage::disk($disk)->delete($path);

            Log::info("[STORAGE] File deleted", [
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::warning("[STORAGE] Delete failed", [
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Delete a directory and all its contents.
     */
    public function deleteDirectory(string $type, string $path): bool
    {
        $disk = $this->getDisk($type);

        try {
            return Storage::disk($disk)->deleteDirectory($path);
        } catch (\Exception $e) {
            Log::warning("[STORAGE] Delete directory failed", [
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get a temporary URL for private files.
     */
    public function temporaryUrl(string $type, string $path, \DateTimeInterface $expiration): string
    {
        $disk = $this->getDisk($type);
        return Storage::disk($disk)->temporaryUrl($path, $expiration);
    }

    /**
     * Get the Storage disk instance.
     */
    public function disk(string $type): \Illuminate\Contracts\Filesystem\Filesystem
    {
        return Storage::disk($this->getDisk($type));
    }

    /**
     * Get the CDN URL for public files.
     * This bypasses S3 and uses the CDN directly.
     */
    public function cdnUrl(string $type, string $path): string
    {
        $cdnBase = config('filesystems.disks.spaces.url', 'https://images.immoguinee.com');

        // Map type to folder
        $folder = match($type) {
            'listings' => 'listings',
            'avatars' => 'avatars',
            'messages' => 'messages',
            default => $type,
        };

        return rtrim($cdnBase, '/') . '/' . $folder . '/' . ltrim($path, '/');
    }
}
