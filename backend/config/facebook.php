<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Facebook Graph API Version
    |--------------------------------------------------------------------------
    |
    | The version of the Facebook Graph API to use for all requests.
    | Update this when migrating to newer API versions.
    |
    */

    'api_version' => env('FACEBOOK_API_VERSION', 'v18.0'),

    /*
    |--------------------------------------------------------------------------
    | OAuth Redirect URI
    |--------------------------------------------------------------------------
    |
    | The callback URL that Facebook will redirect to after authorization.
    | This must match exactly what's configured in Meta App Dashboard.
    |
    */

    'redirect_uri' => env('FACEBOOK_REDIRECT_URI', env('APP_URL') . '/api/facebook/callback'),

    /*
    |--------------------------------------------------------------------------
    | Required OAuth Scopes
    |--------------------------------------------------------------------------
    |
    | The permissions required for Facebook Page auto-publication.
    | These require Meta App Review approval.
    |
    | - public_profile: Basic user info for linking
    | - pages_manage_posts: Publish/delete posts on Pages
    | - pages_read_engagement: Read Page metrics
    |
    */

    'scopes' => [
        'public_profile',
        'pages_manage_posts',
        'pages_read_engagement',
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limits
    |--------------------------------------------------------------------------
    |
    | Facebook Graph API rate limits to respect.
    | These are enforced at the application level.
    |
    */

    'rate_limits' => [
        'posts_per_hour' => env('FACEBOOK_POSTS_PER_HOUR', 200),
        'api_calls_per_hour' => env('FACEBOOK_API_CALLS_PER_HOUR', 4800),
    ],

    /*
    |--------------------------------------------------------------------------
    | Token Refresh Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for automatic token refresh.
    |
    */

    'token_refresh' => [
        // Days before expiration to trigger refresh
        'days_before_expiry' => env('FACEBOOK_TOKEN_REFRESH_DAYS', 7),

        // Time to run daily refresh job (GMT)
        'refresh_time' => env('FACEBOOK_TOKEN_REFRESH_TIME', '03:00'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Watermark Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for image watermarking before Facebook publication.
    |
    */

    'watermark' => [
        // Path to watermark logo (relative to storage/app)
        'logo_path' => env('FACEBOOK_WATERMARK_PATH', 'watermarks/immoguinee-logo.png'),

        // Watermark size as percentage of image width
        'size_percent' => env('FACEBOOK_WATERMARK_SIZE', 10),

        // Watermark opacity (0-100)
        'opacity' => env('FACEBOOK_WATERMARK_OPACITY', 70),

        // Margin from edges in pixels
        'margin' => env('FACEBOOK_WATERMARK_MARGIN', 20),

        // Position: bottom-right, bottom-left, top-right, top-left
        'position' => env('FACEBOOK_WATERMARK_POSITION', 'bottom-right'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Post Content Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for Facebook post content generation.
    |
    */

    'post' => [
        // Maximum description length
        'max_description_length' => env('FACEBOOK_POST_MAX_LENGTH', 500),

        // Hashtags to append to posts
        'hashtags' => [
            '#ImmoGuinée',
            '#Immobilier',
            '#Guinée',
        ],

        // Attribution text
        'attribution' => 'Publié via ImmoGuinée',
    ],

];
