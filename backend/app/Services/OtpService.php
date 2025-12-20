<?php

namespace App\Services;

use App\Helpers\SecretHelper;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class OtpService
{
    /**
     * OTP expiration time in seconds (5 minutes)
     */
    const OTP_EXPIRATION = 300;

    /**
     * Maximum attempts before blocking
     */
    const MAX_ATTEMPTS = 3;

    /**
     * Block duration in seconds (30 minutes)
     */
    const BLOCK_DURATION = 1800;

    /**
     * Generate and send OTP to phone number via WhatsApp (n8n + WAHA)
     *
     * @param string $phoneNumber
     * @param string $type Type of OTP (default: 'verification', can be 'password_reset')
     * @return array
     */
    public function generate(string $phoneNumber, string $type = 'verification'): array
    {
        // Check if phone number is blocked
        if ($this->isBlocked($phoneNumber, $type)) {
            return [
                'success' => false,
                'message' => 'Trop de tentatives. Veuillez réessayer dans 30 minutes.',
            ];
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in Redis with expiration
        $key = $this->getOtpKey($phoneNumber, $type);
        Redis::setex($key, self::OTP_EXPIRATION, $otp);

        // Initialize attempts counter
        $attemptsKey = $this->getAttemptsKey($phoneNumber, $type);
        if (!Redis::exists($attemptsKey)) {
            Redis::setex($attemptsKey, self::OTP_EXPIRATION, 0);
        }

        // Send OTP via WhatsApp using n8n webhook
        $sent = $this->sendViaWhatsApp($phoneNumber, $otp, $type);

        if (!$sent && config('app.debug')) {
            Log::info('OTP for development (WhatsApp failed)', [
                'phone' => $phoneNumber,
                'otp' => $otp,
                'type' => $type
            ]);
        }

        return [
            'success' => true,
            'expires_in' => self::OTP_EXPIRATION,
            'message' => 'Code OTP envoyé sur WhatsApp',
            'channel' => 'whatsapp',
            // Only include OTP in development mode
            'otp' => config('app.debug') ? $otp : null,
        ];
    }

    /**
     * Send OTP via WhatsApp using direct WAHA API
     *
     * @param string $phoneNumber
     * @param string $otp
     * @param string $type
     * @return bool
     */
    protected function sendViaWhatsApp(string $phoneNumber, string $otp, string $type = 'verification'): bool
    {
        $cleanPhone = $this->cleanPhoneNumber($phoneNumber);
        return $this->sendDirectWaha($cleanPhone, $otp, $type);
    }

    /**
     * Clean and normalize phone number for international use
     * Supports Guinea (+224) and diaspora numbers
     *
     * @param string $phoneNumber
     * @return string
     */
    protected function cleanPhoneNumber(string $phoneNumber): string
    {
        // Remove all non-numeric characters
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);

        // Remove leading 00 (international prefix)
        if (str_starts_with($cleanPhone, '00')) {
            $cleanPhone = substr($cleanPhone, 2);
        }

        // Only add 224 for local Guinea numbers (9 digits starting with 6 or 7)
        if (strlen($cleanPhone) === 9 && in_array($cleanPhone[0], ['6', '7'])) {
            $cleanPhone = '224' . $cleanPhone;
        }

        return $cleanPhone;
    }

    /**
     * Send OTP directly via WAHA API
     *
     * @param string $phoneNumber
     * @param string $otp
     * @param string $type
     * @return bool
     */
    protected function sendDirectWaha(string $phoneNumber, string $otp, string $type = 'verification'): bool
    {
        try {
            $wahaUrl = config('services.waha.url', 'http://waha:3000');
            // Use SecretHelper for Docker secrets support
            $wahaApiKey = SecretHelper::get('WAHA_API_KEY');

            Log::info('Sending OTP via WAHA', [
                'phone' => $phoneNumber,
                'waha_url' => $wahaUrl,
                'has_api_key' => !empty($wahaApiKey),
                'type' => $type,
            ]);

            // Build message based on type
            if ($type === 'password_reset') {
                $message = "🏠 *ImmoGuinée*\n\n";
                $message .= "Vous avez demandé la réinitialisation de votre mot de passe.\n\n";
                $message .= "Votre code de réinitialisation est:\n\n";
                $message .= "🔐 *{$otp}*\n\n";
                $message .= "⏱️ Ce code expire dans 5 minutes.\n\n";
                $message .= "_Si vous n'avez pas demandé cette réinitialisation, ignorez ce message._";
            } else {
                $message = "🏠 *ImmoGuinée*\n\n";
                $message .= "Votre code de vérification est:\n\n";
                $message .= "🔐 *{$otp}*\n\n";
                $message .= "⏱️ Ce code expire dans 5 minutes.\n\n";
                $message .= "_Ne partagez jamais ce code avec quelqu'un d'autre._";
            }

            $response = Http::timeout(15)
                ->withHeaders(['X-Api-Key' => $wahaApiKey])
                ->post("{$wahaUrl}/api/sendText", [
                    'chatId' => "{$phoneNumber}@c.us",
                    'text' => $message,
                    'session' => 'default',
                ]);

            if ($response->successful()) {
                Log::info('OTP sent successfully via WAHA', [
                    'phone' => $phoneNumber,
                    'status' => $response->status(),
                    'type' => $type,
                ]);
                return true;
            }

            Log::error('WAHA API returned error', [
                'phone' => $phoneNumber,
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return false;

        } catch (Exception $e) {
            Log::error('WAHA send failed with exception', [
                'phone' => $phoneNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Verify OTP for phone number
     *
     * @param string $phoneNumber
     * @param string $otp
     * @param string $type Type of OTP (default: 'verification', can be 'password_reset')
     * @return array
     */
    public function verify(string $phoneNumber, string $otp, string $type = 'verification'): array
    {
        // Check if phone number is blocked
        if ($this->isBlocked($phoneNumber, $type)) {
            return [
                'valid' => false,
                'message' => 'Trop de tentatives. Veuillez réessayer dans 30 minutes.',
            ];
        }

        // Get stored OTP
        $key = $this->getOtpKey($phoneNumber, $type);
        $storedOtp = Redis::get($key);

        if (!$storedOtp) {
            return [
                'valid' => false,
                'message' => 'Code expiré ou introuvable. Veuillez demander un nouveau code.',
            ];
        }

        // Verify OTP
        if ($storedOtp !== $otp) {
            // Increment attempts counter
            $this->incrementAttempts($phoneNumber, $type);
            $remaining = self::MAX_ATTEMPTS - (int) Redis::get($this->getAttemptsKey($phoneNumber, $type));

            return [
                'valid' => false,
                'message' => "Code incorrect. {$remaining} tentative(s) restante(s).",
            ];
        }

        // OTP is valid - clear it and attempts
        Redis::del($key);
        Redis::del($this->getAttemptsKey($phoneNumber, $type));
        Redis::del($this->getBlockKey($phoneNumber, $type));

        return [
            'valid' => true,
            'message' => 'Code vérifié avec succès.',
        ];
    }

    /**
     * Check if phone number is blocked
     *
     * @param string $phoneNumber
     * @param string $type
     * @return bool
     */
    protected function isBlocked(string $phoneNumber, string $type = 'verification'): bool
    {
        $blockKey = $this->getBlockKey($phoneNumber, $type);
        return Redis::exists($blockKey);
    }

    /**
     * Increment failed attempts and block if needed
     *
     * @param string $phoneNumber
     * @param string $type
     * @return void
     */
    protected function incrementAttempts(string $phoneNumber, string $type = 'verification'): void
    {
        $attemptsKey = $this->getAttemptsKey($phoneNumber, $type);
        $attempts = (int) Redis::get($attemptsKey);
        $attempts++;

        if ($attempts >= self::MAX_ATTEMPTS) {
            // Block the phone number
            $blockKey = $this->getBlockKey($phoneNumber, $type);
            Redis::setex($blockKey, self::BLOCK_DURATION, 1);

            // Clear attempts counter
            Redis::del($attemptsKey);

            Log::warning('Phone number blocked due to too many OTP attempts', [
                'phone' => $phoneNumber,
                'attempts' => $attempts,
                'type' => $type
            ]);
        } else {
            // Update attempts counter
            Redis::setex($attemptsKey, self::OTP_EXPIRATION, $attempts);
        }
    }

    /**
     * Get Redis key for OTP storage
     *
     * @param string $phoneNumber
     * @param string $type
     * @return string
     */
    protected function getOtpKey(string $phoneNumber, string $type = 'verification'): string
    {
        return "otp:{$type}:{$phoneNumber}";
    }

    /**
     * Get Redis key for attempts counter
     *
     * @param string $phoneNumber
     * @param string $type
     * @return string
     */
    protected function getAttemptsKey(string $phoneNumber, string $type = 'verification'): string
    {
        return "otp_attempts:{$type}:{$phoneNumber}";
    }

    /**
     * Get Redis key for block status
     *
     * @param string $phoneNumber
     * @param string $type
     * @return string
     */
    protected function getBlockKey(string $phoneNumber, string $type = 'verification'): string
    {
        return "otp_blocked:{$type}:{$phoneNumber}";
    }

    /**
     * Clear OTP for phone number (for testing)
     *
     * @param string $phoneNumber
     * @param string $type
     * @return void
     */
    public function clear(string $phoneNumber, string $type = 'verification'): void
    {
        Redis::del($this->getOtpKey($phoneNumber, $type));
        Redis::del($this->getAttemptsKey($phoneNumber, $type));
        Redis::del($this->getBlockKey($phoneNumber, $type));
    }
}
