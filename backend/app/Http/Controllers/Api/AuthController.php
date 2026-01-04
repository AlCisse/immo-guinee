<?php

namespace App\Http\Controllers\Api;

use App\Actions\Auth\LoginResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Listing;
use App\Models\User;
use App\Services\OtpService;
use App\Services\RoleRedirectService;
use App\Notifications\WelcomeNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class AuthController extends Controller
{
    protected OtpService $otpService;
    protected LoginResponse $loginResponse;
    protected RoleRedirectService $roleRedirectService;

    public function __construct(
        OtpService $otpService,
        LoginResponse $loginResponse,
        RoleRedirectService $roleRedirectService
    ) {
        $this->otpService = $otpService;
        $this->loginResponse = $loginResponse;
        $this->roleRedirectService = $roleRedirectService;
    }

    /**
     * Register a new user and send OTP
     *
     * @param RegisterRequest $request
     * @return JsonResponse
     */
    /**
     * Normalize phone number to consistent international format
     * Supports Guinea (+224) and international numbers (diaspora)
     */
    private function normalizePhone(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Remove leading + if somehow still there
        $phone = ltrim($phone, '+');

        // Remove leading 00 (international prefix)
        if (str_starts_with($phone, '00')) {
            $phone = substr($phone, 2);
        }

        // Only add 224 for local Guinea numbers (9 digits starting with 6 or 7)
        // International numbers already include their country code
        if (strlen($phone) === 9 && in_array($phone[0], ['6', '7'])) {
            // Local Guinea format without country code
            $phone = '224' . $phone;
        }

        // For all other cases, the number already has a country code
        // Examples: 4915209483488 (Germany), 33612345678 (France), 224621000000 (Guinea)

        return $phone;
    }

    /**
     * Find user by phone with multiple format matching
     * Includes soft-deleted users to handle re-registration scenarios
     */
    private function findUserByPhone(string $phone, bool $includeTrashed = true): ?User
    {
        $normalized = $this->normalizePhone($phone);

        // Build list of possible phone formats to search
        $phonesToSearch = array_unique(array_filter([
            $normalized,
            $phone,
            // With + prefix
            '+' . $normalized,
            // Without any prefix cleaning
            preg_replace('/[^0-9]/', '', $phone),
        ]));

        // Build the base query - include trashed users for registration checks
        $query = $includeTrashed ? User::withTrashed() : User::query();

        // Try all formats
        $user = $query->whereIn('telephone', $phonesToSearch)->first();
        if ($user) {
            return $user;
        }

        // Reset query for next search
        $query = $includeTrashed ? User::withTrashed() : User::query();

        // Try without country code (local format) for Guinea numbers
        if (str_starts_with($normalized, '224')) {
            $localPhone = substr($normalized, 3);
            $user = $query->where('telephone', $localPhone)->first();
            if ($user) {
                return $user;
            }
        }

        // Reset query for next search
        $query = $includeTrashed ? User::withTrashed() : User::query();

        // Try LIKE search as last resort for partial matches
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($cleanPhone) >= 9) {
            // Search for phones ending with the last 9 digits
            $lastDigits = substr($cleanPhone, -9);
            $user = $query->where('telephone', 'LIKE', '%' . $lastDigits)->first();
            if ($user) {
                return $user;
            }
        }

        return null;
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            // Normalize phone number for consistent storage
            $normalizedPhone = $this->normalizePhone($request->telephone);

            Log::info('Registration attempt', [
                'input_phone' => $request->telephone,
                'normalized_phone' => $normalizedPhone,
            ]);

            // Check if user already exists by phone (with multiple format matching)
            $existingUser = $this->findUserByPhone($request->telephone);

            Log::info('User lookup result', [
                'existing_user_found' => $existingUser ? true : false,
                'existing_user_id' => $existingUser?->id,
                'existing_user_phone' => $existingUser?->telephone,
            ]);

            // Also check by email if provided
            if (!$existingUser && $request->email) {
                $existingUser = User::where('email', $request->email)->first();
            }

            if ($existingUser) {
                // Check if user was soft-deleted - restore and allow re-registration
                if ($existingUser->trashed()) {
                    Log::info('Restoring soft-deleted user for re-registration', [
                        'user_id' => $existingUser->id,
                        'telephone' => $existingUser->telephone,
                    ]);

                    // Restore the user
                    $existingUser->restore();

                    // Update user data with new registration info
                    $existingUser->update([
                        'nom_complet' => $request->nom_complet,
                        'email' => $request->email,
                        'mot_de_passe' => Hash::make($request->mot_de_passe),
                        'type_compte' => $request->type_compte ?? 'PARTICULIER',
                        'nom_entreprise' => $request->nom_entreprise,
                        'numero_registre_commerce' => $request->numero_registre_commerce,
                        'adresse' => $request->adresse,
                        'telephone_verified_at' => null, // Reset verification
                        'is_active' => false, // Reset to inactive until OTP verified
                        // CGU re-acceptance on re-registration
                        'cgu_accepted_at' => now(),
                        'cgu_version' => '1.0',
                        'cgu_accepted_ip' => $request->ip(),
                    ]);

                    // Generate and send OTP
                    $otpResult = $this->otpService->generate($existingUser->telephone);

                    $responseData = [
                        'action' => 'verify_otp',
                        'user' => [
                            'id' => $existingUser->id,
                            'nom_complet' => $existingUser->nom_complet,
                            'telephone' => $existingUser->telephone,
                            'type_compte' => $existingUser->type_compte,
                        ],
                        'otp_sent' => $otpResult['success'],
                        'expires_in' => 300,
                    ];

                    return response()->json([
                        'success' => true,
                        'message' => 'Compte restauré. Un code OTP a été envoyé à votre téléphone.',
                        'data' => $responseData,
                    ], 200);
                }

                // User exists and is not soft-deleted - check if phone is verified
                if ($existingUser->telephone_verified_at) {
                    // Already verified - redirect to login
                    return response()->json([
                        'success' => false,
                        'message' => 'Ce compte existe déjà. Veuillez vous connecter.',
                        'data' => [
                            'action' => 'redirect_login',
                            'telephone' => $existingUser->telephone,
                        ],
                    ], 409); // 409 Conflict
                } else {
                    // Not verified - resend OTP
                    $otpResult = $this->otpService->generate($existingUser->telephone);

                    Log::info('OTP resent for unverified user', [
                        'user_id' => $existingUser->id,
                        'telephone' => $existingUser->telephone,
                    ]);

                    $unverifiedData = [
                        'action' => 'verify_otp',
                        'user' => [
                            'id' => $existingUser->id,
                            'nom_complet' => $existingUser->nom_complet,
                            'telephone' => $existingUser->telephone,
                            'type_compte' => $existingUser->type_compte,
                        ],
                        'otp_sent' => $otpResult['success'],
                        'expires_in' => 300,
                    ];

                    return response()->json([
                        'success' => true,
                        'message' => 'Compte non vérifié. Un nouveau code OTP a été envoyé.',
                        'data' => $unverifiedData,
                    ], 200);
                }
            }

            // Create new user with normalized phone
            // User is inactive until phone is verified via OTP
            $user = User::create([
                'nom_complet' => $request->nom_complet,
                'telephone' => $normalizedPhone,
                'email' => $request->email,
                'mot_de_passe' => Hash::make($request->mot_de_passe),
                'type_compte' => $request->type_compte ?? 'PARTICULIER',
                'nom_entreprise' => $request->nom_entreprise,
                'numero_registre_commerce' => $request->numero_registre_commerce,
                'adresse' => $request->adresse,
                'badge' => 'BRONZE',
                'is_active' => false, // Inactive until OTP verified
                // CGU acceptance tracking
                'cgu_accepted_at' => now(),
                'cgu_version' => '1.0',
                'cgu_accepted_ip' => $request->ip(),
            ]);

            // Generate and send OTP
            $otpResult = $this->otpService->generate($user->telephone);

            Log::info('User registered', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'type_compte' => $user->type_compte,
            ]);

            $responseData = [
                'action' => 'verify_otp',
                'user' => [
                    'id' => $user->id,
                    'nom_complet' => $user->nom_complet,
                    'telephone' => $user->telephone,
                    'type_compte' => $user->type_compte,
                ],
                'otp_sent' => $otpResult['success'],
                'expires_in' => 300, // 5 minutes
            ];

            return response()->json([
                'success' => true,
                'message' => 'Inscription réussie. Un code OTP a été envoyé à votre téléphone.',
                'data' => $responseData,
            ], 201);

        } catch (Exception $e) {
            Log::error('Registration failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            // Check for unique constraint violations
            $errorMessage = $e->getMessage();

            if (str_contains($errorMessage, 'users_email_unique') || str_contains($errorMessage, 'email')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet email est déjà utilisé par un autre compte.',
                    'errors' => ['email' => ['Cet email est déjà utilisé.']],
                ], 422);
            }

            if (str_contains($errorMessage, 'users_telephone_unique') || str_contains($errorMessage, 'telephone')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce numéro de téléphone est déjà utilisé par un autre compte.',
                    'errors' => ['telephone' => ['Ce numéro est déjà utilisé.']],
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'inscription',
            ], 500);
        }
    }

    /**
     * Verify OTP code
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'telephone' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        try {
            $user = User::where('telephone', $request->telephone)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                ], 404);
            }

            // Verify OTP
            $result = $this->otpService->verify($request->telephone, $request->code);

            if (!$result['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 422);
            }

            // Mark phone as verified and activate user
            $user->update([
                'telephone_verified_at' => now(),
                'is_active' => true, // Activate user after OTP verification
            ]);

            // Refresh user to verify update worked
            $user->refresh();

            // Safeguard: ensure is_active is true (in case update partially failed)
            if (!$user->is_active) {
                Log::warning('User is_active not set after OTP verification, forcing update', [
                    'user_id' => $user->id,
                    'telephone' => $user->telephone,
                ]);
                $user->is_active = true;
                $user->save();
            }

            // Auto-publish all BROUILLON listings from this user
            $publishedCount = Listing::where('user_id', $user->id)
                ->where('statut', 'BROUILLON')
                ->update([
                    'statut' => 'ACTIVE',
                    'publie_at' => now(),
                ]);

            if ($publishedCount > 0) {
                Log::info('Auto-published draft listings after phone verification', [
                    'user_id' => $user->id,
                    'count' => $publishedCount,
                ]);
            }

            // Assign default role based on account type if no roles
            if ($user->roles->isEmpty()) {
                $roleMapping = [
                    'PARTICULIER' => 'particulier',
                    'PROPRIETAIRE' => 'proprietaire',
                    'AGENT' => 'proprietaire',
                    'AGENCE' => 'agence',
                ];
                $role = $roleMapping[$user->type_compte] ?? 'particulier';
                $user->assignRole($role);
            }

            // Create access token
            $token = $user->createToken('auth_token')->accessToken;

            // Send welcome notification
            $user->notify(new WelcomeNotification());

            Log::info('OTP verified successfully', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'roles' => $user->getRoleNames()->toArray(),
            ]);

            // Use LoginResponse for consistent redirect handling
            return $this->loginResponse->afterOtpVerification($user, $token);

        } catch (Exception $e) {
            Log::error('OTP verification failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la vérification',
            ], 500);
        }
    }

    /**
     * Resend OTP code
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'telephone' => 'required|string',
        ]);

        try {
            $user = User::where('telephone', $request->telephone)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                ], 404);
            }

            // Generate and send new OTP
            $otpResult = $this->otpService->generate($user->telephone);

            if (!$otpResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $otpResult['message'],
                ], 429);
            }

            return response()->json([
                'success' => true,
                'message' => 'Un nouveau code OTP a été envoyé',
                'data' => [
                    'expires_in' => 300,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('OTP resend failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Login user with phone and password
     *
     * @param LoginRequest $request
     * @return JsonResponse
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            // Find user with multiple phone format matching (exclude soft-deleted users)
            $user = $this->findUserByPhone($request->telephone, false);

            if (!$user || !Hash::check($request->mot_de_passe, $user->mot_de_passe)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifiants incorrects',
                ], 401);
            }

            // Check if user is suspended
            if ($user->is_suspended) {
                return response()->json([
                    'success' => false,
                    'message' => 'Votre compte a été suspendu. Veuillez contacter le support.',
                ], 403);
            }

            // IMPORTANT: Check phone verification BEFORE is_active
            // This allows unverified users to be redirected to OTP verification
            // instead of being blocked by the is_active check
            if (!$user->telephone_verified_at) {
                // Generate and send OTP
                $otpResult = $this->otpService->generate($user->telephone);

                Log::info('Login attempt with unverified phone, OTP sent', [
                    'user_id' => $user->id,
                    'telephone' => $user->telephone,
                ]);

                $responseData = [
                    'action' => 'verify_otp',
                    'user' => [
                        'id' => $user->id,
                        'nom_complet' => $user->nom_complet,
                        'telephone' => $user->telephone,
                        'type_compte' => $user->type_compte,
                    ],
                    'otp_sent' => $otpResult['success'],
                    'expires_in' => 300,
                ];

                return response()->json([
                    'success' => true,
                    'message' => 'Votre numéro n\'est pas vérifié. Un code OTP a été envoyé sur WhatsApp.',
                    'data' => $responseData,
                ], 200);
            }

            // Check if user is active (only for verified users)
            // Unverified users are handled above with OTP redirect
            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Votre compte n\'est pas actif. Veuillez contacter le support.',
                ], 403);
            }

            // Create access token
            $token = $user->createToken('auth_token')->accessToken;

            Log::info('User logged in', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'roles' => $user->getRoleNames()->toArray(),
                'redirect_url' => $this->roleRedirectService->getDashboardUrl($user),
            ]);

            // Use LoginResponse for consistent redirect handling
            return $this->loginResponse->toResponse($user, $token);

        } catch (Exception $e) {
            Log::error('Login failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la connexion',
            ], 500);
        }
    }

    /**
     * Logout user (revoke token)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $request->user()->token()->revoke();

            Log::info('User logged out', [
                'user_id' => $request->user()->id,
            ]);

            return $this->loginResponse->logoutResponse();

        } catch (Exception $e) {
            Log::error('Logout failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Get authenticated user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $redirectData = $this->roleRedirectService->buildLoginResponseData($user);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nom_complet' => $user->nom_complet,
                    'telephone' => $user->telephone,
                    'email' => $user->email,
                    'type_compte' => $user->type_compte,
                    'nom_entreprise' => $user->nom_entreprise,
                    'badge' => $user->badge,
                    'adresse' => $user->adresse,
                    'telephone_verified_at' => $user->telephone_verified_at,
                    'email_verified_at' => $user->email_verified_at,
                    'statut_verification' => $user->statut_verification,
                    'notification_preferences' => $user->notification_preferences,
                    'preferred_language' => $user->preferred_language,
                    'roles' => $user->getRoleNames()->toArray(),
                    'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
                ],
                'redirect' => $redirectData,
            ],
        ]);
    }

    /**
     * Get user counts (notifications, messages, favorites)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            // Count unread notifications (using custom Notification model)
            $unreadNotifications = \App\Models\Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            // Count unread messages (from conversations where user is initiator or participant)
            $unreadMessages = 0;
            if (class_exists(\App\Models\Conversation::class) && class_exists(\App\Models\Message::class)) {
                $unreadMessages = \App\Models\Message::whereHas('conversation', function ($query) use ($user) {
                    $query->where('initiator_id', $user->id)
                          ->orWhere('participant_id', $user->id);
                })
                ->where('sender_id', '!=', $user->id)
                ->where('is_read', false)
                ->count();
            }

            // Count favorites
            $favoritesCount = $user->favorites()->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'unread_notifications' => (int) $unreadNotifications,
                    'unread_messages' => (int) $unreadMessages,
                    'favorites_count' => (int) $favoritesCount,
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get user counts', [
                'error' => $e->getMessage(),
                'user_id' => $user->id ?? 'unknown',
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'unread_notifications' => 0,
                    'unread_messages' => 0,
                    'favorites_count' => 0,
                ],
            ]);
        }
    }

    /**
     * Request password reset (forgot password)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'telephone' => 'required|string',
        ]);

        try {
            // Find user by phone (exclude soft-deleted)
            $user = $this->findUserByPhone($request->telephone, false);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun compte associé à ce numéro de téléphone',
                ], 404);
            }

            // Generate and send OTP for password reset
            $otpResult = $this->otpService->generate($user->telephone, 'password_reset');

            Log::info('Password reset OTP sent', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
            ]);

            $responseData = [
                'telephone' => $user->telephone,
                'otp_sent' => $otpResult['success'],
                'expires_in' => 300,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Un code de réinitialisation a été envoyé sur WhatsApp',
                'data' => $responseData,
            ]);

        } catch (Exception $e) {
            Log::error('Forgot password failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Reset password with OTP verification
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'telephone' => 'required|string',
            'code' => 'required|string|size:6',
            'mot_de_passe' => 'required|string|min:8',
            'mot_de_passe_confirmation' => 'required|string|same:mot_de_passe',
        ]);

        try {
            // Find user by phone (exclude soft-deleted)
            $user = $this->findUserByPhone($request->telephone, false);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                ], 404);
            }

            // Verify OTP
            $result = $this->otpService->verify($request->telephone, $request->code, 'password_reset');

            if (!$result['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 422);
            }

            // Update password
            $user->update([
                'mot_de_passe' => Hash::make($request->mot_de_passe),
            ]);

            // SECURITY: Revoke all existing tokens to prevent stolen tokens from being used
            $user->tokens()->delete();

            Log::info('Password reset successful', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'tokens_revoked' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.',
            ]);

        } catch (Exception $e) {
            Log::error('Reset password failed', [
                'error' => $e->getMessage(),
                'telephone' => $request->telephone,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Update user profile
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'nom_complet' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $request->user()->id,
            'nom_entreprise' => 'sometimes|nullable|string|max:255',
            'adresse' => 'sometimes|nullable|string',
            'notification_preferences' => 'sometimes|array',
            'preferred_language' => 'sometimes|in:fr,en',
        ]);

        try {
            $request->user()->update($request->only([
                'nom_complet',
                'email',
                'nom_entreprise',
                'adresse',
                'notification_preferences',
                'preferred_language',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Profil mis à jour avec succès',
                'data' => [
                    'user' => $request->user(),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Profile update failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Upload profile photo
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
        ]);

        try {
            $user = $request->user();
            $file = $request->file('photo');

            // Generate unique filename
            $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();

            // Delete old photo if exists
            if ($user->photo_profil) {
                $storageService = app(\App\Services\StorageService::class);
                $storageService->delete('avatars', $user->photo_profil);
            }

            // Upload new photo using StorageService
            $storageService = app(\App\Services\StorageService::class);
            $storageService->put('avatars', $filename, file_get_contents($file->getRealPath()), 'public');

            // Update user
            $user->update(['photo_profil' => $filename]);

            Log::info('Profile photo uploaded', [
                'user_id' => $user->id,
                'filename' => $filename,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Photo de profil mise à jour avec succès',
                'data' => [
                    'photo_profil_url' => $user->fresh()->photo_profil_url,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Profile photo upload failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'upload',
            ], 500);
        }
    }

    /**
     * Delete profile photo
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function deleteProfilePhoto(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if ($user->photo_profil) {
                // Delete from storage
                $storageService = app(\App\Services\StorageService::class);
                $storageService->delete('avatars', $user->photo_profil);

                // Update user
                $user->update(['photo_profil' => null]);

                Log::info('Profile photo deleted', [
                    'user_id' => $user->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Photo de profil supprimée',
            ]);

        } catch (Exception $e) {
            Log::error('Profile photo delete failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Register a push notification token for the authenticated user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function registerPushToken(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'platform' => 'required|in:ios,android',
        ]);

        try {
            $user = $request->user();
            $user->registerPushToken($request->token, $request->platform);

            Log::info('Push token registered', [
                'user_id' => $user->id,
                'platform' => $request->platform,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Token enregistré avec succès',
            ]);

        } catch (Exception $e) {
            Log::error('Push token registration failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? 'unknown',
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Remove a push notification token
     *
     * @param Request $request
     * @param string $token
     * @return JsonResponse
     */
    public function removePushToken(Request $request, string $token): JsonResponse
    {
        try {
            $user = $request->user();
            $tokens = $user->push_tokens ?? [];

            // Remove token from all platforms
            foreach ($tokens as $platform => $storedToken) {
                if ($storedToken === $token) {
                    $user->removePushToken($platform);
                }
            }

            Log::info('Push token removed', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Token supprimé avec succès',
            ]);

        } catch (Exception $e) {
            Log::error('Push token removal failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? 'unknown',
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }

    /**
     * Update user online status
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateOnlineStatus(Request $request): JsonResponse
    {
        $request->validate([
            'is_online' => 'required|boolean',
        ]);

        try {
            $user = $request->user();

            if ($request->is_online) {
                $user->setOnline();
            } else {
                $user->setOffline();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'is_online' => $user->is_online,
                    'last_seen_at' => $user->last_seen_at?->toIso8601String(),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Online status update failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id ?? 'unknown',
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue',
            ], 500);
        }
    }
}
