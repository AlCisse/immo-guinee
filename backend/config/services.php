<?php

use App\Helpers\SecretHelper;

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'from_number' => env('TWILIO_FROM_NUMBER'),
    ],

    'orange_money' => [
        'merchant_id' => env('ORANGE_MONEY_MERCHANT_ID'),
        'api_key' => env('ORANGE_MONEY_API_KEY'),
        'api_secret' => env('ORANGE_MONEY_API_SECRET'),
        'base_url' => env('ORANGE_MONEY_BASE_URL', 'https://api.orange.com/'),
    ],

    'mtn_momo' => [
        'api_user' => env('MTN_MOMO_API_USER'),
        'api_key' => env('MTN_MOMO_API_KEY'),
        'subscription_key' => env('MTN_MOMO_SUBSCRIPTION_KEY'),
        'base_url' => env('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com/'),
        'environment' => env('MTN_MOMO_ENVIRONMENT', 'sandbox'),
    ],

    'waha' => [
        'url' => env('WAHA_URL', 'http://waha:3000'),
        'api_key' => SecretHelper::get('WAHA_API_KEY'),
        'session_name' => env('WAHA_SESSION_NAME', 'default'),
    ],

    'n8n' => [
        'webhook_url' => env('N8N_WEBHOOK_URL', 'http://n8n:5678/webhook/send-otp'),
        'base_url' => env('N8N_BASE_URL', 'http://n8n:5678'),
    ],

];
