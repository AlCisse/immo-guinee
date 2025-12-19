<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // MinIO/S3 Configuration for Images and Documents
        'minio' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'immog'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => false,
        ],

        // Listings images storage
        // TODO: Switch to MinIO S3 when flysystem-aws-s3-v3 is compatible with Laravel 12
        'listings' => [
            'driver' => env('LISTINGS_DISK_DRIVER', 'local'),
            'root' => storage_path('app/public/listings'),
            'url' => env('APP_URL').'/storage/listings',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Listings images storage (MinIO - for future use)
        'listings-minio' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_LISTINGS_BUCKET', 'immog-listings'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'public',
            'throw' => false,
        ],

        // User documents storage (ID cards, contracts, etc.)
        'documents' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_DOCUMENTS_BUCKET', 'immog-documents'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'private',
            'throw' => false,
        ],

        // Secure contracts storage with Object Lock (WORM - 10 years retention)
        // FR-032: Legal requirement for contract archival
        'contracts-secure' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_CONTRACTS_SECURE_BUCKET', 'immog-contracts-secure'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'private',
            'throw' => true, // Throw on errors for critical data
        ],

        // User profile images
        'avatars' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_AVATARS_BUCKET', 'immog-avatars'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'public',
            'throw' => false,
        ],

        // Certificates and badges
        'certificates' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_CERTIFICATES_BUCKET', 'immog-certificates'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'private',
            'throw' => false,
        ],

        // Voice messages storage
        'messages' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY'),
            'secret' => env('MINIO_SECRET_KEY'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_MESSAGES_BUCKET', 'immog-messages'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'visibility' => 'public',
            'throw' => false,
        ],

        // AWS S3 (fallback/production alternative)
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

        // DigitalOcean Spaces (CDN backup/mirror)
        // Used for serving images via Cloudflare CDN: images.immoguinee.com
        // Synced from MinIO via rclone
        'spaces' => [
            'driver' => 's3',
            'key' => env('DO_SPACES_ACCESS_KEY'),
            'secret' => env('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'url' => env('DO_SPACES_CDN_URL', 'https://images.immoguinee.com'),
            'visibility' => 'public',
            'throw' => true,
        ],

        // DigitalOcean Spaces for backups (private)
        'spaces-backup' => [
            'driver' => 's3',
            'key' => env('DO_SPACES_ACCESS_KEY'),
            'secret' => env('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'backups',
            'visibility' => 'private',
            'throw' => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
