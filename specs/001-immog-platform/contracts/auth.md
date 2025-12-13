# API Contract: Authentication & User Management (Laravel)

**Domain**: Authentication, User Registration, OTP Verification
**Base URL**: `/api/auth`
**Version**: 1.0
**Last Updated**: 2025-01-28
**Backend**: Laravel 11 + Sanctum

---

## Overview

This contract defines all authentication-related endpoints including phone number registration with OTP SMS verification (FR-001), login, password reset, and user profile management.

**Key Requirements**:
- FR-001: Phone number registration with OTP SMS (6-digit code, 5-min validity)
- FR-002: Auto-assign Bronze badge on registration
- FR-003: Authentication with phone + password
- FR-004: Password reset via OTP SMS only
- FR-005: Manage notification preferences (4 channels)

**Authentication Method**: Laravel Sanctum (SPA authentication via cookies + API tokens for mobile)

---

## Laravel Routes Definition

```php
// routes/api.php
use App\Http\Controllers\Api\AuthController;

Route::prefix('auth')->group(function () {
    // Public routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/password-reset/request', [AuthController::class, 'requestPasswordReset']);
    Route::post('/password-reset/confirm', [AuthController::class, 'confirmPasswordReset']);

    // Protected routes (require Sanctum authentication)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/me', [AuthController::class, 'updateProfile']);
        Route::patch('/me/preferences', [AuthController::class, 'updatePreferences']);
    });
});
```

---

## Endpoints

### 1. Register User (Phone + OTP)

**Endpoint**: `POST /api/auth/register`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@register`

**Description**: Initiates user registration by validating phone number and sending OTP SMS.

**Request Body**:
```json
{
  "telephone": "+224622123456",
  "nom_complet": "Mamadou Diallo",
  "email": "mamadou@example.com",
  "mot_de_passe": "SecurePass123!",
  "type_compte": "PARTICULIER"
}
```

**Laravel Validation Rules** (Form Request: `RegisterRequest`):
```php
// app/Http/Requests/Auth/RegisterRequest.php
public function rules(): array
{
    return [
        'telephone' => ['required', 'regex:/^\+224\s?6[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/', 'unique:users,telephone'],
        'nom_complet' => ['required', 'string', 'min:3', 'max:255'],
        'email' => ['nullable', 'email', 'max:255'],
        'mot_de_passe' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[@$!%*?&]/'],
        'type_compte' => ['required', 'in:PARTICULIER,AGENCE,DIASPORA'],
    ];
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP envoyé à +224 622 123 456",
  "data": {
    "user_id": "uuid-v4",
    "telephone": "+224622123456",
    "otp_expires_at": "2025-01-28T14:35:00Z",
    "session_token": "temp-session-token"
  }
}
```

**Laravel Controller Implementation**:
```php
// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Notifications\OtpNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        // Create user with Bronze badge (FR-002)
        $user = User::create([
            'telephone' => $request->telephone,
            'nom_complet' => $request->nom_complet,
            'email' => $request->email,
            'mot_de_passe_hash' => bcrypt($request->mot_de_passe),
            'type_compte' => $request->type_compte,
            'badge_certification' => 'BRONZE',
            'statut_compte' => 'ACTIF',
        ]);

        // Generate 6-digit OTP
        $otp = rand(100000, 999999);
        $sessionToken = Str::random(64);

        // Store OTP in Redis with 5-minute TTL
        Cache::put("otp:{$user->telephone}:register", [
            'code' => $otp,
            'session_token' => $sessionToken,
            'attempts' => 0,
        ], now()->addMinutes(5));

        // Send OTP SMS via Twilio
        $user->notify(new OtpNotification($otp));

        // Trigger n8n workflow (optional)
        // event(new UserRegisteredEvent($user));

        return response()->json([
            'success' => true,
            'message' => "OTP envoyé à {$user->telephone}",
            'data' => [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'otp_expires_at' => now()->addMinutes(5)->toIso8601String(),
                'session_token' => $sessionToken,
            ],
        ]);
    }
}
```

**Errors**:
- `400 Bad Request`: Invalid phone format, weak password, missing fields
- `409 Conflict`: Phone number already registered
- `429 Too Many Requests`: Rate limit exceeded (10 registrations/hour per IP)
- `500 Internal Server Error`: SMS provider failure

**Side Effects**:
1. Create user record in database with `statut_compte: ACTIF`, `badge_certification: BRONZE`
2. Send OTP SMS via Twilio to `telephone`
3. Store OTP in Redis: `otp:{telephone}:register` with TTL 300s
4. Trigger n8n workflow: `user-registered-welcome-email`

---

### 2. Verify OTP (Registration)

**Endpoint**: `POST /api/auth/otp/verify`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@verifyOtp`

**Description**: Validates OTP code and completes registration.

**Request Body**:
```json
{
  "telephone": "+224622123456",
  "otp_code": "123456",
  "session_token": "temp-session-token"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Inscription réussie. Bienvenue sur ImmoGuinée!",
  "data": {
    "user": {
      "id": "uuid-v4",
      "telephone": "+224622123456",
      "nom_complet": "Mamadou Diallo",
      "email": "mamadou@example.com",
      "type_compte": "PARTICULIER",
      "badge_certification": "BRONZE",
      "note_moyenne": 0,
      "nombre_transactions": 0,
      "preferences_notification": {
        "push": true,
        "sms": true,
        "email": true,
        "whatsapp": false
      },
      "date_inscription": "2025-01-28T14:30:00Z"
    },
    "token": "1|sanctum_token_here"
  }
}
```

**Laravel Controller Implementation**:
```php
public function verifyOtp(Request $request)
{
    $validated = $request->validate([
        'telephone' => 'required|string',
        'otp_code' => 'required|digits:6',
        'session_token' => 'required|string',
    ]);

    $cacheKey = "otp:{$validated['telephone']}:register";
    $otpData = Cache::get($cacheKey);

    if (!$otpData) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'OTP_EXPIRED', 'message' => 'Le code OTP a expiré'],
        ], 401);
    }

    // Check session token
    if ($otpData['session_token'] !== $validated['session_token']) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'INVALID_SESSION', 'message' => 'Session invalide'],
        ], 404);
    }

    // Check max attempts (FR-029: max 3 attempts)
    if ($otpData['attempts'] >= 3) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'OTP_MAX_ATTEMPTS', 'message' => 'Trop de tentatives. Veuillez réessayer dans 5 minutes'],
        ], 403);
    }

    // Verify OTP code
    if ($otpData['code'] != $validated['otp_code']) {
        // Increment attempts
        $otpData['attempts']++;
        Cache::put($cacheKey, $otpData, now()->addMinutes(5));

        return response()->json([
            'success' => false,
            'error' => ['code' => 'INVALID_OTP', 'message' => 'Code OTP invalide'],
        ], 400);
    }

    // OTP verified - Complete registration
    $user = User::where('telephone', $validated['telephone'])->firstOrFail();

    // Delete OTP from cache
    Cache::forget($cacheKey);

    // Create Sanctum token
    $token = $user->createToken('web')->plainTextToken;

    return response()->json([
        'success' => true,
        'message' => 'Inscription réussie. Bienvenue sur ImmoGuinée!',
        'data' => [
            'user' => new UserResource($user),
            'token' => $token,
        ],
    ]);
}
```

**Errors**:
- `400 Bad Request`: Invalid OTP code
- `401 Unauthorized`: OTP expired (>5 minutes)
- `403 Forbidden`: Max 3 attempts exceeded (5-minute lockout - FR-029)
- `404 Not Found`: Session token not found

**Side Effects**:
1. Delete OTP from Redis
2. Create Sanctum token
3. Update user `statut_compte: ACTIF`
4. Log audit event: `USER_REGISTERED`

---

### 3. Login

**Endpoint**: `POST /api/auth/login`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@login`

**Description**: Authenticates user with phone number and password.

**Request Body**:
```json
{
  "telephone": "+224622123456",
  "mot_de_passe": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid-v4",
      "telephone": "+224622123456",
      "nom_complet": "Mamadou Diallo",
      "badge_certification": "OR",
      "photo_profil_url": "https://s3.../profile.jpg"
    },
    "token": "2|sanctum_token_here"
  }
}
```

**Laravel Controller Implementation**:
```php
public function login(Request $request)
{
    $validated = $request->validate([
        'telephone' => 'required|string',
        'mot_de_passe' => 'required|string',
    ]);

    $user = User::where('telephone', $validated['telephone'])->first();

    if (!$user || !Hash::check($validated['mot_de_passe'], $user->mot_de_passe_hash)) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Numéro de téléphone ou mot de passe incorrect'],
        ], 401);
    }

    // Check if account is suspended or banned
    if (in_array($user->statut_compte, ['SUSPENDU', 'BANNI'])) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'ACCOUNT_SUSPENDED', 'message' => 'Votre compte a été suspendu'],
        ], 403);
    }

    // Update last login
    $user->update(['derniere_connexion' => now()]);

    // Create Sanctum token
    $token = $user->createToken('web')->plainTextToken;

    return response()->json([
        'success' => true,
        'message' => 'Connexion réussie',
        'data' => [
            'user' => new UserResource($user),
            'token' => $token,
        ],
    ]);
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account suspended or banned
- `429 Too Many Requests`: Max 5 failed login attempts per hour

**Side Effects**:
1. Update `derniere_connexion` timestamp
2. Create Sanctum token
3. Log audit event: `USER_LOGIN`

---

### 4. Request Password Reset OTP

**Endpoint**: `POST /api/auth/password-reset/request`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@requestPasswordReset`

**Description**: Sends OTP SMS for password reset (FR-004).

**Request Body**:
```json
{
  "telephone": "+224622123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Code de réinitialisation envoyé par SMS",
  "data": {
    "otp_expires_at": "2025-01-28T14:35:00Z",
    "session_token": "temp-session-token"
  }
}
```

**Laravel Controller Implementation**:
```php
public function requestPasswordReset(Request $request)
{
    $validated = $request->validate(['telephone' => 'required|string']);

    $user = User::where('telephone', $validated['telephone'])->first();

    if (!$user) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'USER_NOT_FOUND', 'message' => 'Numéro de téléphone non enregistré'],
        ], 404);
    }

    // Generate OTP
    $otp = rand(100000, 999999);
    $sessionToken = Str::random(64);

    // Store in Redis
    Cache::put("otp:{$user->telephone}:password-reset", [
        'code' => $otp,
        'session_token' => $sessionToken,
    ], now()->addMinutes(5));

    // Send SMS
    $user->notify(new OtpNotification($otp));

    return response()->json([
        'success' => true,
        'message' => 'Code de réinitialisation envoyé par SMS',
        'data' => [
            'otp_expires_at' => now()->addMinutes(5)->toIso8601String(),
            'session_token' => $sessionToken,
        ],
    ]);
}
```

**Errors**:
- `404 Not Found`: Phone number not registered
- `429 Too Many Requests`: Max 3 reset requests per hour

**Side Effects**:
1. Send OTP SMS
2. Store OTP in Redis: `otp:{telephone}:password-reset` with TTL 300s

---

### 5. Reset Password

**Endpoint**: `POST /api/auth/password-reset/confirm`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@confirmPasswordReset`

**Description**: Validates OTP and updates password.

**Request Body**:
```json
{
  "telephone": "+224622123456",
  "otp_code": "123456",
  "nouveau_mot_de_passe": "NewSecurePass456!",
  "session_token": "temp-session-token"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès",
  "data": {
    "token": "3|sanctum_token_here"
  }
}
```

**Laravel Controller Implementation**:
```php
public function confirmPasswordReset(Request $request)
{
    $validated = $request->validate([
        'telephone' => 'required|string',
        'otp_code' => 'required|digits:6',
        'nouveau_mot_de_passe' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[@$!%*?&]/'],
        'session_token' => 'required|string',
    ]);

    $cacheKey = "otp:{$validated['telephone']}:password-reset";
    $otpData = Cache::get($cacheKey);

    if (!$otpData || $otpData['session_token'] !== $validated['session_token'] || $otpData['code'] != $validated['otp_code']) {
        return response()->json([
            'success' => false,
            'error' => ['code' => 'INVALID_OTP', 'message' => 'Code OTP invalide ou expiré'],
        ], 401);
    }

    // Update password
    $user = User::where('telephone', $validated['telephone'])->firstOrFail();
    $user->update(['mot_de_passe_hash' => bcrypt($validated['nouveau_mot_de_passe'])]);

    // Revoke all existing tokens
    $user->tokens()->delete();

    // Delete OTP
    Cache::forget($cacheKey);

    // Create new token
    $token = $user->createToken('web')->plainTextToken;

    return response()->json([
        'success' => true,
        'message' => 'Mot de passe réinitialisé avec succès',
        'data' => ['token' => $token],
    ]);
}
```

**Errors**:
- `400 Bad Request`: Weak password
- `401 Unauthorized`: Invalid OTP

**Side Effects**:
1. Hash new password with bcrypt
2. Update `mot_de_passe_hash` in database
3. Revoke all existing Sanctum tokens for this user
4. Log audit event: `PASSWORD_RESET`

---

### 6. Refresh Access Token

**Endpoint**: `POST /api/auth/refresh`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@refresh`

**Middleware**: `auth:sanctum`

**Description**: Refreshes the current Sanctum token (for SPA mode with cookie-based auth).

**Request Headers**:
```
Authorization: Bearer {current_token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "4|new_sanctum_token_here"
  }
}
```

**Laravel Controller Implementation**:
```php
public function refresh(Request $request)
{
    // Revoke current token
    $request->user()->currentAccessToken()->delete();

    // Create new token
    $newToken = $request->user()->createToken('web')->plainTextToken;

    return response()->json([
        'success' => true,
        'data' => ['token' => $newToken],
    ]);
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired token

---

### 7. Logout

**Endpoint**: `POST /api/auth/logout`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@logout`

**Middleware**: `auth:sanctum`

**Description**: Invalidates current session.

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

**Laravel Controller Implementation**:
```php
public function logout(Request $request)
{
    // Revoke current token
    $request->user()->currentAccessToken()->delete();

    return response()->json([
        'success' => true,
        'message' => 'Déconnexion réussie',
    ]);
}
```

**Side Effects**:
1. Revoke current Sanctum token
2. Log audit event: `USER_LOGOUT`

---

### 8. Get Current User Profile

**Endpoint**: `GET /api/auth/me`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@me`

**Middleware**: `auth:sanctum`

**Description**: Retrieves authenticated user's full profile.

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "telephone": "+224622123456",
    "email": "mamadou@example.com",
    "nom_complet": "Mamadou Diallo",
    "photo_profil_url": "https://s3.../profile.jpg",
    "bio": "Propriétaire de plusieurs biens à Kaloum",
    "type_compte": "PARTICULIER",
    "badge_certification": "OR",
    "statut_verification": "TITRE_FONCIER_VERIFIE",
    "note_moyenne": 4.5,
    "nombre_transactions": 8,
    "nombre_litiges": 0,
    "preferences_notification": {
      "push": true,
      "sms": true,
      "email": true,
      "whatsapp": true
    },
    "date_inscription": "2024-06-15T10:00:00Z",
    "derniere_connexion": "2025-01-28T14:30:00Z"
  }
}
```

**Laravel Resource** (`UserResource`):
```php
// app/Http/Resources/UserResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'telephone' => $this->telephone,
            'email' => $this->email,
            'nom_complet' => $this->nom_complet,
            'photo_profil_url' => $this->photo_profil_url,
            'bio' => $this->bio,
            'type_compte' => $this->type_compte,
            'badge_certification' => $this->badge_certification,
            'statut_verification' => $this->statut_verification,
            'note_moyenne' => $this->note_moyenne,
            'nombre_transactions' => $this->nombre_transactions,
            'nombre_litiges' => $this->nombre_litiges,
            'preferences_notification' => $this->preferences_notification,
            'date_inscription' => $this->date_inscription->toIso8601String(),
            'derniere_connexion' => $this->derniere_connexion?->toIso8601String(),
        ];
    }
}
```

**Laravel Controller Implementation**:
```php
public function me(Request $request)
{
    return response()->json([
        'success' => true,
        'data' => new UserResource($request->user()),
    ]);
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired token

---

### 9. Update User Profile

**Endpoint**: `PATCH /api/auth/me`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@updateProfile`

**Middleware**: `auth:sanctum`

**Description**: Updates user profile fields (limited fields editable).

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body**:
```json
{
  "nom_complet": "Mamadou Diallo (Agence)",
  "email": "newemail@example.com",
  "bio": "Nouvelle bio...",
  "photo_profil_url": "https://s3.../new-profile.jpg"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profil mis à jour",
  "data": {
    "user": { /* Updated user object */ }
  }
}
```

**Laravel Controller Implementation**:
```php
public function updateProfile(Request $request)
{
    $validated = $request->validate([
        'nom_complet' => 'sometimes|string|min:3|max:255',
        'email' => 'sometimes|email|max:255',
        'bio' => 'sometimes|string|max:500',
        'photo_profil_url' => 'sometimes|url',
    ]);

    $request->user()->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Profil mis à jour',
        'data' => ['user' => new UserResource($request->user()->fresh())],
    ]);
}
```

**Errors**:
- `400 Bad Request`: Invalid email format
- `401 Unauthorized`: Invalid token

**Side Effects**:
1. Update user record
2. Log audit event: `PROFILE_UPDATED`

---

### 10. Update Notification Preferences

**Endpoint**: `PATCH /api/auth/me/preferences`

**Laravel Controller**: `App\Http\Controllers\Api\AuthController@updatePreferences`

**Middleware**: `auth:sanctum`

**Description**: Updates notification channel preferences (FR-005, FR-062).

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body**:
```json
{
  "preferences_notification": {
    "push": true,
    "sms": false,
    "email": true,
    "whatsapp": true
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Préférences mises à jour",
  "data": {
    "preferences_notification": {
      "push": true,
      "sms": false,
      "email": true,
      "whatsapp": true
    }
  }
}
```

**Laravel Controller Implementation**:
```php
public function updatePreferences(Request $request)
{
    $validated = $request->validate([
        'preferences_notification' => 'required|array',
        'preferences_notification.push' => 'required|boolean',
        'preferences_notification.sms' => 'required|boolean',
        'preferences_notification.email' => 'required|boolean',
        'preferences_notification.whatsapp' => 'required|boolean',
    ]);

    $oldPrefs = $request->user()->preferences_notification;
    $request->user()->update($validated);

    // If WhatsApp changed from false to true, send test message
    if (!$oldPrefs['whatsapp'] && $validated['preferences_notification']['whatsapp']) {
        // Send test WhatsApp via WAHA
        // $request->user()->notify(new WhatsAppTestNotification());
    }

    return response()->json([
        'success' => true,
        'message' => 'Préférences mises à jour',
        'data' => ['preferences_notification' => $validated['preferences_notification']],
    ]);
}
```

**Side Effects**:
1. Update `preferences_notification` JSON field
2. If `whatsapp` changed from `false` to `true`, send test WhatsApp message via WAHA

---

## Laravel Sanctum Middleware

**Sanctum Configuration** (`config/sanctum.php`):
```php
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),

    'guard' => ['web'],
    'expiration' => null,  // Tokens don't expire by default
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
        'validate_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    ],
];
```

**Protected Route Example**:
```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/listings', [ListingController::class, 'store']);
    Route::patch('/listings/{id}', [ListingController::class, 'update']);
});
```

**Controller Usage**:
```php
// app/Http/Controllers/Api/ListingController.php
public function store(Request $request)
{
    // $request->user() contains authenticated User model
    $listing = Listing::create([
        'createur_id' => $request->user()->id,
        'titre' => $request->titre,
        // ...
    ]);

    return response()->json(['success' => true, 'data' => $listing]);
}
```

---

## Rate Limiting (Laravel Middleware)

**Rate Limiter Configuration** (`app/Providers/RouteServiceProvider.php`):
```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

protected function configureRateLimiting()
{
    RateLimiter::for('auth:register', function (Request $request) {
        return Limit::perHour(10)->by($request->ip());
    });

    RateLimiter::for('auth:otp', function (Request $request) {
        return Limit::perMinutes(5, 3)->by($request->input('telephone'));
    });

    RateLimiter::for('auth:login', function (Request $request) {
        return Limit::perHour(5)->by($request->input('telephone'));
    });

    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });
}
```

**Apply to Routes**:
```php
// routes/api.php
Route::post('/auth/register', [AuthController::class, 'register'])
    ->middleware('throttle:auth:register');

Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp'])
    ->middleware('throttle:auth:otp');

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth:login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Protected routes with 60 req/min limit
});
```

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| POST /register | 10 | 1 hour | IP address |
| POST /otp/verify | 3 | 5 minutes | Phone number |
| POST /login | 5 | 1 hour | Phone number |
| POST /password-reset/request | 3 | 1 hour | Phone number |
| All authenticated endpoints | 60 | 1 minute | User ID |

---

## Security Considerations

1. **Password Hashing**: bcrypt with Laravel's `Hash` facade (default cost = 10)
2. **OTP Storage**: Redis with TTL, auto-expiry after 5 minutes
3. **Sanctum Tokens**: Stored in `personal_access_tokens` table, hashed with SHA-256
4. **HTTPS Only**: All auth endpoints require TLS 1.3 (FR-091) - Enforce in production via middleware
5. **CSRF Protection**: Laravel's `VerifyCsrfToken` middleware for stateful requests (FR-088)
6. **Input Sanitization**: Laravel's validation + `htmlspecialchars()` to prevent XSS (FR-089)
7. **SQL Injection**: Eloquent ORM uses parameterized queries by default

---

## Error Response Format

**Standard Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Numéro de téléphone ou mot de passe incorrect",
    "details": null
  }
}
```

**Laravel Exception Handler** (`app/Exceptions/Handler.php`):
```php
public function render($request, Throwable $exception)
{
    if ($request->expectsJson()) {
        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Données invalides',
                    'details' => $exception->errors(),
                ],
            ], 422);
        }

        if ($exception instanceof AuthenticationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Non authentifié',
                    'details' => null,
                ],
            ], 401);
        }
    }

    return parent::render($request, $exception);
}
```

**Error Codes**:
- `INVALID_PHONE`: Phone number format invalid
- `PHONE_ALREADY_REGISTERED`: Phone number already exists
- `INVALID_CREDENTIALS`: Wrong phone/password combination
- `INVALID_OTP`: OTP code incorrect
- `OTP_EXPIRED`: OTP older than 5 minutes
- `OTP_MAX_ATTEMPTS`: 3 failed attempts (locked for 5 minutes)
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `ACCOUNT_SUSPENDED`: User account is suspended
- `ACCOUNT_BANNED`: User account is permanently banned
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Request validation failed

---

## Testing Checklist

- [ ] User registration with valid Guinea phone number succeeds
- [ ] OTP SMS is sent via Twilio (Laravel Notification)
- [ ] OTP verification completes registration and sets Bronze badge
- [ ] Login with correct credentials returns Sanctum token
- [ ] Login with wrong credentials returns 401
- [ ] Password reset via OTP works
- [ ] Sanctum token authenticates protected routes
- [ ] Expired/invalid token returns 401
- [ ] Rate limiting blocks excessive requests (Laravel throttle middleware)
- [ ] Phone number uniqueness is enforced (database unique constraint)
- [ ] Notification preferences update correctly
- [ ] WhatsApp opt-in sends test message via WAHA

**PHPUnit Test Example**:
```php
// tests/Feature/Auth/RegisterTest.php
public function test_user_can_register_with_valid_phone()
{
    $response = $this->postJson('/api/auth/register', [
        'telephone' => '+224622123456',
        'nom_complet' => 'Test User',
        'mot_de_passe' => 'Test123!',
        'type_compte' => 'PARTICULIER',
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure(['success', 'message', 'data' => ['user_id', 'otp_expires_at', 'session_token']]);

    $this->assertDatabaseHas('users', [
        'telephone' => '+224622123456',
        'badge_certification' => 'BRONZE',
    ]);
}
```

---

**Contract Status**: ✅ Complete (Laravel 11 + Sanctum)
**Next Contract**: `listings.md` (Listings CRUD and Search)
