<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Dashboard URLs Configuration
    |--------------------------------------------------------------------------
    |
    | This file defines the dashboard URLs for each user role.
    | All URLs are loaded from environment variables to allow easy
    | configuration per environment.
    |
    */

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    /*
    |--------------------------------------------------------------------------
    | Role-based Dashboard Routes
    |--------------------------------------------------------------------------
    |
    | Define the dashboard path for each role. These paths will be
    | appended to the frontend_url to form the complete redirect URL.
    |
    */

    'routes' => [
        'admin' => env('DASHBOARD_ADMIN_PATH', '/admin'),
        'moderator' => env('DASHBOARD_MODERATOR_PATH', '/moderator'),
        'mediator' => env('DASHBOARD_MEDIATOR_PATH', '/mediator'),
        'proprietaire' => env('DASHBOARD_PROPRIETAIRE_PATH', '/dashboard'),
        'agence' => env('DASHBOARD_AGENCE_PATH', '/dashboard'),
        'agent' => env('DASHBOARD_AGENT_PATH', '/dashboard'),
        'particulier' => env('DASHBOARD_USER_PATH', '/'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Role Priority
    |--------------------------------------------------------------------------
    |
    | When a user has multiple roles, this defines which role takes
    | priority for redirection. Higher priority roles are checked first.
    |
    */

    'priority' => [
        'admin',
        'moderator',
        'mediator',
        'proprietaire',
        'agence',
        'agent',
        'particulier',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Route
    |--------------------------------------------------------------------------
    |
    | The default route to use when no role matches or user has no roles.
    |
    */

    'default' => env('DASHBOARD_DEFAULT_PATH', '/'),

    /*
    |--------------------------------------------------------------------------
    | API Route Prefixes
    |--------------------------------------------------------------------------
    |
    | Define the API route prefixes that each role can access.
    | Used by the EnsureUserHasRole middleware.
    |
    */

    'api_prefixes' => [
        'admin' => [
            'admin',
            'moderation',
        ],
        'mediator' => [
            'disputes',
            'mediation',
        ],
        'agent' => [
            'listings',
            'contracts',
            'payments',
        ],
        'particulier' => [
            'listings',
            'contracts',
            'payments',
            'messaging',
            'favorites',
        ],
    ],
];
