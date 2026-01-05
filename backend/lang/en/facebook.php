<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Facebook Integration - English Translations
    |--------------------------------------------------------------------------
    |
    | Messages for Facebook Pages integration
    |
    */

    // Connection status
    'status' => [
        'not_connected' => 'Facebook page not connected',
        'connected' => 'Facebook page connected',
        'disabled' => 'Auto-publish disabled',
        'token_expired' => 'Token expired, please reconnect',
        'published' => 'Published on Facebook',
        'ready' => 'Ready to publish',
        'failed' => 'Publication failed',
    ],

    // Connection flow
    'connect' => [
        'redirect' => 'Redirecting to Facebook...',
        'success' => 'Facebook page connected successfully',
        'cancelled' => 'Facebook connection cancelled',
    ],

    // Disconnect
    'disconnect' => [
        'success' => 'Facebook page disconnected',
        'confirm' => 'Are you sure you want to disconnect your Facebook page?',
    ],

    // Auto-publish
    'auto_publish' => [
        'enabled' => 'Auto-publish enabled',
        'disabled' => 'Auto-publish disabled',
        'toggle' => 'Toggle auto-publish',
    ],

    // Publishing
    'publish' => [
        'success' => 'Listing published to Facebook',
        'pending' => 'Publishing...',
        'queued' => 'Publication queued',
    ],

    // Deletion
    'delete' => [
        'success' => 'Facebook post deleted',
        'pending' => 'Deleting...',
        'confirm' => 'Delete this Facebook post?',
    ],

    // Token
    'token' => [
        'refreshed' => 'Token refreshed successfully',
        'expiring_soon' => 'Your Facebook token is expiring soon',
        'expired_notice' => 'Please reconnect your Facebook page',
    ],

    // Errors
    'error' => [
        'not_connected' => 'No Facebook page connected',
        'already_connected' => 'A Facebook page is already connected',
        'connect_failed' => 'Facebook connection failed',
        'disconnect_failed' => 'Disconnection failed',
        'invalid_state' => 'Invalid security token',
        'no_pages' => 'No Facebook pages found on your account',
        'token_expired' => 'Facebook token expired',
        'token_refresh_failed' => 'Unable to refresh token',
        'permission_revoked' => 'Facebook permissions revoked',
        'rate_limited' => 'Too many requests, please try again later',
        'page_not_found' => 'Facebook page not found',
        'publish_failed' => 'Publication failed',
        'delete_failed' => 'Deletion failed',
        'already_published' => 'Listing already published on Facebook',
        'not_published' => 'Listing not published on Facebook',
        'not_owner' => 'You are not the owner of this listing',
        'watermark_not_found' => 'Watermark logo not found',
        'image_not_found' => 'Image not found',
        'connection_not_found' => 'Facebook connection not found',
        'auto_publish_disabled' => 'Auto-publish is disabled',
        'network_error' => 'Network error, please try again',
    ],

    // Notifications
    'notification' => [
        'published' => 'Your listing ":title" has been published on Facebook',
        'deleted' => 'Your Facebook post for ":title" has been deleted',
        'token_expiring' => 'Your Facebook token expires in :days days',
        'publish_failed' => 'Failed to publish ":title" on Facebook',
    ],

    // Admin
    'admin' => [
        'connections' => 'Facebook Connections',
        'posts' => 'Facebook Posts',
        'statistics' => 'Facebook Statistics',
    ],
];
