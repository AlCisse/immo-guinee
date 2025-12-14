<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Two-Factor Authentication Configuration
    |--------------------------------------------------------------------------
    |
    | This file configures the two-factor authentication settings for
    | ImmoGuinée platform. Primary method is OTP via SMS.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Enable Two-Factor Authentication
    |--------------------------------------------------------------------------
    |
    | This option controls whether 2FA is globally enabled for the application.
    | When disabled, all 2FA requirements will be bypassed.
    |
    */

    'enabled' => env('TWO_FACTOR_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Default Two-Factor Method
    |--------------------------------------------------------------------------
    |
    | The default method for two-factor authentication. Supported: "sms", "email"
    | For Guinea market, SMS is the primary channel due to better reliability.
    |
    */

    'default_method' => env('TWO_FACTOR_DEFAULT_METHOD', 'sms'),

    /*
    |--------------------------------------------------------------------------
    | OTP Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for One-Time Password generation and validation.
    |
    */

    'otp' => [
        // Number of digits in the OTP code
        'length' => (int) env('TWO_FACTOR_OTP_LENGTH', 6),

        // OTP expiration time in minutes
        'expiry_minutes' => (int) env('TWO_FACTOR_OTP_EXPIRY', 5),

        // Maximum number of OTP attempts before lockout
        'max_attempts' => (int) env('TWO_FACTOR_OTP_MAX_ATTEMPTS', 3),

        // Lockout duration in minutes after max attempts exceeded
        'lockout_minutes' => (int) env('TWO_FACTOR_OTP_LOCKOUT', 15),

        // Minimum time in seconds before a new OTP can be requested
        'resend_cooldown' => (int) env('TWO_FACTOR_OTP_RESEND_COOLDOWN', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | SMS Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for SMS-based two-factor authentication.
    | Uses Twilio by default for Guinea phone numbers.
    |
    */

    'sms' => [
        'provider' => env('TWO_FACTOR_SMS_PROVIDER', 'twilio'),

        // Message template with {code} placeholder
        'message_template' => env(
            'TWO_FACTOR_SMS_TEMPLATE',
            'Votre code de vérification ImmoGuinée est: {code}. Ce code expire dans {expiry} minutes.'
        ),

        // Sender ID (must be registered with Twilio/provider)
        'sender_id' => env('TWO_FACTOR_SMS_SENDER', 'ImmoGuinee'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Required Actions
    |--------------------------------------------------------------------------
    |
    | Define which actions require two-factor authentication.
    | These actions will prompt for 2FA even if user is logged in.
    |
    */

    'required_actions' => [
        // Account security
        'password_change' => true,
        'email_change' => true,
        'phone_change' => true,
        'account_deletion' => true,

        // Financial transactions
        'payment_initiation' => true,
        'payment_confirmation' => true,
        'contract_signing' => true,

        // Sensitive operations
        'listing_deletion' => false,
        'dispute_creation' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Trusted Device Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for the "Remember this device" feature.
    |
    */

    'trusted_devices' => [
        // Enable trusted devices feature
        'enabled' => env('TWO_FACTOR_TRUSTED_DEVICES', true),

        // Number of days a device stays trusted
        'trust_duration_days' => (int) env('TWO_FACTOR_TRUST_DURATION', 30),

        // Maximum number of trusted devices per user
        'max_devices' => (int) env('TWO_FACTOR_MAX_TRUSTED_DEVICES', 5),

        // Cookie name for trusted device token
        'cookie_name' => 'immoguinee_2fa_trusted',
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Rate limiting settings specific to 2FA requests to prevent abuse.
    |
    */

    'rate_limiting' => [
        // Maximum OTP requests per hour per phone number
        'max_requests_per_hour' => (int) env('TWO_FACTOR_MAX_REQUESTS_HOUR', 10),

        // Maximum OTP requests per day per phone number
        'max_requests_per_day' => (int) env('TWO_FACTOR_MAX_REQUESTS_DAY', 20),

        // Use Redis for rate limiting (recommended)
        'use_redis' => env('TWO_FACTOR_USE_REDIS', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Backup Codes
    |--------------------------------------------------------------------------
    |
    | Configuration for backup/recovery codes feature.
    | Note: Not primary for Guinea market, but available for diaspora users.
    |
    */

    'backup_codes' => [
        'enabled' => env('TWO_FACTOR_BACKUP_CODES', false),

        // Number of backup codes to generate
        'count' => 8,

        // Code length
        'length' => 8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging & Audit
    |--------------------------------------------------------------------------
    |
    | Settings for logging 2FA events for security audit.
    |
    */

    'logging' => [
        'enabled' => env('TWO_FACTOR_LOGGING', true),

        // Log channel to use
        'channel' => env('TWO_FACTOR_LOG_CHANNEL', 'security'),

        // Events to log
        'events' => [
            'otp_requested' => true,
            'otp_verified' => true,
            'otp_failed' => true,
            'lockout_triggered' => true,
            'device_trusted' => true,
            'device_revoked' => true,
        ],
    ],
];
