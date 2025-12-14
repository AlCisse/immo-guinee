<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ListingPhoto extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'listing_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'thumbnail_path',
        'medium_path',
        'large_path',
        'is_primary',
        'order',
        'alt_text',
        'metadata',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'url',
        'thumbnail_url',
        'medium_url',
        'large_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'order' => 'integer',
            'size' => 'integer',
            'metadata' => 'array',
        ];
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The listing this photo belongs to.
     */
    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    // ==================== ACCESSORS ====================

    /**
     * Get the full URL to the original image.
     */
    public function getUrlAttribute(): string
    {
        return $this->getStorageUrl($this->path);
    }

    /**
     * Get the full URL to the thumbnail.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path ? $this->getStorageUrl($this->thumbnail_path) : null;
    }

    /**
     * Get the full URL to the medium size image.
     */
    public function getMediumUrlAttribute(): ?string
    {
        return $this->medium_path ? $this->getStorageUrl($this->medium_path) : null;
    }

    /**
     * Get the full URL to the large size image.
     */
    public function getLargeUrlAttribute(): ?string
    {
        return $this->large_path ? $this->getStorageUrl($this->large_path) : null;
    }

    /**
     * Get formatted file size.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' bytes';
    }

    // ==================== HELPERS ====================

    /**
     * Get URL from storage disk.
     */
    protected function getStorageUrl(string $path): string
    {
        $disk = Storage::disk($this->disk);

        // Try to get a URL, fallback to temporary URL for private disks
        try {
            return $disk->url($path);
        } catch (\Exception $e) {
            // For private disks, generate a temporary URL valid for 1 hour
            return $disk->temporaryUrl($path, now()->addHour());
        }
    }

    /**
     * Delete the file from storage.
     */
    public function deleteFromStorage(): bool
    {
        $disk = Storage::disk($this->disk);
        $deleted = true;

        // Delete all variants
        $paths = array_filter([
            $this->path,
            $this->thumbnail_path,
            $this->medium_path,
            $this->large_path,
        ]);

        foreach ($paths as $path) {
            if ($disk->exists($path)) {
                $deleted = $deleted && $disk->delete($path);
            }
        }

        return $deleted;
    }

    /**
     * Check if the file exists in storage.
     */
    public function existsInStorage(): bool
    {
        return Storage::disk($this->disk)->exists($this->path);
    }

    /**
     * Get image dimensions from metadata.
     */
    public function getDimensions(): ?array
    {
        return $this->metadata['dimensions'] ?? null;
    }

    /**
     * Set as primary photo for the listing.
     */
    public function setAsPrimary(): bool
    {
        // Remove primary flag from other photos
        self::where('listing_id', $this->listing_id)
            ->where('id', '!=', $this->id)
            ->update(['is_primary' => false]);

        // Set this as primary
        $this->is_primary = true;

        return $this->save();
    }

    // ==================== BOOT ====================

    protected static function booted(): void
    {
        // Delete file from storage when model is deleted
        static::deleting(function (ListingPhoto $photo) {
            $photo->deleteFromStorage();
        });
    }
}
