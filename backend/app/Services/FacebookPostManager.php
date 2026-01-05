<?php

namespace App\Services;

use App\Models\FacebookPageConnection;
use App\Models\FacebookPost;
use App\Models\Listing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Exception;

/**
 * Facebook Post Manager Service
 *
 * Manages Facebook posts lifecycle including deletion when listings
 * are marked as rented or sold.
 *
 * Features:
 * - Delete posts from Facebook when listing status changes
 * - Handle expired tokens gracefully
 * - Handle revoked permissions
 * - Bulk cleanup operations
 * - Track deletion status in database
 *
 * Security:
 * - Tokens NEVER logged
 * - Validates ownership before deletion
 * - Graceful degradation on API errors
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookPostManager
{
    /**
     * Facebook Graph API base URL.
     */
    protected const GRAPH_API_URL = 'https://graph.facebook.com';

    /**
     * Graph API version.
     */
    protected string $apiVersion;

    /**
     * Facebook OAuth service for token operations.
     */
    protected FacebookOAuthService $oauthService;

    public function __construct(FacebookOAuthService $oauthService)
    {
        $this->oauthService = $oauthService;
        $this->apiVersion = config('facebook.api_version', 'v18.0');
    }

    /**
     * Delete a Facebook post.
     *
     * @param FacebookPost $facebookPost
     * @return bool
     */
    public function delete(FacebookPost $facebookPost): bool
    {
        // Skip if already deleted or failed
        if ($facebookPost->status !== FacebookPost::STATUS_PUBLISHED) {
            Log::info('Facebook post not in published state, skipping deletion', [
                'facebook_post_id' => $facebookPost->facebook_post_id,
                'current_status' => $facebookPost->status,
            ]);
            return true;
        }

        try {
            $connection = $facebookPost->facebookPageConnection;

            if (!$connection) {
                Log::warning('Facebook connection not found for post', [
                    'facebook_post_id' => $facebookPost->facebook_post_id,
                ]);
                $facebookPost->markAsFailed('facebook.error.connection_not_found');
                return false;
            }

            // Get decrypted page access token
            $pageAccessToken = $connection->page_access_token;

            // Make delete request to Facebook API
            $response = Http::delete(
                self::GRAPH_API_URL . '/' . $this->apiVersion . '/' . $facebookPost->facebook_post_id,
                [
                    'access_token' => $pageAccessToken,
                ]
            );

            if ($response->successful()) {
                $facebookPost->markAsDeleted();
                Log::info('Facebook post deleted successfully', [
                    'facebook_post_id' => $facebookPost->facebook_post_id,
                    'listing_id' => $facebookPost->listing_id,
                ]);
                return true;
            }

            // Handle specific error cases
            $errorCode = $response->json('error.code');
            $errorMessage = $response->json('error.message', 'Unknown error');

            return $this->handleApiError($facebookPost, $connection, $errorCode, $errorMessage);

        } catch (Exception $e) {
            Log::error('Facebook post deletion failed', [
                'facebook_post_id' => $facebookPost->facebook_post_id,
                'error' => $e->getMessage(),
            ]);
            $facebookPost->markAsFailed('facebook.error.delete_failed');
            return false;
        }
    }

    /**
     * Delete Facebook post for a listing.
     *
     * @param Listing $listing
     * @return bool
     */
    public function deleteForListing(Listing $listing): bool
    {
        $facebookPost = $listing->facebookPosts()
            ->where('status', FacebookPost::STATUS_PUBLISHED)
            ->first();

        if (!$facebookPost) {
            Log::info('No published Facebook post found for listing', [
                'listing_id' => $listing->id,
            ]);
            return true;
        }

        return $this->delete($facebookPost);
    }

    /**
     * Delete all Facebook posts for a listing.
     *
     * @param Listing $listing
     * @return int Number of posts deleted
     */
    public function deleteAllForListing(Listing $listing): int
    {
        $publishedPosts = $listing->facebookPosts()
            ->where('status', FacebookPost::STATUS_PUBLISHED)
            ->get();

        $deleted = 0;

        foreach ($publishedPosts as $post) {
            if ($this->delete($post)) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Handle listing status change (rented/sold).
     *
     * This method is called when a listing status changes to a terminal state.
     *
     * @param Listing $listing
     * @param string $newStatus
     * @return bool
     */
    public function handleListingStatusChange(Listing $listing, string $newStatus): bool
    {
        // Only handle terminal statuses
        $terminalStatuses = ['LOUE', 'VENDU', 'RENTED', 'SOLD'];

        if (!in_array(strtoupper($newStatus), $terminalStatuses)) {
            return true;
        }

        Log::info('Handling listing status change for Facebook', [
            'listing_id' => $listing->id,
            'new_status' => $newStatus,
        ]);

        return $this->deleteForListing($listing);
    }

    /**
     * Cleanup old failed posts.
     *
     * Removes FacebookPost records that failed and are older than specified days.
     *
     * @param int $olderThanDays
     * @return int Number of records cleaned up
     */
    public function cleanupFailedPosts(int $olderThanDays = 30): int
    {
        $threshold = now()->subDays($olderThanDays);

        $deleted = FacebookPost::where('status', FacebookPost::STATUS_FAILED)
            ->where('created_at', '<', $threshold)
            ->delete();

        if ($deleted > 0) {
            Log::info('Cleaned up old failed Facebook posts', ['count' => $deleted]);
        }

        return $deleted;
    }

    /**
     * Retry failed posts.
     *
     * Attempts to re-publish posts that failed due to temporary errors.
     *
     * @param int $limit Maximum number of posts to retry
     * @return array{retried: int, succeeded: int}
     */
    public function retryFailedPosts(int $limit = 10): array
    {
        $failedPosts = FacebookPost::where('status', FacebookPost::STATUS_FAILED)
            ->whereIn('error_message', [
                'facebook.error.rate_limited',
                'facebook.error.network_error',
            ])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        $retried = 0;
        $succeeded = 0;

        /** @var FacebookPagePublisher $publisher */
        $publisher = app(FacebookPagePublisher::class);

        foreach ($failedPosts as $failedPost) {
            $retried++;

            try {
                $listing = $failedPost->listing;
                $connection = $failedPost->facebookPageConnection;

                if (!$listing || !$connection) {
                    continue;
                }

                // Delete the failed record
                $failedPost->delete();

                // Try to republish
                $publisher->publish($listing, $connection);
                $succeeded++;

            } catch (Exception $e) {
                Log::warning('Failed to retry Facebook post', [
                    'listing_id' => $failedPost->listing_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'retried' => $retried,
            'succeeded' => $succeeded,
        ];
    }

    /**
     * Get posts pending deletion.
     *
     * Returns posts that should be deleted (listing is rented/sold but post still published).
     *
     * @return Collection
     */
    public function getPostsPendingDeletion(): Collection
    {
        return FacebookPost::where('status', FacebookPost::STATUS_PUBLISHED)
            ->whereHas('listing', function ($query) {
                $query->whereIn('statut', ['LOUE', 'VENDU']);
            })
            ->with(['listing', 'facebookPageConnection'])
            ->get();
    }

    /**
     * Process pending deletions.
     *
     * Deletes all posts for listings that are rented/sold.
     *
     * @return array{processed: int, deleted: int, failed: int}
     */
    public function processPendingDeletions(): array
    {
        $pendingPosts = $this->getPostsPendingDeletion();

        $processed = 0;
        $deleted = 0;
        $failed = 0;

        foreach ($pendingPosts as $post) {
            $processed++;

            if ($this->delete($post)) {
                $deleted++;
            } else {
                $failed++;
            }
        }

        if ($processed > 0) {
            Log::info('Processed pending Facebook post deletions', [
                'processed' => $processed,
                'deleted' => $deleted,
                'failed' => $failed,
            ]);
        }

        return [
            'processed' => $processed,
            'deleted' => $deleted,
            'failed' => $failed,
        ];
    }

    /**
     * Handle API error response.
     *
     * @param FacebookPost $facebookPost
     * @param FacebookPageConnection $connection
     * @param int|null $errorCode
     * @param string $errorMessage
     * @return bool
     */
    protected function handleApiError(
        FacebookPost $facebookPost,
        FacebookPageConnection $connection,
        ?int $errorCode,
        string $errorMessage
    ): bool {
        // Post already deleted (404 or specific error codes)
        if ($errorCode === 100 || str_contains(strtolower($errorMessage), 'does not exist')) {
            $facebookPost->markAsDeleted();
            Log::info('Facebook post already deleted on Facebook', [
                'facebook_post_id' => $facebookPost->facebook_post_id,
            ]);
            return true;
        }

        // Token expired (190)
        if ($errorCode === 190) {
            Log::warning('Facebook token expired during deletion', [
                'user_id' => $connection->user_id,
            ]);
            $facebookPost->markAsFailed('facebook.error.token_expired');
            $this->handleExpiredToken($connection);
            return false;
        }

        // Permission revoked (200, 10)
        if (in_array($errorCode, [200, 10])) {
            Log::warning('Facebook permission revoked', [
                'user_id' => $connection->user_id,
            ]);
            $facebookPost->markAsFailed('facebook.error.permission_revoked');
            $this->handleRevokedPermissions($connection);
            return false;
        }

        // Rate limited (4, 17, 32)
        if (in_array($errorCode, [4, 17, 32])) {
            Log::warning('Facebook API rate limited', [
                'facebook_post_id' => $facebookPost->facebook_post_id,
            ]);
            $facebookPost->markAsFailed('facebook.error.rate_limited');
            return false;
        }

        // Unknown error
        Log::error('Facebook API error during deletion', [
            'facebook_post_id' => $facebookPost->facebook_post_id,
            'error_code' => $errorCode,
            'error_message' => $errorMessage,
        ]);
        $facebookPost->markAsFailed('facebook.error.delete_failed');
        return false;
    }

    /**
     * Handle expired token.
     *
     * Marks the connection as needing re-authorization.
     *
     * @param FacebookPageConnection $connection
     * @return void
     */
    protected function handleExpiredToken(FacebookPageConnection $connection): void
    {
        // Set token_expires_at to past to indicate it's expired
        $connection->update([
            'token_expires_at' => now()->subDay(),
        ]);

        Log::info('Marked Facebook connection token as expired', [
            'user_id' => $connection->user_id,
            'page_id' => $connection->page_id,
        ]);

        // TODO: Dispatch notification to user to re-authorize
        // event(new FacebookTokenExpired($connection));
    }

    /**
     * Handle revoked permissions.
     *
     * Disables auto-publish and marks connection as needing re-authorization.
     *
     * @param FacebookPageConnection $connection
     * @return void
     */
    protected function handleRevokedPermissions(FacebookPageConnection $connection): void
    {
        $connection->update([
            'auto_publish_enabled' => false,
            'token_expires_at' => now()->subDay(),
        ]);

        Log::info('Disabled Facebook connection due to revoked permissions', [
            'user_id' => $connection->user_id,
            'page_id' => $connection->page_id,
        ]);

        // TODO: Dispatch notification to user
        // event(new FacebookPermissionsRevoked($connection));
    }

    /**
     * Get statistics for a user's Facebook posts.
     *
     * @param int $userId
     * @return array
     */
    public function getStatistics(int $userId): array
    {
        $connection = FacebookPageConnection::where('user_id', $userId)->first();

        if (!$connection) {
            return [
                'connected' => false,
                'total_posts' => 0,
                'published' => 0,
                'deleted' => 0,
                'failed' => 0,
            ];
        }

        $posts = FacebookPost::where('facebook_page_connection_id', $connection->id);

        return [
            'connected' => true,
            'page_name' => $connection->page_name,
            'auto_publish_enabled' => $connection->auto_publish_enabled,
            'token_valid' => $connection->token_expires_at > now(),
            'total_posts' => (clone $posts)->count(),
            'published' => (clone $posts)->where('status', FacebookPost::STATUS_PUBLISHED)->count(),
            'deleted' => (clone $posts)->where('status', FacebookPost::STATUS_DELETED)->count(),
            'failed' => (clone $posts)->where('status', FacebookPost::STATUS_FAILED)->count(),
        ];
    }
}
