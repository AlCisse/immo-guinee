<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FacebookPageConnection;
use App\Models\FacebookPost;
use App\Models\Listing;
use App\Services\FacebookOAuthService;
use App\Services\FacebookPagePublisher;
use App\Services\FacebookPostManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Facebook Page Integration Controller
 *
 * Handles Facebook OAuth, page connection, and post management.
 *
 * Security:
 * - All endpoints require authentication
 * - Tokens NEVER returned in responses
 * - State token validation for OAuth
 * - User can only manage their own connections
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookController extends Controller
{
    public function __construct(
        protected FacebookOAuthService $oauthService,
        protected FacebookPagePublisher $publisher,
        protected FacebookPostManager $postManager
    ) {}

    /**
     * GET /api/facebook/status
     *
     * Get Facebook connection status for authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'connected' => false,
                'message' => __('facebook.status.not_connected'),
            ]);
        }

        $tokenValid = $connection->token_expires_at > now();
        $tokenExpiringSoon = $connection->token_expires_at <= now()->addDays(
            config('facebook.token_refresh_days', 7)
        );

        return response()->json([
            'connected' => true,
            'page_id' => $connection->page_id,
            'page_name' => $connection->page_name,
            'auto_publish_enabled' => $connection->auto_publish_enabled,
            'token_valid' => $tokenValid,
            'token_expiring_soon' => $tokenExpiringSoon && $tokenValid,
            'token_expires_at' => $connection->token_expires_at?->toIso8601String(),
            'connected_at' => $connection->created_at->toIso8601String(),
        ]);
    }

    /**
     * POST /api/facebook/connect
     *
     * Initiate Facebook OAuth flow.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function connect(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Check if already connected
            if ($user->facebookPageConnection) {
                return response()->json([
                    'error' => __('facebook.error.already_connected'),
                    'error_code' => 'already_connected',
                ], 400);
            }

            $result = $this->oauthService->getAuthorizationUrl($user);

            return response()->json([
                'success' => true,
                'data' => [
                    'authorization_url' => $result['authorization_url'],
                ],
                'message' => __('facebook.connect.redirect'),
            ]);

        } catch (Exception $e) {
            Log::error('Facebook connect initiation failed', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => __('facebook.error.connect_failed'),
                'error_code' => 'connect_failed',
            ], 500);
        }
    }

    /**
     * GET /api/facebook/callback
     *
     * Handle Facebook OAuth callback.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function callback(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        try {
            // Validate state token
            $userId = $this->oauthService->validateState($request->state);

            if (!$userId) {
                return response()->json([
                    'error' => __('facebook.error.invalid_state'),
                    'error_code' => 'invalid_state',
                ], 400);
            }

            // Get the user
            $user = \App\Models\User::find($userId);
            if (!$user) {
                return response()->json([
                    'error' => __('facebook.error.user_not_found'),
                    'error_code' => 'user_not_found',
                ], 400);
            }

            // Exchange code for token
            $tokenData = $this->oauthService->exchangeCodeForToken($request->code);

            // Get long-lived token
            $longLivedToken = $this->oauthService->getLongLivedToken($tokenData['access_token']);

            // Get user's pages
            $pages = $this->oauthService->getUserPages($longLivedToken['access_token']);

            if (empty($pages)) {
                return response()->json([
                    'error' => __('facebook.error.no_pages'),
                    'error_code' => 'no_pages',
                ], 400);
            }

            // For now, use the first page (can be extended for page selection)
            $selectedPage = $pages[0];

            // Get page access token
            $pageAccessToken = $selectedPage['_access_token'] ?? $longLivedToken['access_token'];

            // Create connection
            $connection = $this->oauthService->createConnection(
                $user,
                $selectedPage['id'],
                $selectedPage['name'],
                $pageAccessToken,
                true, // auto_publish_enabled by default
                $longLivedToken['expires_in'] ?? 5184000
            );

            Log::info('Facebook page connected', [
                'user_id' => $userId,
                'page_id' => $selectedPage['id'],
            ]);

            return response()->json([
                'success' => true,
                'message' => __('facebook.connect.success'),
                'page_name' => $connection->page_name,
                'auto_publish_enabled' => $connection->auto_publish_enabled,
            ]);

        } catch (Exception $e) {
            Log::error('Facebook callback failed', [
                'error' => $e->getMessage(),
            ]);

            $errorCode = $this->mapExceptionToErrorCode($e);

            return response()->json([
                'error' => __($errorCode),
                'error_code' => $errorCode,
            ], 400);
        }
    }

    /**
     * POST /api/facebook/toggle-auto-publish
     *
     * Toggle auto-publish setting.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function toggleAutoPublish(Request $request): JsonResponse
    {
        $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $user = $request->user();
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'error' => __('facebook.error.not_connected'),
                'error_code' => 'not_connected',
            ], 400);
        }

        $connection->update([
            'auto_publish_enabled' => $request->enabled,
        ]);

        Log::info('Facebook auto-publish toggled', [
            'user_id' => $user->id,
            'enabled' => $request->enabled,
        ]);

        return response()->json([
            'success' => true,
            'auto_publish_enabled' => $connection->auto_publish_enabled,
            'message' => $request->enabled
                ? __('facebook.auto_publish.enabled')
                : __('facebook.auto_publish.disabled'),
        ]);
    }

    /**
     * DELETE /api/facebook/disconnect
     *
     * Disconnect Facebook page.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'error' => __('facebook.error.not_connected'),
                'error_code' => 'not_connected',
            ], 400);
        }

        try {
            $this->oauthService->disconnect($connection);

            Log::info('Facebook page disconnected', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => __('facebook.disconnect.success'),
            ]);

        } catch (Exception $e) {
            Log::error('Facebook disconnect failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => __('facebook.error.disconnect_failed'),
                'error_code' => 'disconnect_failed',
            ], 500);
        }
    }

    /**
     * POST /api/facebook/refresh-token
     *
     * Refresh the Facebook access token.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function refreshToken(Request $request): JsonResponse
    {
        $user = $request->user();
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'error' => __('facebook.error.not_connected'),
                'error_code' => 'not_connected',
            ], 400);
        }

        try {
            $newTokenData = $this->oauthService->refreshToken($connection->page_access_token);

            $connection->update([
                'page_access_token' => $newTokenData['access_token'],
                'token_expires_at' => $newTokenData['expires_at'],
            ]);

            Log::info('Facebook token refreshed', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => __('facebook.token.refreshed'),
                'token_expires_at' => $connection->token_expires_at->toIso8601String(),
            ]);

        } catch (Exception $e) {
            Log::error('Facebook token refresh failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => __('facebook.error.token_refresh_failed'),
                'error_code' => 'token_refresh_failed',
            ], 500);
        }
    }

    /**
     * POST /api/listings/{listing}/facebook/publish
     *
     * Manually publish a listing to Facebook.
     *
     * @param Request $request
     * @param Listing $listing
     * @return JsonResponse
     */
    public function publishListing(Request $request, Listing $listing): JsonResponse
    {
        $user = $request->user();

        // Verify ownership
        if ($listing->user_id !== $user->id) {
            return response()->json([
                'error' => __('facebook.error.not_owner'),
                'error_code' => 'not_owner',
            ], 403);
        }

        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'error' => __('facebook.error.not_connected'),
                'error_code' => 'not_connected',
            ], 400);
        }

        // Check token validity
        if ($connection->token_expires_at <= now()) {
            return response()->json([
                'error' => __('facebook.error.token_expired'),
                'error_code' => 'token_expired',
            ], 400);
        }

        // Check if already published
        if ($listing->isPublishedOnFacebook()) {
            return response()->json([
                'error' => __('facebook.error.already_published'),
                'error_code' => 'already_published',
            ], 400);
        }

        try {
            $facebookPost = $this->publisher->publish($listing, $connection);

            Log::info('Listing manually published to Facebook', [
                'listing_id' => $listing->id,
                'facebook_post_id' => $facebookPost->facebook_post_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => __('facebook.publish.success'),
                'facebook_post_id' => $facebookPost->facebook_post_id,
                'facebook_url' => $facebookPost->facebook_url,
            ]);

        } catch (Exception $e) {
            Log::error('Manual Facebook publish failed', [
                'listing_id' => $listing->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => __($e->getMessage()),
                'error_code' => 'publish_failed',
            ], 500);
        }
    }

    /**
     * DELETE /api/listings/{listing}/facebook
     *
     * Delete a listing's Facebook post.
     *
     * @param Request $request
     * @param Listing $listing
     * @return JsonResponse
     */
    public function deleteListing(Request $request, Listing $listing): JsonResponse
    {
        $user = $request->user();

        // Verify ownership
        if ($listing->user_id !== $user->id) {
            return response()->json([
                'error' => __('facebook.error.not_owner'),
                'error_code' => 'not_owner',
            ], 403);
        }

        if (!$listing->isPublishedOnFacebook()) {
            return response()->json([
                'error' => __('facebook.error.not_published'),
                'error_code' => 'not_published',
            ], 400);
        }

        try {
            $deleted = $this->postManager->deleteForListing($listing);

            if ($deleted) {
                Log::info('Facebook post deleted for listing', [
                    'listing_id' => $listing->id,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => __('facebook.delete.success'),
                ]);
            }

            return response()->json([
                'error' => __('facebook.error.delete_failed'),
                'error_code' => 'delete_failed',
            ], 500);

        } catch (Exception $e) {
            Log::error('Facebook post deletion failed', [
                'listing_id' => $listing->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => __('facebook.error.delete_failed'),
                'error_code' => 'delete_failed',
            ], 500);
        }
    }

    /**
     * GET /api/facebook/posts
     *
     * List user's Facebook posts.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function posts(Request $request): JsonResponse
    {
        $user = $request->user();
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return response()->json([
                'data' => [],
                'meta' => ['total' => 0],
            ]);
        }

        $posts = FacebookPost::where('facebook_page_connection_id', $connection->id)
            ->with('listing:id,titre,slug,photo_principale')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10));

        return response()->json([
            'data' => $posts->map(function ($post) {
                return [
                    'id' => $post->id,
                    'facebook_post_id' => $post->facebook_post_id,
                    'facebook_url' => $post->facebook_url,
                    'status' => $post->status,
                    'error_message' => $post->error_message ? __($post->error_message) : null,
                    'published_at' => $post->published_at?->toIso8601String(),
                    'deleted_at' => $post->deleted_at?->toIso8601String(),
                    'listing' => $post->listing ? [
                        'id' => $post->listing->id,
                        'titre' => $post->listing->titre,
                        'slug' => $post->listing->slug,
                        'photo_principale' => $post->listing->photo_principale,
                    ] : null,
                ];
            }),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    /**
     * GET /api/facebook/statistics
     *
     * Get Facebook publication statistics.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();

        $stats = $this->postManager->getStatistics($user->id);

        return response()->json($stats);
    }

    /**
     * Map exception to error code.
     *
     * @param Exception $e
     * @return string
     */
    protected function mapExceptionToErrorCode(Exception $e): string
    {
        $message = $e->getMessage();

        if (str_contains($message, 'token')) {
            return 'facebook.error.token_expired';
        }

        if (str_contains($message, 'permission')) {
            return 'facebook.error.permission_revoked';
        }

        if (str_contains($message, 'pages')) {
            return 'facebook.error.no_pages';
        }

        return 'facebook.error.connect_failed';
    }
}
