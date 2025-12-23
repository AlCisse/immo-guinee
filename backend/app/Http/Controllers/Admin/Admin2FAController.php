<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use PragmaRX\Google2FA\Google2FA;

class Admin2FAController extends Controller
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Get 2FA status for the authenticated admin
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'two_factor_enabled' => !empty($user->two_factor_secret),
                'two_factor_confirmed' => !empty($user->two_factor_confirmed_at),
            ],
        ]);
    }

    /**
     * Generate a new 2FA secret and QR code
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        // Generate new secret
        $secret = $this->google2fa->generateSecretKey(32);

        // Store temporarily (not confirmed yet)
        $user->two_factor_secret = encrypt($secret);
        $user->two_factor_confirmed_at = null;
        $user->save();

        // Generate QR code URL
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name', 'ImmoGuinee'),
            $user->email ?? $user->telephone,
            $secret
        );

        // Generate recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
        $user->save();

        Log::channel('security')->info('2FA setup initiated', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'secret' => $secret,
                'qr_code_url' => $qrCodeUrl,
                'recovery_codes' => $recoveryCodes,
            ],
            'message' => 'Scannez le QR code avec Google Authenticator puis confirmez avec un code.',
        ]);
    }

    /**
     * Confirm 2FA setup with a valid code
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (empty($user->two_factor_secret)) {
            return response()->json([
                'success' => false,
                'message' => 'Veuillez d\'abord configurer le 2FA.',
            ], 400);
        }

        $secret = decrypt($user->two_factor_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            Log::channel('security')->warning('2FA confirmation failed', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Code invalide. Veuillez reessayer.',
            ], 422);
        }

        $user->two_factor_confirmed_at = now();
        $user->save();

        Log::channel('security')->info('2FA confirmed successfully', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Authentification a deux facteurs activee avec succes.',
        ]);
    }

    /**
     * Verify 2FA code during login
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();

        if (empty($user->two_factor_secret) || empty($user->two_factor_confirmed_at)) {
            return response()->json([
                'success' => false,
                'message' => '2FA non configure pour ce compte.',
            ], 400);
        }

        // Check for rate limiting
        $rateLimitKey = "2fa_attempts:{$user->id}";
        $attempts = Cache::get($rateLimitKey, 0);

        if ($attempts >= 5) {
            Log::channel('security')->warning('2FA rate limit exceeded', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Veuillez attendre 15 minutes.',
            ], 429);
        }

        $code = $request->code;

        // Check if it's a recovery code
        if (strlen($code) > 6) {
            return $this->verifyRecoveryCode($request, $user, $code);
        }

        // Verify TOTP code
        $secret = decrypt($user->two_factor_secret);
        $valid = $this->google2fa->verifyKey($secret, $code, 2); // Window of 2 (60 seconds tolerance)

        if (!$valid) {
            Cache::put($rateLimitKey, $attempts + 1, now()->addMinutes(15));

            Log::channel('security')->warning('2FA verification failed', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
                'attempts' => $attempts + 1,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Code invalide.',
            ], 422);
        }

        // Clear rate limiting on success
        Cache::forget($rateLimitKey);

        // Set 2FA verified in session/cache
        $sessionKey = "2fa_verified:{$user->id}";
        Cache::put($sessionKey, true, now()->addHours(8));

        Log::channel('security')->info('2FA verification successful', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Verification reussie.',
        ]);
    }

    /**
     * Verify recovery code
     */
    protected function verifyRecoveryCode(Request $request, $user, string $code): JsonResponse
    {
        if (empty($user->two_factor_recovery_codes)) {
            return response()->json([
                'success' => false,
                'message' => 'Pas de codes de recuperation disponibles.',
            ], 400);
        }

        $recoveryCodes = json_decode(decrypt($user->two_factor_recovery_codes), true);
        $codeIndex = array_search($code, $recoveryCodes);

        if ($codeIndex === false) {
            Log::channel('security')->warning('Invalid recovery code attempt', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Code de recuperation invalide.',
            ], 422);
        }

        // Remove used recovery code
        unset($recoveryCodes[$codeIndex]);
        $user->two_factor_recovery_codes = encrypt(json_encode(array_values($recoveryCodes)));
        $user->save();

        // Set 2FA verified
        $sessionKey = "2fa_verified:{$user->id}";
        Cache::put($sessionKey, true, now()->addHours(8));

        Log::channel('security')->info('Recovery code used', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
            'remaining_codes' => count($recoveryCodes),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Code de recuperation accepte. Il reste ' . count($recoveryCodes) . ' codes.',
        ]);
    }

    /**
     * Disable 2FA (requires password confirmation)
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        // Verify password
        if (!Hash::check($request->password, $user->mot_de_passe)) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe incorrect.',
            ], 422);
        }

        // Verify 2FA code
        if (!empty($user->two_factor_secret)) {
            $secret = decrypt($user->two_factor_secret);
            $valid = $this->google2fa->verifyKey($secret, $request->code);

            if (!$valid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Code 2FA invalide.',
                ], 422);
            }
        }

        // Disable 2FA
        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->save();

        // Clear verification cache
        Cache::forget("2fa_verified:{$user->id}");

        Log::channel('security')->warning('2FA disabled', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '2FA desactive avec succes.',
        ]);
    }

    /**
     * Regenerate recovery codes
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (empty($user->two_factor_secret)) {
            return response()->json([
                'success' => false,
                'message' => '2FA non configure.',
            ], 400);
        }

        // Verify 2FA code
        $secret = decrypt($user->two_factor_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            return response()->json([
                'success' => false,
                'message' => 'Code invalide.',
            ], 422);
        }

        // Generate new recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
        $user->save();

        Log::channel('security')->info('Recovery codes regenerated', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'recovery_codes' => $recoveryCodes,
            ],
            'message' => 'Nouveaux codes de recuperation generes.',
        ]);
    }

    /**
     * Generate random recovery codes
     */
    protected function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
        }
        return $codes;
    }
}
