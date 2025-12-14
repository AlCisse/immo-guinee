<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may define the cache store and duration for geocoding results.
    | This helps reduce API calls to geocoding services.
    |
    */

    'cache' => [
        'store' => env('GEOCODER_CACHE_STORE', 'redis'),
        'duration' => env('GEOCODER_CACHE_DURATION', 86400 * 30), // 30 days
    ],

    /*
    |--------------------------------------------------------------------------
    | Providers
    |--------------------------------------------------------------------------
    |
    | Here you may specify the geocoding providers. Multiple providers can
    | be configured and the system will use the first available one.
    |
    */

    'providers' => [
        Chain::class => [
            GoogleMaps::class => [
                'api_key' => env('GOOGLE_MAPS_API_KEY'),
                'region' => env('GOOGLE_MAPS_REGION', 'gn'),
                'language' => env('GOOGLE_MAPS_LANGUAGE', 'fr'),
            ],
            Nominatim::class => [
                'root_url' => env('NOMINATIM_ROOT_URL', 'https://nominatim.openstreetmap.org'),
                'user_agent' => env('NOMINATIM_USER_AGENT', 'ImmoGuinee/1.0'),
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Adapter
    |--------------------------------------------------------------------------
    |
    | The HTTP adapter to use for geocoding requests.
    |
    */

    'adapter' => GuzzleHttp\Client::class,

    /*
    |--------------------------------------------------------------------------
    | Guinea-Specific Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration specific to Guinea's administrative divisions and
    | geolocation requirements for ImmoGuinée platform.
    |
    */

    'guinea' => [
        'country_code' => 'GN',
        'country_name' => 'Guinée',
        'default_city' => 'Conakry',
        'bounds' => [
            'north' => 12.67,
            'south' => 7.19,
            'east' => -7.64,
            'west' => -15.08,
        ],

        // Guinea communes and their coordinates
        'communes' => [
            'Kaloum' => ['lat' => 9.5092, 'lng' => -13.7122],
            'Dixinn' => ['lat' => 9.5521, 'lng' => -13.6988],
            'Matam' => ['lat' => 9.5440, 'lng' => -13.6476],
            'Ratoma' => ['lat' => 9.5794, 'lng' => -13.6489],
            'Matoto' => ['lat' => 9.5651, 'lng' => -13.6191],
        ],

        // Popular quartiers per commune
        'quartiers' => [
            'Kaloum' => [
                'Almamya',
                'Boulbinet',
                'Coronthie',
                'Sandervalia',
                'Tombo',
            ],
            'Dixinn' => [
                'Dixinn Centre',
                'Dixinn Port',
                'Dixinn Mosquée',
                'Cameroun',
                'Landréah',
            ],
            'Matam' => [
                'Matam Centre',
                'Madina',
                'Hamdallaye',
                'Teminetaye',
                'Belle-Vue',
            ],
            'Ratoma' => [
                'Ratoma Centre',
                'Kipé',
                'Dar-es-Salam',
                'Sonfonia',
                'Kaporo',
            ],
            'Matoto' => [
                'Matoto Centre',
                'Yimbaya',
                'Cosa',
                'Sangoyah',
                'Kobaya',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Reverse Geocoding
    |--------------------------------------------------------------------------
    |
    | Enable reverse geocoding to convert coordinates to addresses
    |
    */

    'reverse_geocode' => [
        'enabled' => true,
        'precision' => 'street', // street, city, or country
    ],

    /*
    |--------------------------------------------------------------------------
    | Geolocation Precision
    |--------------------------------------------------------------------------
    |
    | Define the precision level for geolocation
    |
    */

    'precision' => [
        'decimal_places' => 6,
        'search_radius_km' => 5, // Default search radius for nearby listings
        'max_search_radius_km' => 50, // Maximum search radius
    ],

];
