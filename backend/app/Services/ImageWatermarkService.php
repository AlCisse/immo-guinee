<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Exception;

/**
 * Image Watermark Service
 *
 * Applies ImmoGuinée watermark to images before Facebook publication.
 *
 * Features:
 * - Watermark positioned at bottom-right
 * - Configurable size, opacity, and margin
 * - Original images are NEVER modified
 * - Creates temporary watermarked copies
 * - Automatic cleanup of temp files
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class ImageWatermarkService
{
    /**
     * Intervention Image manager.
     */
    protected ImageManager $imageManager;

    /**
     * Storage service for file operations.
     */
    protected StorageService $storage;

    /**
     * Watermark configuration.
     */
    protected array $config;

    /**
     * Temporary directory for watermarked images.
     */
    protected const TEMP_DIR = 'temp/watermarked';

    /**
     * Supported image formats.
     */
    protected const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    public function __construct(StorageService $storage)
    {
        $this->storage = $storage;
        $this->imageManager = new ImageManager(new Driver());

        // Load watermark configuration
        $this->config = [
            'logo_path' => config('facebook.watermark.logo_path', 'watermarks/immoguinee-logo.png'),
            'size_percent' => config('facebook.watermark.size_percent', 10),
            'opacity' => config('facebook.watermark.opacity', 70),
            'margin' => config('facebook.watermark.margin', 20),
            'position' => config('facebook.watermark.position', 'bottom-right'),
        ];
    }

    /**
     * Apply watermark to an image and return the path to the watermarked copy.
     *
     * IMPORTANT: The original image is NEVER modified.
     * A temporary copy is created with the watermark applied.
     *
     * @param string $imagePath Path to the original image (relative to storage or absolute)
     * @param string|null $customWatermarkPath Optional custom watermark path
     * @return string Path to the temporary watermarked image
     * @throws Exception
     */
    public function apply(string $imagePath, ?string $customWatermarkPath = null): string
    {
        try {
            // Get the watermark logo path
            $watermarkPath = $customWatermarkPath ?? $this->getWatermarkPath();

            if (!$watermarkPath || !file_exists($watermarkPath)) {
                throw new Exception('facebook.error.watermark_not_found');
            }

            // Resolve the source image path
            $sourceImagePath = $this->resolveImagePath($imagePath);

            if (!file_exists($sourceImagePath)) {
                throw new Exception('facebook.error.image_not_found');
            }

            // Load the source image
            $image = $this->imageManager->read($sourceImagePath);

            // Load and prepare the watermark
            $watermark = $this->imageManager->read($watermarkPath);

            // Calculate watermark size (percentage of image width)
            $imageWidth = $image->width();
            $imageHeight = $image->height();
            $watermarkTargetWidth = (int) ($imageWidth * ($this->config['size_percent'] / 100));

            // Resize watermark maintaining aspect ratio
            $watermark->scaleDown($watermarkTargetWidth);

            // Calculate position based on config
            $position = $this->calculatePosition(
                $imageWidth,
                $imageHeight,
                $watermark->width(),
                $watermark->height()
            );

            // Apply watermark with opacity
            $image->place(
                $watermark,
                'top-left', // We use top-left and calculate exact offset
                $position['x'],
                $position['y'],
                $this->config['opacity']
            );

            // Generate temporary file path
            $tempFilename = $this->generateTempFilename($imagePath);
            $tempPath = $this->getTempDirectory() . '/' . $tempFilename;

            // Ensure temp directory exists
            $this->ensureTempDirectoryExists();

            // Save the watermarked image
            $format = $this->getImageFormat($imagePath);
            $this->saveImage($image, $tempPath, $format);

            Log::info('Watermark applied successfully', [
                'original' => basename($imagePath),
                'temp_file' => $tempFilename,
                'watermark_size' => $watermark->width() . 'x' . $watermark->height(),
            ]);

            return $tempPath;

        } catch (Exception $e) {
            Log::error('Watermark application failed', [
                'image' => $imagePath,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Apply watermark to multiple images.
     *
     * @param array $imagePaths Array of image paths
     * @return array Array of temporary watermarked image paths
     */
    public function applyToMultiple(array $imagePaths): array
    {
        $watermarkedPaths = [];

        foreach ($imagePaths as $imagePath) {
            try {
                $watermarkedPaths[] = $this->apply($imagePath);
            } catch (Exception $e) {
                Log::warning('Failed to watermark image', [
                    'image' => $imagePath,
                    'error' => $e->getMessage(),
                ]);
                // Continue with other images
            }
        }

        return $watermarkedPaths;
    }

    /**
     * Clean up a temporary watermarked image.
     *
     * @param string $tempPath Path to the temporary file
     * @return bool
     */
    public function cleanup(string $tempPath): bool
    {
        try {
            if (file_exists($tempPath) && $this->isInTempDirectory($tempPath)) {
                unlink($tempPath);
                Log::debug('Watermarked temp file cleaned up', ['path' => basename($tempPath)]);
                return true;
            }
            return false;
        } catch (Exception $e) {
            Log::warning('Failed to cleanup watermarked file', [
                'path' => $tempPath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Clean up multiple temporary files.
     *
     * @param array $tempPaths Array of temporary file paths
     * @return int Number of files cleaned up
     */
    public function cleanupMultiple(array $tempPaths): int
    {
        $cleaned = 0;

        foreach ($tempPaths as $tempPath) {
            if ($this->cleanup($tempPath)) {
                $cleaned++;
            }
        }

        return $cleaned;
    }

    /**
     * Clean up all old temporary watermarked files.
     * Files older than the specified minutes will be deleted.
     *
     * @param int $olderThanMinutes Delete files older than this many minutes
     * @return int Number of files cleaned up
     */
    public function cleanupOldFiles(int $olderThanMinutes = 60): int
    {
        $cleaned = 0;
        $tempDir = $this->getTempDirectory();

        if (!is_dir($tempDir)) {
            return 0;
        }

        $files = glob($tempDir . '/*');
        $threshold = time() - ($olderThanMinutes * 60);

        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $threshold) {
                if (unlink($file)) {
                    $cleaned++;
                }
            }
        }

        if ($cleaned > 0) {
            Log::info('Old watermarked files cleaned up', ['count' => $cleaned]);
        }

        return $cleaned;
    }

    /**
     * Check if the watermark logo file exists.
     *
     * @return bool
     */
    public function watermarkExists(): bool
    {
        $path = $this->getWatermarkPath();
        return $path && file_exists($path);
    }

    /**
     * Get the full path to the watermark logo.
     *
     * @return string|null
     */
    protected function getWatermarkPath(): ?string
    {
        $logoPath = $this->config['logo_path'];

        // Check in storage/app
        $storagePath = storage_path('app/' . $logoPath);
        if (file_exists($storagePath)) {
            return $storagePath;
        }

        // Check in public storage
        $publicPath = storage_path('app/public/' . $logoPath);
        if (file_exists($publicPath)) {
            return $publicPath;
        }

        // Check if it's an absolute path
        if (file_exists($logoPath)) {
            return $logoPath;
        }

        return null;
    }

    /**
     * Resolve the full path to a source image.
     *
     * @param string $imagePath
     * @return string
     */
    protected function resolveImagePath(string $imagePath): string
    {
        // If it's already an absolute path
        if (file_exists($imagePath)) {
            return $imagePath;
        }

        // Check in storage/app/public/listings
        $listingsPath = storage_path('app/public/listings/' . $imagePath);
        if (file_exists($listingsPath)) {
            return $listingsPath;
        }

        // Check in storage/app/public
        $publicPath = storage_path('app/public/' . $imagePath);
        if (file_exists($publicPath)) {
            return $publicPath;
        }

        // Check in storage/app
        $appPath = storage_path('app/' . $imagePath);
        if (file_exists($appPath)) {
            return $appPath;
        }

        return $imagePath;
    }

    /**
     * Calculate the position for the watermark.
     *
     * @param int $imageWidth
     * @param int $imageHeight
     * @param int $watermarkWidth
     * @param int $watermarkHeight
     * @return array{x: int, y: int}
     */
    protected function calculatePosition(
        int $imageWidth,
        int $imageHeight,
        int $watermarkWidth,
        int $watermarkHeight
    ): array {
        $margin = $this->config['margin'];

        switch ($this->config['position']) {
            case 'top-left':
                return ['x' => $margin, 'y' => $margin];

            case 'top-right':
                return [
                    'x' => $imageWidth - $watermarkWidth - $margin,
                    'y' => $margin,
                ];

            case 'bottom-left':
                return [
                    'x' => $margin,
                    'y' => $imageHeight - $watermarkHeight - $margin,
                ];

            case 'bottom-right':
            default:
                return [
                    'x' => $imageWidth - $watermarkWidth - $margin,
                    'y' => $imageHeight - $watermarkHeight - $margin,
                ];

            case 'center':
                return [
                    'x' => (int) (($imageWidth - $watermarkWidth) / 2),
                    'y' => (int) (($imageHeight - $watermarkHeight) / 2),
                ];
        }
    }

    /**
     * Generate a unique temporary filename.
     *
     * @param string $originalPath
     * @return string
     */
    protected function generateTempFilename(string $originalPath): string
    {
        $extension = $this->getImageFormat($originalPath);
        return 'wm_' . Str::uuid() . '.' . $extension;
    }

    /**
     * Get the image format from the file path.
     *
     * @param string $path
     * @return string
     */
    protected function getImageFormat(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (in_array($extension, self::SUPPORTED_FORMATS)) {
            // Normalize jpeg to jpg
            return $extension === 'jpeg' ? 'jpg' : $extension;
        }

        // Default to jpg for unknown formats
        return 'jpg';
    }

    /**
     * Get the temporary directory path.
     *
     * @return string
     */
    protected function getTempDirectory(): string
    {
        return storage_path('app/' . self::TEMP_DIR);
    }

    /**
     * Ensure the temporary directory exists.
     *
     * @return void
     */
    protected function ensureTempDirectoryExists(): void
    {
        $dir = $this->getTempDirectory();

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    /**
     * Check if a path is within the temp directory.
     *
     * @param string $path
     * @return bool
     */
    protected function isInTempDirectory(string $path): bool
    {
        $tempDir = realpath($this->getTempDirectory());
        $filePath = realpath(dirname($path));

        if (!$tempDir || !$filePath) {
            return false;
        }

        return strpos($filePath, $tempDir) === 0;
    }

    /**
     * Save the image to a file.
     *
     * @param \Intervention\Image\Interfaces\ImageInterface $image
     * @param string $path
     * @param string $format
     * @return void
     */
    protected function saveImage($image, string $path, string $format): void
    {
        $quality = 85; // Good balance between quality and file size

        switch ($format) {
            case 'png':
                $encoded = $image->toPng();
                break;

            case 'webp':
                $encoded = $image->toWebp($quality);
                break;

            case 'gif':
                $encoded = $image->toGif();
                break;

            case 'jpg':
            default:
                $encoded = $image->toJpeg($quality);
                break;
        }

        file_put_contents($path, $encoded);
    }

    /**
     * Get watermark configuration.
     *
     * @return array
     */
    public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Update watermark configuration at runtime.
     *
     * @param array $config
     * @return void
     */
    public function setConfig(array $config): void
    {
        $this->config = array_merge($this->config, $config);
    }
}
