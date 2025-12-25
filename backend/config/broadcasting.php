<?php

// Helper function to read secrets from Docker secret files
$readSecret = function (string $envVar, ?string $default = null): ?string {
    // First check for _FILE variant (Docker secrets)
    $fileEnv = $envVar . '_FILE';
    $filePath = env($fileEnv);
    if ($filePath && file_exists($filePath)) {
        return trim(file_get_contents($filePath));
    }
    // Fallback to direct environment variable
    return env($envVar, $default);
};

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    */

    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => $readSecret('REVERB_APP_KEY'),
            'secret' => $readSecret('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID', 'immoguinee'),
            'options' => [
                'host' => env('REVERB_HOST', 'reverb'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
            'client_options' => [
                // Guzzle client options
            ],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER'),
                'useTLS' => true,
            ],
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => env('BROADCAST_REDIS_CONNECTION', 'default'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
