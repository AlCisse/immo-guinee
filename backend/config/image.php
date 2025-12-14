<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Image Driver
    |--------------------------------------------------------------------------
    |
    | Intervention Image supports "GD Library" and "Imagick" to process images
    | internally. You may choose one of them according to your PHP
    | configuration. By default PHP's "GD Library" implementation is used.
    |
    */

    'driver' => env('IMAGE_DRIVER', 'gd'),

    /*
    |--------------------------------------------------------------------------
    | Image Processing Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for image optimization and processing for ImmoGuinée
    | listings photos and user avatars.
    |
    */

    'listings' => [
        'sizes' => [
            'thumbnail' => [
                'width' => 300,
                'height' => 200,
                'quality' => 80,
                'format' => 'webp',
            ],
            'medium' => [
                'width' => 800,
                'height' => 600,
                'quality' => 85,
                'format' => 'webp',
            ],
            'large' => [
                'width' => 1200,
                'height' => 900,
                'quality' => 90,
                'format' => 'webp',
            ],
            'original' => [
                'max_width' => 2000,
                'max_height' => 2000,
                'quality' => 85,
                'format' => 'webp',
            ],
        ],
        'max_file_size' => 5 * 1024 * 1024, // 5MB
        'max_photos' => 10,
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    'avatars' => [
        'sizes' => [
            'thumbnail' => [
                'width' => 100,
                'height' => 100,
                'quality' => 80,
                'format' => 'webp',
            ],
            'medium' => [
                'width' => 300,
                'height' => 300,
                'quality' => 85,
                'format' => 'webp',
            ],
        ],
        'max_file_size' => 2 * 1024 * 1024, // 2MB
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    'documents' => [
        'max_file_size' => 10 * 1024 * 1024, // 10MB
        'allowed_extensions' => ['pdf', 'jpg', 'jpeg', 'png'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Optimization Settings
    |--------------------------------------------------------------------------
    |
    | Enable automatic optimization with imageoptim for better compression
    |
    */

    'optimize' => env('IMAGE_OPTIMIZE', true),

    'optimizers' => [
        'jpegoptim' => [
            '--max=85',
            '--strip-all',
            '--all-progressive',
        ],
        'pngquant' => [
            '--force',
            '--quality=80-90',
        ],
        'optipng' => [
            '-i0',
            '-o2',
            '-quiet',
        ],
        'svgo' => [
            '--disable=cleanupIDs',
        ],
        'gifsicle' => [
            '-b',
            '-O3',
        ],
        'cwebp' => [
            '-m 6',
            '-pass 10',
            '-mt',
            '-q 85',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Watermark Settings
    |--------------------------------------------------------------------------
    |
    | Apply watermark to listing images to prevent unauthorized use
    |
    */

    'watermark' => [
        'enabled' => env('WATERMARK_ENABLED', false),
        'path' => storage_path('app/watermark.png'),
        'position' => 'bottom-right',
        'opacity' => 50,
        'padding' => 10,
    ],

];
