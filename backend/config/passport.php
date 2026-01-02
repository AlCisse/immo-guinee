<?php

// Read key from Docker secret file or env variable
$getKey = function (string $secretPath, string $envVar): ?string {
    // Try Docker secret first
    if (file_exists($secretPath)) {
        return trim(file_get_contents($secretPath));
    }
    // Fall back to environment variable
    return env($envVar);
};

return [

    /*
    |--------------------------------------------------------------------------
    | Passport Guard
    |--------------------------------------------------------------------------
    |
    | Here you may specify which authentication guard Passport will use when
    | authenticating users. This value should correspond with one of your
    | guards that is already present in your "auth" configuration file.
    |
    */

    'guard' => 'api',

    /*
    |--------------------------------------------------------------------------
    | Encryption Keys
    |--------------------------------------------------------------------------
    |
    | Passport uses encryption keys while generating secure access tokens for
    | your application. By default, the keys are stored as local files but
    | can be set via environment variables when that is more convenient.
    | In Docker Swarm, keys are read from /run/secrets/.
    |
    */

    'private_key' => $getKey('/run/secrets/passport_private_key', 'PASSPORT_PRIVATE_KEY'),

    'public_key' => $getKey('/run/secrets/passport_public_key', 'PASSPORT_PUBLIC_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Client UUIDs
    |--------------------------------------------------------------------------
    |
    | By default, Passport uses auto-incrementing primary keys when assigning
    | IDs to clients. However, if Passport is installed using the provided
    | --uuids switch, this will be set to "true" and UUIDs will be used.
    |
    */

    'client_uuids' => false,

    /*
    |--------------------------------------------------------------------------
    | Personal Access Client
    |--------------------------------------------------------------------------
    |
    | If you enable client hashing, you should set the personal access client
    | ID and unhashed secret within your environment file. The values will
    | get used while issuing fresh personal access tokens to your users.
    |
    */

    'personal_access_client' => [
        'id' => $getKey('/run/secrets/passport_personal_access_client_id', 'PASSPORT_PERSONAL_ACCESS_CLIENT_ID'),
        'secret' => $getKey('/run/secrets/passport_personal_access_client_secret', 'PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Passport Storage Driver
    |--------------------------------------------------------------------------
    |
    | This configuration options determines the storage driver that will
    | be used to store tokens, auth codes, and clients. You are free
    | to set this to any of the drivers supported by your application.
    |
    */

    'storage' => [
        'database' => [
            'connection' => env('DB_CONNECTION', 'pgsql'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Token Expiration
    |--------------------------------------------------------------------------
    |
    | Define the expiration time for access tokens and refresh tokens.
    | By default, access tokens expire after 1 year and refresh tokens
    | expire after 10 years. You can customize this as needed.
    |
    */

    'expiration' => [
        'access_token' => env('PASSPORT_ACCESS_TOKEN_EXPIRE', 86400), // 24 hours
        'refresh_token' => env('PASSPORT_REFRESH_TOKEN_EXPIRE', 604800), // 7 days (was 30)
        'personal_access_token' => env('PASSPORT_PERSONAL_ACCESS_TOKEN_EXPIRE', 7776000), // 90 days (was 1 year)
    ],

];
