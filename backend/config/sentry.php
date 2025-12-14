<?php

/**
 * T271: Sentry Configuration for ImmoGuinee
 *
 * Error tracking and performance monitoring
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Sentry DSN
    |--------------------------------------------------------------------------
    |
    | The DSN tells the SDK where to send the events. If this value is not
    | provided, the SDK will not send any events.
    |
    */

    'dsn' => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),

    /*
    |--------------------------------------------------------------------------
    | Release Version
    |--------------------------------------------------------------------------
    |
    | This will be sent along with all events to help track which release
    | introduced specific issues.
    |
    */

    'release' => env('SENTRY_RELEASE', '1.0.0'),

    /*
    |--------------------------------------------------------------------------
    | Environment
    |--------------------------------------------------------------------------
    |
    | This string is freeform and set to production by default. A release can
    | be associated with more than one environment to separate them in the UI.
    |
    */

    'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV', 'production')),

    /*
    |--------------------------------------------------------------------------
    | Breadcrumbs
    |--------------------------------------------------------------------------
    |
    | Configuration for breadcrumbs.
    |
    */

    'breadcrumbs' => [
        'logs' => true,
        'sql_queries' => true,
        'sql_bindings' => true,
        'queue_info' => true,
        'command_info' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Tracing
    |--------------------------------------------------------------------------
    |
    | Enable performance tracing for monitoring request and transaction times.
    |
    */

    'tracing' => [
        'queue_job_transactions' => env('SENTRY_TRACE_QUEUE_ENABLED', true),
        'queue_jobs' => true,
        'sql_queries' => true,
        'sql_origin' => true,
        'views' => true,
        'http_client_requests' => true,
        'redis_commands' => env('SENTRY_TRACE_REDIS_COMMANDS', true),
        'redis_origin' => true,
        'default_integrations' => true,
        'missing_routes' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Sample Rate
    |--------------------------------------------------------------------------
    |
    | Configure the percentage of errors and transactions to send to Sentry.
    |
    */

    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE', 0.2),
    'profiles_sample_rate' => env('SENTRY_PROFILES_SAMPLE_RATE', 0.1),

    /*
    |--------------------------------------------------------------------------
    | Send Default PII
    |--------------------------------------------------------------------------
    |
    | If this flag is enabled, personal data will be sent to Sentry.
    | GDPR: Keep this disabled in production for Guinea users' privacy.
    |
    */

    'send_default_pii' => env('SENTRY_SEND_DEFAULT_PII', false),

    /*
    |--------------------------------------------------------------------------
    | Controller Base Namespace
    |--------------------------------------------------------------------------
    |
    | This is used for naming transactions when using route-based approach.
    |
    */

    'controllers_base_namespace' => env('SENTRY_CONTROLLERS_BASE_NAMESPACE', 'App\\Http\\Controllers'),

    /*
    |--------------------------------------------------------------------------
    | Ignored Exceptions
    |--------------------------------------------------------------------------
    |
    | Exceptions that should not be reported to Sentry.
    |
    */

    'dont_report' => [
        \Illuminate\Auth\AuthenticationException::class,
        \Illuminate\Auth\Access\AuthorizationException::class,
        \Symfony\Component\HttpKernel\Exception\HttpException::class,
        \Illuminate\Database\Eloquent\ModelNotFoundException::class,
        \Illuminate\Session\TokenMismatchException::class,
        \Illuminate\Validation\ValidationException::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Before Send Callback
    |--------------------------------------------------------------------------
    |
    | Note: Closures cannot be serialized for config:cache.
    | Sensitive data filtering is handled via 'send_default_pii' => false
    | and the Sentry SDK's built-in scrubbing.
    |
    */

    'before_send' => null,

    /*
    |--------------------------------------------------------------------------
    | Tags
    |--------------------------------------------------------------------------
    |
    | Default tags to add to all events.
    |
    */

    'tags' => [
        'app' => 'immoguinee',
        'platform' => 'backend',
        'country' => 'GN',
    ],

    /*
    |--------------------------------------------------------------------------
    | Context Lines
    |--------------------------------------------------------------------------
    |
    | The number of lines of code context to capture around exceptions.
    |
    */

    'context_lines' => 5,

    /*
    |--------------------------------------------------------------------------
    | Max Breadcrumbs
    |--------------------------------------------------------------------------
    |
    | Maximum number of breadcrumbs to capture per event.
    |
    */

    'max_breadcrumbs' => 50,

    /*
    |--------------------------------------------------------------------------
    | Attach Stacktrace
    |--------------------------------------------------------------------------
    |
    | When enabled, stack traces are attached to all messages regardless of
    | whether exceptions occurred.
    |
    */

    'attach_stacktrace' => true,

    /*
    |--------------------------------------------------------------------------
    | In-App Include
    |--------------------------------------------------------------------------
    |
    | Paths that belong to the app (for better stack trace display).
    |
    */

    'in_app_include' => [
        base_path('app'),
    ],

    /*
    |--------------------------------------------------------------------------
    | In-App Exclude
    |--------------------------------------------------------------------------
    |
    | Paths to exclude from being marked as "in-app".
    |
    */

    'in_app_exclude' => [
        base_path('vendor'),
    ],

];
