<?php

namespace App\Services;

use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Helpers\FileSecurityHelper;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ListingPhotoService
{
    protected string $storageType = 'listings';
    protected StorageService $storage;
    protected ImageManager $imageManager;

    // Image sizes configuration
    protected array $sizes = [
        'thumbnail' => ['width' => 150, 'height' => 150, 'quality' => 75],
        'medium' => ['width' => 600, 'height' => 400, 'quality' => 80],
        'large' => ['width' => 1200, 'height' => 800, 'quality' => 82],
    ];

    // Max dimensions for original image
    protected int $maxWidth = 2000;
    protected int $maxHeight = 2000;

    // WebP quality for original (high quality archive)
    protected int $originalQuality = 85;

    public function __construct(StorageService $storage)
    {
        $this->storage = $storage;
        $this->imageManager = new ImageManager(new Driver());
    }

    /**
     * Validate an image file before upload.
     *
     * @throws \InvalidArgumentException if file is invalid
     */
    public function validateImage(UploadedFile $file): array
    {
        $validation = FileSecurityHelper::validateUpload($file, 'image', true);

        if (!$validation['valid']) {
            throw new \InvalidArgumentException($validation['error']);
        }

        return $validation;
    }

    /**
     * Upload a photo for a listing.
     *
     * @throws \InvalidArgumentException if file fails security validation
     */
    public function upload(Listing $listing, UploadedFile $file, bool $isPrimary = false): ListingPhoto
    {
        // Security validation (MIME, extension, virus scan, etc.)
        $validation = $this->validateImage($file);

        // Generate WebP filename (UUID-based, never user-provided)
        $baseFilename = pathinfo($validation['secure_name'], PATHINFO_FILENAME);
        $filename = $baseFilename . '.webp';

        // Note: 'listings' disk root is already storage/app/public/listings, so no prefix needed
        $basePath = "{$listing->id}";

        // Read and process the image
        $image = $this->imageManager->read($file->getPathname());

        // Get original dimensions
        $originalWidth = $image->width();
        $originalHeight = $image->height();

        // Resize if too large
        if ($originalWidth > $this->maxWidth || $originalHeight > $this->maxHeight) {
            $image->scaleDown($this->maxWidth, $this->maxHeight);
        }

        // Upload original as WebP (high quality)
        $originalPath = "{$basePath}/original/{$filename}";
        $this->uploadToStorage($originalPath, $image->toWebp($this->originalQuality));

        // Calculate compressed size for metadata
        $webpContent = $image->toWebp($this->originalQuality);
        $compressedSize = strlen($webpContent);

        // Generate and upload variants as WebP
        $filePath = $file->getPathname();
        $thumbnailPath = $this->generateVariant($filePath, 'thumbnail', $basePath, $filename);
        $mediumPath = $this->generateVariant($filePath, 'medium', $basePath, $filename);
        $largePath = $this->generateVariant($filePath, 'large', $basePath, $filename);

        // Get the next order number
        $maxOrder = ListingPhoto::where('listing_id', $listing->id)->max('order') ?? -1;

        // If this is primary, unset other primary photos
        if ($isPrimary) {
            ListingPhoto::where('listing_id', $listing->id)
                ->update(['is_primary' => false]);
        }

        // Create the photo record
        $photo = ListingPhoto::create([
            'listing_id' => $listing->id,
            'disk' => $this->storage->getDisk($this->storageType),
            'path' => $originalPath,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => 'image/webp',
            'size' => $compressedSize,
            'thumbnail_path' => $thumbnailPath,
            'medium_path' => $mediumPath,
            'large_path' => $largePath,
            'is_primary' => $isPrimary || $maxOrder < 0, // First photo is always primary
            'order' => $maxOrder + 1,
            'metadata' => [
                'format' => 'webp',
                'dimensions' => [
                    'width' => $image->width(),
                    'height' => $image->height(),
                ],
                'original_dimensions' => [
                    'width' => $originalWidth,
                    'height' => $originalHeight,
                ],
                'original_size' => $file->getSize(),
                'compression_ratio' => round((1 - $compressedSize / $file->getSize()) * 100, 1),
            ],
        ]);

        return $photo;
    }

    /**
     * Upload multiple photos at once.
     */
    public function uploadMultiple(Listing $listing, array $files, ?int $primaryIndex = 0): array
    {
        $photos = [];

        foreach ($files as $index => $file) {
            if ($file instanceof UploadedFile) {
                $photos[] = $this->upload($listing, $file, $index === $primaryIndex);
            }
        }

        return $photos;
    }

    /**
     * Delete a photo.
     */
    public function delete(ListingPhoto $photo): bool
    {
        $wasPrimary = $photo->is_primary;
        $listingId = $photo->listing_id;

        // Delete the model (will trigger storage deletion via model event)
        $deleted = $photo->delete();

        // If it was primary, set the first remaining photo as primary
        if ($deleted && $wasPrimary) {
            $firstPhoto = ListingPhoto::where('listing_id', $listingId)
                ->orderBy('order')
                ->first();

            if ($firstPhoto) {
                $firstPhoto->update(['is_primary' => true]);
            }
        }

        return $deleted;
    }

    /**
     * Reorder photos.
     */
    public function reorder(Listing $listing, array $photoIds): bool
    {
        foreach ($photoIds as $order => $photoId) {
            ListingPhoto::where('id', $photoId)
                ->where('listing_id', $listing->id)
                ->update(['order' => $order]);
        }

        return true;
    }

    /**
     * Set a photo as primary.
     */
    public function setPrimary(ListingPhoto $photo): bool
    {
        return $photo->setAsPrimary();
    }

    /**
     * Generate image variant and upload to storage as WebP.
     */
    protected function generateVariant(string $filePath, string $variant, string $basePath, string $filename): string
    {
        $size = $this->sizes[$variant];
        $path = "{$basePath}/{$variant}/{$filename}";

        // Re-read the image from file (Intervention v3 doesn't support clone)
        $image = $this->imageManager->read($filePath);

        // Cover fit to exact dimensions
        $image->cover($size['width'], $size['height']);

        // Use variant-specific quality for optimal size/quality balance
        $quality = $size['quality'] ?? 80;
        $this->uploadToStorage($path, $image->toWebp($quality));

        return $path;
    }

    /**
     * Upload content to storage (DigitalOcean Spaces or MinIO based on strategy).
     */
    protected function uploadToStorage(string $path, $content): bool
    {
        return $this->storage->put($this->storageType, $path, $content, 'public');
    }

    /**
     * Get all photos for a listing with URLs.
     */
    public function getPhotosWithUrls(Listing $listing): array
    {
        return $listing->listingPhotos->map(function (ListingPhoto $photo) {
            return [
                'id' => $photo->id,
                'url' => $photo->url,
                'thumbnail_url' => $photo->thumbnail_url,
                'medium_url' => $photo->medium_url,
                'large_url' => $photo->large_url,
                'is_primary' => $photo->is_primary,
                'order' => $photo->order,
                'original_name' => $photo->original_name,
                'size' => $photo->formatted_size,
            ];
        })->toArray();
    }

    /**
     * Migrate existing JSON photos to the new table.
     * Call this once to migrate existing data.
     */
    public function migrateFromJson(Listing $listing): int
    {
        $existingPhotos = $listing->photos ?? [];

        if (empty($existingPhotos) || !is_array($existingPhotos)) {
            return 0;
        }

        $count = 0;
        foreach ($existingPhotos as $index => $photoUrl) {
            // Skip if already migrated or if not a valid URL
            if (empty($photoUrl) || !filter_var($photoUrl, FILTER_VALIDATE_URL)) {
                continue;
            }

            // Create a photo record pointing to the existing URL
            // This assumes the photos are already stored somewhere accessible
            ListingPhoto::create([
                'listing_id' => $listing->id,
                'disk' => 'local', // Mark as external/legacy
                'path' => $photoUrl,
                'original_name' => basename($photoUrl),
                'is_primary' => $index === 0 || $photoUrl === $listing->photo_principale,
                'order' => $index,
                'metadata' => ['migrated' => true, 'original_url' => $photoUrl],
            ]);

            $count++;
        }

        return $count;
    }
}
