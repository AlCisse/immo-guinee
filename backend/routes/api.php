<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\ListingPhotoController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\WahaWebhookController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\ModeratorController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\ConfigController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Health check endpoints for container orchestration
Route::get('/health', function () {
    $checks = [
        'database' => false,
        'redis' => false,
    ];

    // Check database connection
    try {
        \DB::connection()->getPdo();
        $checks['database'] = true;
    } catch (\Exception $e) {
        \Log::error('Health check: Database failed', ['error' => $e->getMessage()]);
    }

    // Check Redis connection
    try {
        \Illuminate\Support\Facades\Redis::connection()->ping();
        $checks['redis'] = true;
    } catch (\Exception $e) {
        \Log::error('Health check: Redis failed', ['error' => $e->getMessage()]);
    }

    $allHealthy = !in_array(false, $checks, true);

    return response()->json([
        'status' => $allHealthy ? 'ok' : 'degraded',
        'service' => 'ImmoGuinée API',
        'version' => config('app.version', '1.0.0'),
        'timestamp' => now()->toIso8601String(),
        'checks' => $checks,
    ], $allHealthy ? 200 : 503);
});

// Simple liveness probe (no dependencies)
Route::get('/health/live', function () {
    return response()->json(['status' => 'ok'], 200);
});

// Broadcasting authentication for WebSocket (mobile uses /api/broadcasting/auth)
Route::post('/broadcasting/auth', function (Request $request) {
    return \Illuminate\Support\Facades\Broadcast::auth($request);
})->middleware('auth:api');

// App configuration endpoints (authenticated - to protect sensitive config)
Route::prefix('config')->middleware('auth:api')->group(function () {
    Route::get('/websocket', [ConfigController::class, 'websocket']);
});

// Contact form (public) - rate limited to prevent spam
Route::post('/contact', [\App\Http\Controllers\Api\ContactController::class, 'store'])
    ->middleware('throttle:5,1'); // 5 requests per minute

// AI endpoints (no authentication required) - rate limited to prevent abuse
Route::prefix('ai')->middleware('throttle:10,1')->group(function () { // 10 requests per minute
    Route::post('/optimize-listing', [AiController::class, 'optimizeListing']);
});

// Commissions (public - for display in app)
Route::get('/commissions', [\App\Http\Controllers\Api\CommissionController::class, 'index']);
Route::get('/commissions/{type}', [\App\Http\Controllers\Api\CommissionController::class, 'show']);

// Authentication endpoints (Laravel Passport) - with rate limiting
Route::prefix('auth')->group(function () {
    // Public routes with strict rate limiting to prevent brute force
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    });

    // OTP routes with dedicated rate limiter
    Route::middleware('throttle:otp')->group(function () {
        Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
        Route::post('/otp/resend', [AuthController::class, 'resendOtp']);
    });

    // Protected routes
    Route::middleware('auth:api')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/me/counts', [AuthController::class, 'counts']); // Unread notifications, messages, favorites count
        Route::patch('/me', [AuthController::class, 'updateProfile']);

        // Push notifications
        Route::post('/push-token', [AuthController::class, 'registerPushToken']);
        Route::delete('/push-token/{token}', [AuthController::class, 'removePushToken']);
    });
});

// User status endpoints (online/offline)
Route::prefix('users')->middleware('auth:api')->group(function () {
    Route::post('/online-status', [AuthController::class, 'updateOnlineStatus']);
});

// User notifications endpoints
Route::prefix('notifications')->middleware('auth:api')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/test', [\App\Http\Controllers\Api\NotificationController::class, 'sendTest']);
    Route::post('/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    Route::delete('/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);
});

// Listings endpoints
Route::prefix('listings')->group(function () {
    // Public routes (no auth required)
    Route::get('/', [ListingController::class, 'index']);
    Route::get('/search', [ListingController::class, 'search']);

    // Protected routes (auth required) - MUST be before /{id} to avoid conflict
    Route::middleware('auth:api')->group(function () {
        Route::get('/my', [ListingController::class, 'myListings']); // Get current user's listings
        Route::post('/', [ListingController::class, 'store']);
        Route::post('/{id}/update', [ListingController::class, 'update']); // POST for FormData with file uploads
        Route::patch('/{id}', [ListingController::class, 'update']);
        Route::put('/{id}', [ListingController::class, 'update']);
        Route::delete('/{id}', [ListingController::class, 'destroy']);
        Route::post('/{id}/premium', [ListingController::class, 'applyPremium']);
        Route::get('/{id}/contacts', [ListingController::class, 'getListingContacts']); // Get contacts from conversations

        // Photo management routes
        Route::post('/{id}/photos', [ListingPhotoController::class, 'store']); // Upload multiple photos
        Route::post('/{id}/photos/upload', [ListingPhotoController::class, 'upload']); // Upload single photo
        Route::post('/{id}/photos/reorder', [ListingPhotoController::class, 'reorder']); // Reorder photos
        Route::post('/{id}/photos/{photoId}/primary', [ListingPhotoController::class, 'setPrimary']); // Set primary
        Route::delete('/{id}/photos/{photoId}', [ListingPhotoController::class, 'destroy']); // Delete photo
    });

    // Public routes with {id} parameter - MUST be after /my to avoid conflict
    Route::get('/{id}', [ListingController::class, 'show']);
    Route::get('/{id}/similar', [ListingController::class, 'similar']);
    Route::post('/{id}/contact', [ListingController::class, 'contact']);
    Route::get('/{id}/photos', [ListingPhotoController::class, 'index']);
});

// Public contract signing endpoints (no auth required)
Route::prefix('contracts/sign')->group(function () {
    Route::get('/{token}', [ContractController::class, 'showByToken']); // View contract with token
    Route::post('/{token}/request-otp', [ContractController::class, 'requestOtpByToken']); // Request OTP
    Route::post('/{token}', [ContractController::class, 'signByToken']); // Sign with token + OTP
});

// Contracts endpoints (protected)
Route::prefix('contracts')->middleware('auth:api')->group(function () {
    Route::get('/', [ContractController::class, 'index']);
    Route::get('/my', [ContractController::class, 'index']); // Alias for user's contracts
    Route::post('/', [ContractController::class, 'store']);
    Route::get('/{id}', [ContractController::class, 'show']);
    Route::get('/{id}/preview', [ContractController::class, 'preview']); // T120: PDF streaming
    Route::get('/{id}/download', [ContractController::class, 'download']); // T137: Download with watermark
    Route::post('/{id}/sign/request-otp', [ContractController::class, 'requestSignatureOtp']); // T131: Request signature OTP
    Route::post('/{id}/sign', [ContractController::class, 'sign']); // T131: Sign with OTP
    Route::get('/{id}/signature-certificate', [ContractController::class, 'signatureCertificate']); // FR-030: Signature certificate
    Route::post('/{id}/send', [ContractController::class, 'send']); // T122: Multi-channel notifications
    Route::delete('/{id}', [ContractController::class, 'destroy']); // T121: Cancel if not signed
    Route::post('/{id}/cancel', [ContractController::class, 'cancel']); // Cancel during retraction period
    // Termination with notice period (préavis)
    Route::post('/{id}/terminate', [ContractController::class, 'requestTermination']); // Request termination with 3-month notice
    Route::post('/{id}/terminate/confirm', [ContractController::class, 'confirmTermination']); // Confirm termination by other party
    Route::get('/{id}/termination-status', [ContractController::class, 'getTerminationStatus']); // Get termination status
});

// Payments endpoints
Route::prefix('payments')->middleware('auth:api')->group(function () {
    Route::get('/', [PaymentController::class, 'index']);
    Route::post('/', [PaymentController::class, 'store']);
    Route::get('/{id}', [PaymentController::class, 'show']);
    Route::get('/{id}/status', [PaymentController::class, 'checkStatus']);
});

// Certifications endpoints
Route::prefix('certifications')->middleware('auth:api')->group(function () {
    // Any authenticated user can view and upload their own documents
    Route::get('/', [\App\Http\Controllers\Api\CertificationController::class, 'index']);
    Route::post('/upload', [\App\Http\Controllers\Api\CertificationController::class, 'upload']);
    Route::get('/me', [\App\Http\Controllers\Api\CertificationController::class, 'my']);
    Route::delete('/{document}', [\App\Http\Controllers\Api\CertificationController::class, 'destroy']);

    // Only admin can verify documents
    Route::post('/{document}/verify', [\App\Http\Controllers\Api\CertificationController::class, 'verify'])
        ->middleware('ensure.role:admin');
});

// Messaging endpoints
Route::prefix('messaging')->middleware('auth:api')->group(function () {
    // Static routes first (before wildcard routes)
    Route::get('/conversations', [\App\Http\Controllers\Api\MessagingController::class, 'conversations']);
    Route::post('/conversations/start', [\App\Http\Controllers\Api\MessagingController::class, 'startConversation']);

    // Message-specific routes (using message ID)
    Route::post('/messages/{message}/report', [\App\Http\Controllers\Api\MessagingController::class, 'report']);
    Route::patch('/messages/{message}/delivered', [\App\Http\Controllers\Api\MessagingController::class, 'markDelivered']);
    Route::patch('/messages/{message}/read', [\App\Http\Controllers\Api\MessagingController::class, 'markRead']);
    Route::delete('/messages/{message}', [\App\Http\Controllers\Api\MessagingController::class, 'deleteMessage']);

    // Conversation-specific routes (using conversation ID)
    Route::get('/{conversation}/messages', [\App\Http\Controllers\Api\MessagingController::class, 'messages']);
    Route::post('/{conversation}/messages', [\App\Http\Controllers\Api\MessagingController::class, 'sendMessage']);
    Route::post('/{conversation}/typing', [\App\Http\Controllers\Api\MessagingController::class, 'sendTyping']);
    Route::get('/{conversation}/search', [\App\Http\Controllers\Api\MessagingController::class, 'searchMessages']);
    Route::post('/{conversation}/archive', [\App\Http\Controllers\Api\MessagingController::class, 'archive']);

    // E2E Encrypted Media routes
    // Media is encrypted client-side, server stores only encrypted blobs (never decryption keys)
    Route::post('/{conversation}/encrypted-media', [\App\Http\Controllers\Api\EncryptedMediaController::class, 'upload']);
    Route::get('/encrypted-media/{encryptedMedia}', [\App\Http\Controllers\Api\EncryptedMediaController::class, 'show']);
    Route::get('/encrypted-media/{encryptedMedia}/download', [\App\Http\Controllers\Api\EncryptedMediaController::class, 'download']);
    Route::post('/encrypted-media/{encryptedMedia}/confirm-download', [\App\Http\Controllers\Api\EncryptedMediaController::class, 'confirmDownload']);
});

// Ratings endpoints
Route::prefix('ratings')->middleware('auth:api')->group(function () {
    // Any authenticated user can rate and view ratings
    Route::post('/', [\App\Http\Controllers\Api\RatingController::class, 'store']);
    Route::get('/{userId}', [\App\Http\Controllers\Api\RatingController::class, 'show']);

    // Admin only can moderate ratings
    Route::post('/{rating}/moderate', [\App\Http\Controllers\Api\RatingController::class, 'moderate'])
        ->middleware('ensure.role:admin');
    Route::get('/moderation/queue', [\App\Http\Controllers\Api\RatingController::class, 'moderationQueue'])
        ->middleware('ensure.role:admin');
});

// Disputes endpoints
Route::prefix('disputes')->middleware('auth:api')->group(function () {
    // Any authenticated user can list and view disputes they're involved in
    Route::get('/', [\App\Http\Controllers\Api\DisputeController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\DisputeController::class, 'store']);
    Route::get('/{dispute}', [\App\Http\Controllers\Api\DisputeController::class, 'show']);

    // Admin or mediator can assign mediators
    Route::post('/{dispute}/assign', [\App\Http\Controllers\Api\DisputeController::class, 'assignMediator'])
        ->middleware('ensure.role:admin,mediator');

    // Admin or mediator can resolve disputes
    Route::post('/{dispute}/resolve', [\App\Http\Controllers\Api\DisputeController::class, 'resolve'])
        ->middleware('ensure.role:admin,mediator');
});

// Favorites endpoints
Route::prefix('favorites')->middleware('auth:api')->group(function () {
    Route::get('/', [FavoriteController::class, 'index']);
    Route::post('/', [FavoriteController::class, 'store']);
    Route::delete('/{listingId}', [FavoriteController::class, 'destroy']);
    Route::get('/{listingId}/check', [FavoriteController::class, 'check']);
    Route::post('/{listingId}/toggle', [FavoriteController::class, 'toggle']);
});

// Public visit response endpoints (no auth required) - MUST be before auth routes
Route::prefix('visits/response')->group(function () {
    Route::get('/', [VisitController::class, 'getByToken']);
    Route::post('/', [VisitController::class, 'clientResponse']);
});

// Visits endpoints (protected)
Route::prefix('visits')->middleware('auth:api')->group(function () {
    Route::get('/', [VisitController::class, 'index']);
    Route::get('/upcoming', [VisitController::class, 'upcoming']);
    Route::get('/by-date', [VisitController::class, 'byDate']);
    Route::get('/stats', [VisitController::class, 'stats']);
    Route::get('/listing/{listingId}', [VisitController::class, 'forListing']);
    Route::post('/', [VisitController::class, 'store']);
    Route::get('/{id}', [VisitController::class, 'show']);
    Route::patch('/{id}', [VisitController::class, 'update']);
    Route::post('/{id}/confirm', [VisitController::class, 'confirm']);
    Route::post('/{id}/complete', [VisitController::class, 'complete']);
    Route::post('/{id}/cancel', [VisitController::class, 'cancel']);
    Route::post('/{id}/resend-notification', [VisitController::class, 'resendNotification']);
    Route::delete('/{id}', [VisitController::class, 'destroy']);
});

// Insurances endpoints
Route::prefix('insurances')->middleware('auth:api')->group(function () {
    Route::post('/subscribe', [\App\Http\Controllers\Api\InsuranceController::class, 'subscribe']);
    Route::get('/my', [\App\Http\Controllers\Api\InsuranceController::class, 'my']);
    Route::post('/{insurance}/claim', [\App\Http\Controllers\Api\InsuranceController::class, 'claim']);
    Route::post('/{insurance}/cancel', [\App\Http\Controllers\Api\InsuranceController::class, 'cancel']);
    Route::get('/{insurance}/certificate', [\App\Http\Controllers\Api\InsuranceController::class, 'downloadCertificate']);
});

// Admin 2FA setup routes (before 2FA middleware)
Route::prefix('admin/2fa')->middleware(['auth:api', 'ensure.role:admin'])->group(function () {
    Route::get('/status', [\App\Http\Controllers\Admin\Admin2FAController::class, 'status']);
    Route::post('/setup', [\App\Http\Controllers\Admin\Admin2FAController::class, 'setup']);
    Route::post('/confirm', [\App\Http\Controllers\Admin\Admin2FAController::class, 'confirm']);
    Route::post('/verify', [\App\Http\Controllers\Admin\Admin2FAController::class, 'verify']);
    Route::post('/disable', [\App\Http\Controllers\Admin\Admin2FAController::class, 'disable']);
    Route::post('/recovery-codes', [\App\Http\Controllers\Admin\Admin2FAController::class, 'regenerateRecoveryCodes']);
});

// Admin endpoints - strictly admin-only with 2FA required
Route::prefix('admin')->middleware(['auth:api', 'ensure.role:admin', '2fa'])->group(function () {
    // Dashboard and sidebar
    Route::get('/sidebar-counts', [\App\Http\Controllers\Api\AdminController::class, 'sidebarCounts']);
    Route::get('/dashboard-stats', [\App\Http\Controllers\Api\AdminController::class, 'dashboardStats']);

    // Analytics
    Route::get('/analytics', [\App\Http\Controllers\Api\AdminController::class, 'analytics']);

    // Commissions management
    Route::get('/commissions', [\App\Http\Controllers\Api\Admin\CommissionController::class, 'index']);
    Route::put('/commissions/{commission}', [\App\Http\Controllers\Api\Admin\CommissionController::class, 'update']);

    // Listings management
    Route::get('/listings', [\App\Http\Controllers\Api\AdminController::class, 'listings']);
    Route::delete('/listings/{listing}', [\App\Http\Controllers\Api\AdminController::class, 'deleteListing']);
    Route::get('/moderation/listings', [\App\Http\Controllers\Api\AdminController::class, 'moderationQueue']);
    Route::post('/moderation/listings/{listing}', [\App\Http\Controllers\Api\AdminController::class, 'moderateListing']);

    // Users management
    Route::get('/users', [\App\Http\Controllers\Api\AdminController::class, 'users']);
    Route::get('/users/trashed', [\App\Http\Controllers\Api\AdminController::class, 'trashedUsers']);
    Route::get('/users/{user}', [\App\Http\Controllers\Api\AdminController::class, 'showUser']);
    Route::post('/users/{user}', [\App\Http\Controllers\Api\AdminController::class, 'manageUser']);
    Route::delete('/users/{user}', [\App\Http\Controllers\Api\AdminController::class, 'deleteUser']);
    Route::post('/users/{user}/restore', [\App\Http\Controllers\Api\AdminController::class, 'restoreUser']);

    // Role management
    Route::get('/roles', [\App\Http\Controllers\Api\AdminController::class, 'roles']);
    Route::post('/users/{user}/roles/assign', [\App\Http\Controllers\Api\AdminController::class, 'assignRole']);
    Route::post('/users/{user}/roles/remove', [\App\Http\Controllers\Api\AdminController::class, 'removeRole']);
    Route::post('/users/{user}/roles/sync', [\App\Http\Controllers\Api\AdminController::class, 'syncRoles']);

    // Contracts management
    Route::get('/contracts', [\App\Http\Controllers\Api\AdminController::class, 'contracts']);

    // Payments management
    Route::get('/payments', [\App\Http\Controllers\Api\AdminController::class, 'payments']);

    // Messages management (contact + reports)
    Route::get('/messages', [\App\Http\Controllers\Api\AdminController::class, 'messages']);
    Route::get('/contact-messages/{contactMessage}', [\App\Http\Controllers\Api\AdminController::class, 'showContactMessage']);
    Route::post('/contact-messages/{contactMessage}/reply', [\App\Http\Controllers\Api\AdminController::class, 'replyToContactMessage']);
    Route::patch('/contact-messages/{contactMessage}/status', [\App\Http\Controllers\Api\AdminController::class, 'updateContactMessageStatus']);
    Route::get('/reports/{report}', [\App\Http\Controllers\Api\AdminController::class, 'showReport']);
    Route::post('/reports/{report}/process', [\App\Http\Controllers\Api\AdminController::class, 'processReport']);

    // Disputes management
    Route::get('/disputes', [\App\Http\Controllers\Api\AdminController::class, 'disputes']);
    Route::get('/disputes/{dispute}', [\App\Http\Controllers\Api\AdminController::class, 'showDispute']);
    Route::post('/disputes/{dispute}/assign', [\App\Http\Controllers\Api\AdminController::class, 'assignMediator']);
    Route::post('/disputes/{dispute}/resolve', [\App\Http\Controllers\Api\AdminController::class, 'resolveDispute']);
    Route::get('/mediators', [\App\Http\Controllers\Api\AdminController::class, 'mediators']);

    // Ratings management
    Route::get('/ratings', [\App\Http\Controllers\Api\AdminController::class, 'ratings']);
    Route::get('/ratings/{rating}', [\App\Http\Controllers\Api\AdminController::class, 'showRating']);
    Route::post('/ratings/{rating}/approve', [\App\Http\Controllers\Api\AdminController::class, 'approveRating']);
    Route::post('/ratings/{rating}/reject', [\App\Http\Controllers\Api\AdminController::class, 'rejectRating']);
    Route::delete('/ratings/{rating}', [\App\Http\Controllers\Api\AdminController::class, 'deleteRating']);

    // Certifications management
    Route::get('/certifications', [\App\Http\Controllers\Api\AdminController::class, 'certifications']);
    Route::get('/certifications/{certification}', [\App\Http\Controllers\Api\AdminController::class, 'showCertification']);
    Route::post('/certifications/{certification}/approve', [\App\Http\Controllers\Api\AdminController::class, 'approveCertification']);
    Route::post('/certifications/{certification}/reject', [\App\Http\Controllers\Api\AdminController::class, 'rejectCertification']);

    // Insurances management
    Route::get('/insurances', [\App\Http\Controllers\Api\AdminController::class, 'insurances']);

    // Visits management
    Route::get('/visits', [\App\Http\Controllers\Api\AdminController::class, 'visits']);
    Route::get('/visits/stats', [\App\Http\Controllers\Api\AdminController::class, 'visitStats']);

    // Notifications management
    Route::get('/notifications', [\App\Http\Controllers\Api\AdminController::class, 'notifications']);
    Route::post('/notifications/mark-read', [\App\Http\Controllers\Api\AdminController::class, 'markNotificationsRead']);
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\Api\AdminController::class, 'markAllNotificationsRead']);
    Route::post('/notifications/delete', [\App\Http\Controllers\Api\AdminController::class, 'deleteNotifications']);
    Route::post('/notifications/send', [\App\Http\Controllers\Api\AdminController::class, 'sendBulkNotification']);

    // Audit logs
    Route::get('/logs', [\App\Http\Controllers\Api\AdminController::class, 'auditLogs']);
});

// Moderator endpoints - for moderators and admins
Route::prefix('moderator')->middleware(['auth:api', 'ensure.role:admin,moderator'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [ModeratorController::class, 'dashboard']);
    Route::get('/stats', [ModeratorController::class, 'stats']);

    // Listings queue management
    Route::get('/listings', [ModeratorController::class, 'listingsQueue']);
    Route::get('/listings/{listing}', [ModeratorController::class, 'showListing']);
    Route::post('/listings/{listing}/approve', [ModeratorController::class, 'approveListing']);
    Route::post('/listings/{listing}/reject', [ModeratorController::class, 'rejectListing']);
    Route::post('/listings/{listing}/suspend', [ModeratorController::class, 'suspendListing']);
    Route::post('/listings/{listing}/request-changes', [ModeratorController::class, 'requestChanges']);
    Route::post('/listings/{listing}/contact', [ModeratorController::class, 'contactOwner']);

    // Reports management
    Route::get('/reports', [ModeratorController::class, 'reports']);
    Route::post('/reports/{report}', [ModeratorController::class, 'handleReport']);

    // Users management (limited for moderators)
    Route::get('/users', [ModeratorController::class, 'users']);
    Route::get('/users/{user}', [ModeratorController::class, 'showUser']);
    Route::post('/users/{user}/sanction', [ModeratorController::class, 'sanctionUser']);
    Route::post('/users/{user}/unsuspend', [ModeratorController::class, 'unsuspendUser']);

    // Moderation history
    Route::get('/history', [ModeratorController::class, 'history']);

    // Message templates
    Route::get('/templates', [ModeratorController::class, 'messageTemplates']);

    // Export (limited to 30 days for moderators)
    Route::get('/export', [ModeratorController::class, 'export']);
});

// Webhooks (public endpoints for external integrations)
Route::prefix('webhooks')->group(function () {
    Route::post('/orange-money', [\App\Http\Controllers\Api\WebhookController::class, 'orangeMoney']);
    Route::post('/mtn-momo', [\App\Http\Controllers\Api\WebhookController::class, 'mtnMomo']);
    Route::post('/waha', [WahaWebhookController::class, 'handle']); // WAHA WhatsApp webhook
});

// WAHA Session Management (admin only)
Route::prefix('waha')->middleware(['auth:api', 'ensure.role:admin'])->group(function () {
    Route::get('/status', [WahaWebhookController::class, 'status']);
    Route::get('/qr-code', [WahaWebhookController::class, 'qrCode']);
    Route::post('/session/start', [WahaWebhookController::class, 'startSession']);
    Route::post('/session/stop', [WahaWebhookController::class, 'stopSession']);
});
