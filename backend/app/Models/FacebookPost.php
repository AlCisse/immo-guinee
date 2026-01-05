<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Facebook Post Model
 *
 * Tracks published Facebook posts linked to listings for auto-deletion
 * when listings are marked as rented or sold.
 *
 * @property string $id
 * @property string $listing_id
 * @property string $facebook_page_connection_id
 * @property string $facebook_post_id
 * @property string $status (published|deleted|failed)
 * @property \Carbon\Carbon|null $published_at
 * @property \Carbon\Carbon|null $deleted_at
 * @property string|null $error_message (i18n key)
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 *
 * @property-read Listing $listing
 * @property-read FacebookPageConnection $facebookPageConnection
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookPost extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'facebook_posts';

    /**
     * Post status constants.
     */
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_DELETED = 'deleted';
    public const STATUS_FAILED = 'failed';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'listing_id',
        'facebook_page_connection_id',
        'facebook_post_id',
        'status',
        'published_at',
        'deleted_at',
        'error_message',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'published_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the listing associated with this Facebook post.
     *
     * @return BelongsTo
     */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    /**
     * Get the Facebook page connection that published this post.
     *
     * @return BelongsTo
     */
    public function facebookPageConnection(): BelongsTo
    {
        return $this->belongsTo(FacebookPageConnection::class);
    }

    /**
     * Check if the post is currently published on Facebook.
     *
     * @return bool
     */
    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    /**
     * Check if the post has been deleted from Facebook.
     *
     * @return bool
     */
    public function isDeleted(): bool
    {
        return $this->status === self::STATUS_DELETED;
    }

    /**
     * Check if the post publication/deletion failed.
     *
     * @return bool
     */
    public function hasFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Mark the post as deleted.
     *
     * @return bool
     */
    public function markAsDeleted(): bool
    {
        return $this->update([
            'status' => self::STATUS_DELETED,
            'deleted_at' => now(),
        ]);
    }

    /**
     * Mark the post as failed with an error message.
     *
     * @param string $errorMessageKey i18n error key
     * @return bool
     */
    public function markAsFailed(string $errorMessageKey): bool
    {
        return $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessageKey,
        ]);
    }

    /**
     * Scope a query to only include published posts.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    /**
     * Scope a query to only include failed posts.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope a query to only include posts for a specific listing.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $listingId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForListing($query, string $listingId)
    {
        return $query->where('listing_id', $listingId);
    }

    /**
     * Get the Facebook post URL.
     *
     * @return string|null
     */
    public function getFacebookUrlAttribute(): ?string
    {
        if (!$this->facebook_post_id) {
            return null;
        }

        // Facebook post ID format: {page_id}_{post_id}
        $parts = explode('_', $this->facebook_post_id);
        if (count($parts) === 2) {
            return "https://www.facebook.com/{$parts[0]}/posts/{$parts[1]}";
        }

        return "https://www.facebook.com/{$this->facebook_post_id}";
    }
}
