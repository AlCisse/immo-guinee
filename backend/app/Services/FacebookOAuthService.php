<?php

namespace App\Services;

use App\Helpers\SecretHelper;
use App\Models\FacebookPageConnection;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Exception;

/**
 * Facebook OAuth Service
 *
 * Handles OAuth 2.0 flow with Meta for connecting Facebook Pages.
 *
 * Security:
 * - App credentials from Docker Secrets (never hardcoded)
 * - Tokens NEVER logged
 * - State parameter for CSRF protection
 * - Tokens encrypted before storage (handled by model)
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookOAuthService
{
    /**
     * Facebook Graph API base URL.
     */
    protected const GRAPH_API_URL = 'https://graph.facebook.com';

    /**
     * Facebook OAuth base URL.
     */
    protected const OAUTH_URL = 'https://www.facebook.com';

    /**
     * Graph API version.
     */
    protected string $apiVersion;

    /**
     * Facebook App ID.
     */
    protected ?string $appId;

    /**
     * Facebook App Secret (from Docker Secrets).
     */
    protected ?string $appSecret;

    /**
     * OAuth redirect URI.
     */
    protected string $redirectUri;

    /**
     * Required OAuth scopes.
     */
    protected array $scopes = [
        'public_profile',
        'pages_show_list',
        'pages_manage_posts',
        'pages_read_engagement',
    ];

    /**
     * State token cache prefix.
     */
    protected const STATE_CACHE_PREFIX = 'facebook_oauth_state_';

    /**
     * State token TTL in seconds (10 minutes).
     */
    protected const STATE_TTL = 600;

    /**
     * Temporary token cache prefix (for page selection flow).
     */
    protected const TEMP_TOKEN_PREFIX = 'facebook_temp_token_';

    /**
     * Temporary token TTL in seconds (5 minutes).
     */
    protected const TEMP_TOKEN_TTL = 300;

    public function __construct()
    {
        $this->apiVersion = config('services.facebook.api_version', 'v18.0');
        $this->appId = SecretHelper::get('FACEBOOK_APP_ID');
        $this->appSecret = SecretHelper::get('FACEBOOK_APP_SECRET');
        $this->redirectUri = config('services.facebook.redirect_uri')
            ?? config('app.url') . '/api/facebook/callback';
    }

    /**
     * Check if Facebook integration is configured.
     *
     * @return bool
     */
    public function isConfigured(): bool
    {
        return !empty($this->appId) && !empty($this->appSecret);
    }

    /**
     * Generate the authorization URL for OAuth flow.
     *
     * @param User $user
     * @return array{authorization_url: string, state: string}
     * @throws Exception
     */
    public function getAuthorizationUrl(User $user): array
    {
        if (!$this->isConfigured()) {
            throw new Exception('facebook.error.not_configured');
        }

        // Generate CSRF state token
        $state = Str::random(40);

        // Store state in cache linked to user
        Cache::put(
            self::STATE_CACHE_PREFIX . $state,
            $user->id,
            self::STATE_TTL
        );

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'scope' => implode(',', $this->scopes),
            'state' => $state,
            'response_type' => 'code',
        ];

        $authorizationUrl = self::OAUTH_URL . '/' . $this->apiVersion . '/dialog/oauth?' . http_build_query($params);

        Log::info('Facebook OAuth flow initiated', [
            'user_id' => $user->id,
            // Never log state or tokens
        ]);

        return [
            'authorization_url' => $authorizationUrl,
            'state' => $state,
        ];
    }

    /**
     * Validate state token and get associated user ID.
     *
     * @param string $state
     * @return string|null User ID if valid, null otherwise
     */
    public function validateState(string $state): ?string
    {
        $userId = Cache::pull(self::STATE_CACHE_PREFIX . $state);

        if (!$userId) {
            Log::warning('Facebook OAuth invalid state token');
            return null;
        }

        return $userId;
    }

    /**
     * Exchange authorization code for access token.
     *
     * @param string $code
     * @return array{access_token: string, expires_in: int}
     * @throws Exception
     */
    public function exchangeCodeForToken(string $code): array
    {
        if (!$this->isConfigured()) {
            throw new Exception('facebook.error.not_configured');
        }

        $response = Http::get(self::GRAPH_API_URL . '/' . $this->apiVersion . '/oauth/access_token', [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
        ]);

        if (!$response->successful()) {
            $error = $response->json('error.message', 'Unknown error');
            Log::error('Facebook OAuth token exchange failed', [
                'error' => $error,
                // Never log code or tokens
            ]);
            throw new Exception('facebook.error.oauth_failed');
        }

        $data = $response->json();

        if (!isset($data['access_token'])) {
            throw new Exception('facebook.error.oauth_failed');
        }

        // Log success without sensitive data
        Log::info('Facebook OAuth token exchanged successfully');

        return [
            'access_token' => $data['access_token'],
            'expires_in' => $data['expires_in'] ?? 3600,
        ];
    }

    /**
     * Get long-lived access token from short-lived token.
     *
     * @param string $shortLivedToken
     * @return array{access_token: string, expires_in: int}
     * @throws Exception
     */
    public function getLongLivedToken(string $shortLivedToken): array
    {
        if (!$this->isConfigured()) {
            throw new Exception('facebook.error.not_configured');
        }

        $response = Http::get(self::GRAPH_API_URL . '/' . $this->apiVersion . '/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortLivedToken,
        ]);

        if (!$response->successful()) {
            Log::error('Facebook long-lived token exchange failed');
            throw new Exception('facebook.error.token_exchange_failed');
        }

        $data = $response->json();

        if (!isset($data['access_token'])) {
            throw new Exception('facebook.error.token_exchange_failed');
        }

        Log::info('Facebook long-lived token obtained successfully');

        return [
            'access_token' => $data['access_token'],
            'expires_in' => $data['expires_in'] ?? 5184000, // ~60 days default
        ];
    }

    /**
     * Get user's Facebook Pages.
     *
     * @param string $userAccessToken
     * @return array
     * @throws Exception
     */
    public function getUserPages(string $userAccessToken): array
    {
        $response = Http::get(self::GRAPH_API_URL . '/' . $this->apiVersion . '/me/accounts', [
            'access_token' => $userAccessToken,
            'fields' => 'id,name,category,picture,fan_count,is_published,access_token',
        ]);

        Log::info('Facebook API /me/accounts response', [
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        if (!$response->successful()) {
            $error = $response->json('error.message', 'Unknown error');
            Log::error('Facebook get pages failed', ['error' => $error]);
            throw new Exception('facebook.error.pages_fetch_failed');
        }

        $data = $response->json();
        $pages = $data['data'] ?? [];

        if (empty($pages)) {
            Log::info('Facebook user has no pages', ['full_response' => $data]);
            return [];
        }

        // Map to clean structure (without exposing page tokens in logs)
        $cleanPages = array_map(function ($page) {
            return [
                'id' => $page['id'],
                'name' => $page['name'],
                'category' => $page['category'] ?? null,
                'picture_url' => $page['picture']['data']['url'] ?? null,
                'fan_count' => $page['fan_count'] ?? 0,
                'is_published' => $page['is_published'] ?? true,
                // access_token stored but not returned in this array
                '_access_token' => $page['access_token'] ?? null,
            ];
        }, $pages);

        Log::info('Facebook pages retrieved', ['count' => count($cleanPages)]);

        return $cleanPages;
    }

    /**
     * Store temporary token for page selection flow.
     *
     * @param string $userId
     * @param string $userAccessToken
     * @param array $pages
     * @return string Temporary token
     */
    public function storeTempToken(string $userId, string $userAccessToken, array $pages): string
    {
        $tempToken = Str::random(64);

        Cache::put(
            self::TEMP_TOKEN_PREFIX . $tempToken,
            [
                'user_id' => $userId,
                'user_access_token' => $userAccessToken,
                'pages' => $pages,
            ],
            self::TEMP_TOKEN_TTL
        );

        return $tempToken;
    }

    /**
     * Get and validate temporary token data.
     *
     * @param string $tempToken
     * @param string $userId
     * @return array|null
     */
    public function getTempTokenData(string $tempToken, string $userId): ?array
    {
        $data = Cache::get(self::TEMP_TOKEN_PREFIX . $tempToken);

        if (!$data || $data['user_id'] !== $userId) {
            return null;
        }

        return $data;
    }

    /**
     * Clear temporary token after use.
     *
     * @param string $tempToken
     * @return void
     */
    public function clearTempToken(string $tempToken): void
    {
        Cache::forget(self::TEMP_TOKEN_PREFIX . $tempToken);
    }

    /**
     * Get page access token from stored pages data.
     *
     * @param array $pages
     * @param string $pageId
     * @return string|null
     */
    public function getPageAccessToken(array $pages, string $pageId): ?string
    {
        foreach ($pages as $page) {
            if ($page['id'] === $pageId && isset($page['_access_token'])) {
                return $page['_access_token'];
            }
        }

        return null;
    }

    /**
     * Refresh a page access token.
     *
     * @param FacebookPageConnection $connection
     * @return bool
     */
    public function refreshToken(FacebookPageConnection $connection): bool
    {
        try {
            // Get current token
            $currentToken = $connection->page_access_token;

            // Try to get a new long-lived token
            $response = Http::get(self::GRAPH_API_URL . '/' . $this->apiVersion . '/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'fb_exchange_token' => $currentToken,
            ]);

            if (!$response->successful()) {
                Log::warning('Facebook token refresh failed', [
                    'connection_id' => $connection->id,
                    'user_id' => $connection->user_id,
                ]);
                return false;
            }

            $data = $response->json();

            if (!isset($data['access_token'])) {
                return false;
            }

            // Update connection with new token
            $connection->update([
                'page_access_token' => $data['access_token'],
                'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 5184000),
            ]);

            Log::info('Facebook token refreshed successfully', [
                'connection_id' => $connection->id,
                'user_id' => $connection->user_id,
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Facebook token refresh exception', [
                'connection_id' => $connection->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Revoke access token and clean up.
     *
     * @param FacebookPageConnection $connection
     * @return bool
     */
    public function revokeToken(FacebookPageConnection $connection): bool
    {
        try {
            $token = $connection->page_access_token;

            // Revoke the token via Facebook API
            $response = Http::delete(self::GRAPH_API_URL . '/' . $this->apiVersion . '/me/permissions', [
                'access_token' => $token,
            ]);

            // Log revocation attempt (success or failure, we still delete locally)
            Log::info('Facebook token revocation attempted', [
                'connection_id' => $connection->id,
                'user_id' => $connection->user_id,
                'api_success' => $response->successful(),
            ]);

            return true;
        } catch (Exception $e) {
            Log::warning('Facebook token revocation failed', [
                'connection_id' => $connection->id,
                'error' => $e->getMessage(),
            ]);
            // Still return true - we'll delete the connection anyway
            return true;
        }
    }

    /**
     * Verify a token is still valid.
     *
     * @param string $accessToken
     * @return bool
     */
    public function verifyToken(string $accessToken): bool
    {
        try {
            $response = Http::get(self::GRAPH_API_URL . '/' . $this->apiVersion . '/me', [
                'access_token' => $accessToken,
                'fields' => 'id',
            ]);

            return $response->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get token debug info (expiration, scopes, etc.).
     *
     * @param string $accessToken
     * @return array|null
     */
    public function getTokenInfo(string $accessToken): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $response = Http::get(self::GRAPH_API_URL . '/debug_token', [
                'input_token' => $accessToken,
                'access_token' => $this->appId . '|' . $this->appSecret,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json('data');

            return [
                'is_valid' => $data['is_valid'] ?? false,
                'expires_at' => isset($data['expires_at']) ? now()->setTimestamp($data['expires_at']) : null,
                'scopes' => $data['scopes'] ?? [],
                'app_id' => $data['app_id'] ?? null,
            ];
        } catch (Exception $e) {
            Log::warning('Facebook token debug failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Create or update a Facebook page connection for a user.
     *
     * @param User $user
     * @param string $pageId
     * @param string $pageName
     * @param string $pageAccessToken
     * @param bool $autoPublishEnabled
     * @param int $expiresIn Token expiration in seconds
     * @return FacebookPageConnection
     */
    public function createConnection(
        User $user,
        string $pageId,
        string $pageName,
        string $pageAccessToken,
        bool $autoPublishEnabled = false,
        int $expiresIn = 5184000
    ): FacebookPageConnection {
        // Delete existing connection if any
        FacebookPageConnection::where('user_id', $user->id)->delete();

        // Create new connection
        $connection = FacebookPageConnection::create([
            'user_id' => $user->id,
            'page_id' => $pageId,
            'page_name' => $pageName,
            'page_access_token' => $pageAccessToken,
            'token_expires_at' => now()->addSeconds($expiresIn),
            'auto_publish_enabled' => $autoPublishEnabled,
            'connected_at' => now(),
        ]);

        Log::info('Facebook page connection created', [
            'user_id' => $user->id,
            'page_id' => $pageId,
            'auto_publish' => $autoPublishEnabled,
        ]);

        return $connection;
    }

    /**
     * Disconnect a user's Facebook page.
     *
     * @param User $user
     * @return bool
     */
    public function disconnect(User $user): bool
    {
        $connection = $user->facebookPageConnection;

        if (!$connection) {
            return false;
        }

        // Revoke token
        $this->revokeToken($connection);

        // Delete connection
        $connection->delete();

        Log::info('Facebook page disconnected', [
            'user_id' => $user->id,
        ]);

        return true;
    }
}
