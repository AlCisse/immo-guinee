<?php

namespace App\Jobs;

use App\Models\Listing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Facades\Image;
use Exception;

class OptimizeListingPhotosJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $listing;
    protected $photos;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(Listing $listing, array $photos)
    {
        $this->listing = $listing;
        $this->photos = $photos;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $optimizedPhotos = [];

            foreach ($this->photos as $photoPath) {
                $optimizedPhotos[] = $this->optimizePhoto($photoPath);
            }

            // Update listing with optimized photos
            $this->listing->update([
                'photos' => $optimizedPhotos,
            ]);

            Log::info('Photos optimized successfully', [
                'listing_id' => $this->listing->id,
                'photo_count' => count($optimizedPhotos),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to optimize photos', [
                'listing_id' => $this->listing->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Optimize a single photo
     *
     * @param string $photoPath
     * @return array
     */
    protected function optimizePhoto(string $photoPath): array
    {
        $sizes = config('image.listings.sizes');
        $optimizedVersions = [];

        // Get the original file from storage
        $originalContent = Storage::disk('listings')->get($photoPath);
        $image = Image::make($originalContent);

        foreach ($sizes as $sizeName => $sizeConfig) {
            try {
                // Create a copy for this size
                $resizedImage = clone $image;

                // Resize image
                if ($sizeName === 'original') {
                    // For original, just constrain to max dimensions
                    $resizedImage->resize($sizeConfig['max_width'], $sizeConfig['max_height'], function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                } else {
                    // For thumbnails and other sizes, fit to exact dimensions
                    $resizedImage->fit($sizeConfig['width'], $sizeConfig['height']);
                }

                // Convert to WebP format
                $resizedImage->encode('webp', $sizeConfig['quality']);

                // Generate file name
                $filename = $this->generateFilename($photoPath, $sizeName);
                $savePath = 'optimized/' . $this->listing->id . '/' . $filename;

                // Save to storage
                Storage::disk('listings')->put($savePath, $resizedImage->stream());

                $optimizedVersions[$sizeName] = [
                    'url' => Storage::disk('listings')->url($savePath),
                    'path' => $savePath,
                    'width' => $resizedImage->width(),
                    'height' => $resizedImage->height(),
                    'size' => Storage::disk('listings')->size($savePath),
                ];

            } catch (Exception $e) {
                Log::error('Failed to create image size', [
                    'listing_id' => $this->listing->id,
                    'size' => $sizeName,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $optimizedVersions;
    }

    /**
     * Generate filename for optimized image
     *
     * @param string $originalPath
     * @param string $sizeName
     * @return string
     */
    protected function generateFilename(string $originalPath, string $sizeName): string
    {
        $pathInfo = pathinfo($originalPath);
        return $pathInfo['filename'] . '_' . $sizeName . '.webp';
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error('OptimizeListingPhotosJob failed permanently', [
            'listing_id' => $this->listing->id,
            'error' => $exception->getMessage(),
        ]);

        // Optionally notify admins or the user
    }
}
