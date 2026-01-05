<?php

namespace App\Models\Traits;

use App\Models\FacebookPageConnection;
use App\Models\FacebookPost;
use App\Services\FacebookPagePublisher;
use App\Services\FacebookPostManager;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Exception;

/**
 * Trait HasFacebookPublication
 *
 * Provides Facebook publication capabilities to the Listing model.
 *
 * Features:
 * - Relationships to FacebookPost
 * - Helper methods for publication status
 * - Publish/unpublish methods
 * - Auto-publish on status change
 *
 * Usage:
 * ```php
 * class Listing extends Model
 * {
 *     use HasFacebookPublication;
 * }
 *
 * $listing->publishToFacebook();
 * $listing->unpublishFromFacebook();
 * $listing->isPublishedOnFacebook();
 * ```
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
trait HasFacebookPublication
{
    /**
     * Get all Facebook posts for this listing.
     *
     * @return HasMany
     */
    public function facebookPosts(): HasMany
    {
        return $this->hasMany(FacebookPost::class, 'listing_id');
    }

    /**
     * Get the latest Facebook post for this listing.
     *
     * @return HasOne
     */
    public function latestFacebookPost(): HasOne
    {
        return $this->hasOne(FacebookPost::class, 'listing_id')
            ->latestOfMany();
    }

    /**
     * Get the currently published Facebook post.
     *
     * @return FacebookPost|null
     */
    public function getPublishedFacebookPost(): ?FacebookPost
    {
        return $this->facebookPosts()
            ->where('status', FacebookPost::STATUS_PUBLISHED)
            ->first();
    }

    /**
     * Check if this listing is currently published on Facebook.
     *
     * @return bool
     */
    public function isPublishedOnFacebook(): bool
    {
        return $this->facebookPosts()
            ->where('status', FacebookPost::STATUS_PUBLISHED)
            ->exists();
    }

    /**
     * Check if this listing has ever been published to Facebook.
     *
     * @return bool
     */
    public function hasBeenPublishedOnFacebook(): bool
    {
        return $this->facebookPosts()->exists();
    }

    /**
     * Get the Facebook URL for this listing's post.
     *
     * @return string|null
     */
    public function getFacebookUrlAttribute(): ?string
    {
        $publishedPost = $this->getPublishedFacebookPost();

        return $publishedPost?->facebook_url;
    }

    /**
     * Publish this listing to Facebook.
     *
     * @param FacebookPageConnection|null $connection Optional specific connection
     * @param bool $withImage Include image with watermark
     * @return FacebookPost
     * @throws Exception
     */
    public function publishToFacebook(?FacebookPageConnection $connection = null, bool $withImage = true): FacebookPost
    {
        // Get connection if not provided
        if (!$connection) {
            $connection = $this->getOwnerFacebookConnection();
        }

        if (!$connection) {
            throw new Exception('facebook.error.not_connected');
        }

        if (!$connection->auto_publish_enabled) {
            throw new Exception('facebook.error.auto_publish_disabled');
        }

        /** @var FacebookPagePublisher $publisher */
        $publisher = app(FacebookPagePublisher::class);

        return $publisher->publish($this, $connection, $withImage);
    }

    /**
     * Unpublish this listing from Facebook.
     *
     * @return bool
     */
    public function unpublishFromFacebook(): bool
    {
        /** @var FacebookPostManager $manager */
        $manager = app(FacebookPostManager::class);

        return $manager->deleteForListing($this);
    }

    /**
     * Get the Facebook connection for the listing owner.
     *
     * @return FacebookPageConnection|null
     */
    public function getOwnerFacebookConnection(): ?FacebookPageConnection
    {
        // Assuming the listing has a user_id relationship
        if (!$this->user_id) {
            return null;
        }

        return FacebookPageConnection::where('user_id', $this->user_id)
            ->where('auto_publish_enabled', true)
            ->whereDate('token_expires_at', '>', now())
            ->first();
    }

    /**
     * Check if the listing owner has Facebook connected.
     *
     * @return bool
     */
    public function ownerHasFacebookConnected(): bool
    {
        if (!$this->user_id) {
            return false;
        }

        return FacebookPageConnection::where('user_id', $this->user_id)->exists();
    }

    /**
     * Check if auto-publish is enabled for the listing owner.
     *
     * @return bool
     */
    public function ownerHasAutoPublishEnabled(): bool
    {
        $connection = $this->getOwnerFacebookConnection();

        return $connection && $connection->auto_publish_enabled;
    }

    /**
     * Get Facebook publication status.
     *
     * @return array
     */
    public function getFacebookPublicationStatus(): array
    {
        $publishedPost = $this->getPublishedFacebookPost();
        $connection = $this->getOwnerFacebookConnection();

        if (!$connection) {
            return [
                'status' => 'not_connected',
                'message_key' => 'facebook.status.not_connected',
                'can_publish' => false,
            ];
        }

        if (!$connection->auto_publish_enabled) {
            return [
                'status' => 'disabled',
                'message_key' => 'facebook.status.disabled',
                'can_publish' => false,
            ];
        }

        if ($connection->token_expires_at <= now()) {
            return [
                'status' => 'token_expired',
                'message_key' => 'facebook.status.token_expired',
                'can_publish' => false,
            ];
        }

        if ($publishedPost) {
            return [
                'status' => 'published',
                'message_key' => 'facebook.status.published',
                'facebook_post_id' => $publishedPost->facebook_post_id,
                'facebook_url' => $publishedPost->facebook_url,
                'published_at' => $publishedPost->published_at,
                'can_publish' => false,
            ];
        }

        // Check for recent failed attempt
        $failedPost = $this->facebookPosts()
            ->where('status', FacebookPost::STATUS_FAILED)
            ->latest()
            ->first();

        if ($failedPost) {
            return [
                'status' => 'failed',
                'message_key' => $failedPost->error_message,
                'failed_at' => $failedPost->created_at,
                'can_publish' => true,
            ];
        }

        return [
            'status' => 'ready',
            'message_key' => 'facebook.status.ready',
            'can_publish' => true,
        ];
    }

    /**
     * Handle listing status change for Facebook.
     *
     * Call this method when the listing status changes to rented/sold.
     *
     * @param string $newStatus
     * @return void
     */
    public function handleStatusChangeForFacebook(string $newStatus): void
    {
        /** @var FacebookPostManager $manager */
        $manager = app(FacebookPostManager::class);

        $manager->handleListingStatusChange($this, $newStatus);
    }

    /**
     * Scope: Listings published on Facebook.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePublishedOnFacebook($query)
    {
        return $query->whereHas('facebookPosts', function ($q) {
            $q->where('status', FacebookPost::STATUS_PUBLISHED);
        });
    }

    /**
     * Scope: Listings not published on Facebook.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNotPublishedOnFacebook($query)
    {
        return $query->whereDoesntHave('facebookPosts', function ($q) {
            $q->where('status', FacebookPost::STATUS_PUBLISHED);
        });
    }

    /**
     * Scope: Listings with Facebook auto-publish enabled owner.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithAutoPublishEnabledOwner($query)
    {
        return $query->whereHas('user.facebookPageConnection', function ($q) {
            $q->where('auto_publish_enabled', true)
                ->where('token_expires_at', '>', now());
        });
    }
}
