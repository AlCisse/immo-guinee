<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Event;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the model policies for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        \App\Models\Listing::class => \App\Policies\ListingPolicy::class,
        \App\Models\Contract::class => \App\Policies\ContractPolicy::class,
        \App\Models\Payment::class => \App\Policies\PaymentPolicy::class,
        \App\Models\CertificationDocument::class => \App\Policies\CertificationPolicy::class,
        \App\Models\Message::class => \App\Policies\MessagePolicy::class,
        \App\Models\Conversation::class => \App\Policies\ConversationPolicy::class,
        \App\Models\Dispute::class => \App\Policies\DisputePolicy::class,
        \App\Models\Rating::class => \App\Policies\RatingPolicy::class,
        \App\Models\Insurance::class => \App\Policies\InsurancePolicy::class,
        \App\Models\User::class => \App\Policies\AdminPolicy::class,
    ];

    /**
     * The event listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        \App\Events\PaymentConfirmed::class => [
            \App\Listeners\SendPaymentNotification::class,
        ],
        \App\Events\ContractSigned::class => [
            \App\Listeners\GenerateContractPdf::class,
        ],
        \App\Events\DisputeOpened::class => [
            \App\Listeners\NotifyDisputeParties::class,
        ],
        \App\Events\BadgeUpgraded::class => [
            \App\Listeners\NotifyBadgeUpgrade::class,
        ],
        \App\Events\DocumentVerified::class => [
            \App\Listeners\UpdateBadgeLevel::class,
        ],
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Register Event Listeners
        foreach ($this->listen as $event => $listeners) {
            foreach ($listeners as $listener) {
                Event::listen($event, $listener);
            }
        }

        // T257: Configure rate limiting (FR-087)
        $this->configureRateLimiting();
    }

    /**
     * Configure application rate limiting.
     * FR-087: Rate limiting protection
     */
    protected function configureRateLimiting(): void
    {
        // Default API rate limit: 60 requests per minute
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Authentication endpoints: stricter limits to prevent brute force
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // OTP requests: very strict to prevent SMS abuse
        RateLimiter::for('otp', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perHour(10)->by($request->ip()),
            ];
        });

        // Search endpoints: moderate limits for Elasticsearch
        RateLimiter::for('search', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        // Uploads: limited to prevent storage abuse
        RateLimiter::for('uploads', function (Request $request) {
            return $request->user()
                ? Limit::perHour(100)->by($request->user()->id)
                : Limit::perHour(10)->by($request->ip());
        });

        // Payments: strict limits for financial operations
        RateLimiter::for('payments', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(10)->by($request->user()->id)
                : Limit::none();
        });

        // Message sending: prevent spam
        RateLimiter::for('messages', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(20)->by($request->user()->id)
                : Limit::none();
        });

        // Listing creation: prevent mass spamming
        RateLimiter::for('listings', function (Request $request) {
            return $request->user()
                ? Limit::perDay(50)->by($request->user()->id)
                : Limit::none();
        });

        // Admin endpoints: generous limits for admin operations
        RateLimiter::for('admin', function (Request $request) {
            return $request->user()?->hasRole('admin')
                ? Limit::perMinute(120)->by($request->user()->id)
                : Limit::none();
        });
    }
}
