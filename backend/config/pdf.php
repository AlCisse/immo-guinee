<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | PDF Configuration for ImmoGuinée Contracts
    |--------------------------------------------------------------------------
    |
    | This file configures the PDF generation settings for contracts
    | using Laravel DomPDF package (barryvdh/laravel-dompdf).
    |
    */

    /*
    |--------------------------------------------------------------------------
    | PDF Driver
    |--------------------------------------------------------------------------
    |
    | Supported: "dompdf", "snappy"
    | DomPDF is recommended for server environments without wkhtmltopdf.
    |
    */

    'driver' => env('PDF_DRIVER', 'dompdf'),

    /*
    |--------------------------------------------------------------------------
    | DomPDF Configuration
    |--------------------------------------------------------------------------
    */

    'dompdf' => [
        // Paper settings
        'paper' => [
            'default_paper_size' => 'a4',
            'default_paper_orientation' => 'portrait',
        ],

        // Font settings
        'font' => [
            'font_dir' => storage_path('fonts/'),
            'font_cache' => storage_path('fonts/'),
            'default_font' => 'DejaVu Sans',
        ],

        // Rendering options
        'options' => [
            'isHtml5ParserEnabled' => true,
            'isPhpEnabled' => false,
            'isRemoteEnabled' => true,
            'isFontSubsettingEnabled' => true,
            'chroot' => base_path(),
            'defaultMediaType' => 'screen',
            'defaultPaperSize' => 'a4',
            'defaultPaperOrientation' => 'portrait',
            'dpi' => 96,
            'enable_css_float' => true,
            'enable_javascript' => false,
            'pdfBackend' => 'CPDF',
        ],

        // Margin settings (in mm)
        'margins' => [
            'top' => 20,
            'bottom' => 20,
            'left' => 15,
            'right' => 15,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Contract Templates Configuration
    |--------------------------------------------------------------------------
    */

    'templates' => [
        'bail_location_residentiel' => [
            'view' => 'contracts.bail-location-residentiel',
            'name' => 'Bail de Location Résidentiel',
            'description' => 'Contrat de location pour habitation principale',
            'required_fields' => [
                'date_debut',
                'date_fin',
                'loyer_mensuel',
                'caution_mois',
                'avance_mois',
            ],
        ],
        'bail_location_commercial' => [
            'view' => 'contracts.bail-location-commercial',
            'name' => 'Bail de Location Commercial',
            'description' => 'Contrat de location pour usage commercial',
            'required_fields' => [
                'date_debut',
                'date_fin',
                'loyer_mensuel',
                'caution_mois',
                'activite_commerciale',
            ],
        ],
        'promesse_vente_terrain' => [
            'view' => 'contracts.promesse-vente-terrain',
            'name' => 'Promesse de Vente de Terrain',
            'description' => 'Acte de promesse de vente d\'un terrain',
            'required_fields' => [
                'prix_vente',
                'superficie',
                'reference_cadastrale',
                'titre_foncier',
            ],
        ],
        'mandat_gestion' => [
            'view' => 'contracts.mandat-gestion',
            'name' => 'Mandat de Gestion Locative',
            'description' => 'Mandat confié à ImmoGuinée pour gérer un bien',
            'required_fields' => [
                'date_debut',
                'duree_mois',
                'commission_pourcentage',
            ],
        ],
        'attestation_caution' => [
            'view' => 'contracts.attestation-caution',
            'name' => 'Attestation de Caution',
            'description' => 'Attestation de dépôt de caution',
            'required_fields' => [
                'montant_caution',
                'date_depot',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Legal References
    |--------------------------------------------------------------------------
    |
    | Guinea law references included in contracts for legal compliance.
    |
    */

    'legal' => [
        // Loi guinéenne sur les baux
        'bail_law' => 'Loi L/2016/037/AN du 28 juillet 2016 portant Code Civil de la République de Guinée',

        // Code des obligations
        'obligations_code' => 'Code des Obligations Civiles et Commerciales de Guinée',

        // OHADA references for commercial contracts
        'ohada' => 'Acte Uniforme OHADA relatif au Droit Commercial Général',

        // Retraction period (48h as per spec)
        'retraction_hours' => 48,

        // Minimum contract validity
        'min_validity_months' => 6,

        // Maximum caution months
        'max_caution_months' => 6,
    ],

    /*
    |--------------------------------------------------------------------------
    | Signature & Security Settings
    |--------------------------------------------------------------------------
    */

    'signature' => [
        // Hash algorithm for PDF integrity
        'hash_algorithm' => 'sha256',

        // Signature watermark position
        'watermark_position' => 'bottom-right',

        // Electronic signature format
        'signature_format' => 'Signé électroniquement par {name} le {date} à {time} - OTP vérifié',

        // Timestamp format
        'timestamp_format' => 'd/m/Y à H:i:s (GMT)',
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage Settings
    |--------------------------------------------------------------------------
    */

    'storage' => [
        // Storage disk for contracts
        'disk' => env('PDF_STORAGE_DISK', 's3'),

        // Contract files directory
        'directory' => 'contracts',

        // Signed contracts directory
        'signed_directory' => 'contracts/signed',

        // Archive directory
        'archive_directory' => 'contracts/archive',

        // Retention period in years
        'retention_years' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Watermark Settings for Downloads
    |--------------------------------------------------------------------------
    */

    'watermark' => [
        'enabled' => true,
        'text' => 'Téléchargé par {name} le {date}',
        'opacity' => 0.1,
        'font_size' => 12,
        'color' => '#999999',
    ],
];
