<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Database Connection Name
    |--------------------------------------------------------------------------
    */

    'default' => env('DB_CONNECTION', 'pgsql'),

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    */

    'connections' => [

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', 'postgres'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'immog_db'),
            'username' => env('DB_USERNAME', 'immog_user'),
            'password' => env('DB_PASSWORD', 'REDACTED_DB_PASSWORD'),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

        // Read replica for scaling (FR-097)
        'pgsql_read' => [
            'driver' => 'pgsql',
            'read' => [
                'host' => [
                    env('DB_READ_HOST_1', env('DB_HOST', 'postgres')),
                    env('DB_READ_HOST_2', env('DB_HOST', 'postgres')),
                ],
            ],
            'write' => [
                'host' => [
                    env('DB_HOST', 'postgres'),
                ],
            ],
            'sticky' => true,
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'immog_db'),
            'username' => env('DB_USERNAME', 'immog_user'),
            'password' => env('DB_PASSWORD', 'REDACTED_DB_PASSWORD'),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    */

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Redis Databases
    |--------------------------------------------------------------------------
    */

    'redis' => [

        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_'),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', 'redis'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD', 'immog_redis_secret'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', 'redis'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD', 'immog_redis_secret'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
        ],

        'queue' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', 'redis'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD', 'immog_redis_secret'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_QUEUE_DB', '2'),
        ],

        'session' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', 'redis'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD', 'immog_redis_secret'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_SESSION_DB', '3'),
        ],

    ],

];
