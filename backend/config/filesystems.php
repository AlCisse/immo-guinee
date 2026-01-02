<?php

use App\Helpers\SecretHelper;

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
    | Storage Strategy
    |--------------------------------------------------------------------------
    |
    | 'spaces' = Direct upload to DigitalOcean Spaces (recommended for production)
    | 'minio'  = Upload to MinIO first, then sync to Spaces (legacy)
    | 'local'  = Local storage only (development)
    |
    */
    'strategy' => env('STORAGE_STRATEGY', 'spaces'),

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

        // Listings images storage (local - for legacy compatibility)
        // In production with STORAGE_STRATEGY=spaces, ListingPhoto model redirects to spaces-listings
        'listings' => [
            'driver' => 'local',
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

        // =========================================================================
        // DigitalOcean Spaces - PRIMARY PERMANENT STORAGE
        // =========================================================================
        // All files are stored permanently on Spaces with CDN via images.immoguinee.com
        // MinIO is only used as temporary cache (48h) for upload processing

        // Spaces - Listings images (public, direct access)
        // Uses SecretHelper to read from Docker secrets (/run/secrets/do_spaces_*)
        // Note: 'root' handles the folder prefix, 'url' is the direct Spaces URL
        'spaces-listings' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'url' => env('DO_SPACES_CDN_URL', 'https://images.immoguinee.com'),
            'root' => 'listings',
            'throw' => true,
            'visibility' => 'public',
            'options' => [
                'ACL' => 'public-read',
            ],
        ],

        // Spaces - User avatars (public, direct access)
        'spaces-avatars' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'url' => env('DO_SPACES_CDN_URL', 'https://images.immoguinee.com'),
            'root' => 'avatars',
            'throw' => true,
            'visibility' => 'public',
            'options' => [
                'ACL' => 'public-read',
            ],
        ],

        // Spaces - Documents (private, no CDN)
        'spaces-documents' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'documents',
            'throw' => true,
            'options' => [
                'ACL' => 'private',
            ],
        ],

        // Spaces - Contracts (private, legal retention)
        'spaces-contracts' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'contracts',
            'throw' => true,
            'options' => [
                'ACL' => 'private',
            ],
        ],

        // Spaces - Certificates (private)
        'spaces-certificates' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'certificates',
            'throw' => true,
            'options' => [
                'ACL' => 'private',
            ],
        ],

        // Spaces - Messages/voice (public)
        'spaces-messages' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'url' => env('DO_SPACES_CDN_URL', 'https://images.immoguinee.com'),
            'root' => 'messages',
            'throw' => true,
            'visibility' => 'public',
            'options' => [
                'ACL' => 'public-read',
            ],
        ],

        // Spaces - Generic (for legacy compatibility)
        'spaces' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'url' => env('DO_SPACES_CDN_URL', 'https://images.immoguinee.com'),
            'throw' => true,
            'visibility' => 'public',
            'options' => [
                'ACL' => 'public-read',
            ],
        ],

        // Spaces - Backups (private, encrypted)
        'spaces-backups' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'backups',
            'throw' => true,
            'options' => [
                'ACL' => 'private',
            ],
        ],

        // =========================================================================
        // E2E ENCRYPTED MEDIA - TEMPORARY STORAGE
        // =========================================================================
        // Encrypted media blobs are stored here temporarily (7 days max)
        // The server cannot decrypt these files - keys are never stored
        // Files are auto-deleted after recipient downloads or TTL expires

        'encrypted-temp' => [
            'driver' => 's3',
            'key' => SecretHelper::get('DO_SPACES_ACCESS_KEY'),
            'secret' => SecretHelper::get('DO_SPACES_SECRET_KEY'),
            'region' => env('DO_SPACES_REGION', 'fra1'),
            'bucket' => env('DO_SPACES_BUCKET', 'immoguinee'),
            'endpoint' => env('DO_SPACES_ENDPOINT', 'https://fra1.digitaloceanspaces.com'),
            'root' => 'encrypted-temp',
            'throw' => true,
            'visibility' => 'private',
            'options' => [
                'ACL' => 'private',
            ],
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
