<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

/**
 * Facebook Page Connection Model
 *
 * Stores encrypted Facebook Page access tokens for auto-publication.
 *
 * Security:
 * - page_access_token is encrypted with AES-256-GCM (Laravel Crypt)
 * - One page per user (unique constraint in DB)
 * - Tokens NEVER logged or exposed in API responses
 *
 * @property string $id
 * @property string $user_id
 * @property string $page_id
 * @property string $page_name
 * @property string $page_access_token (encrypted)
 * @property \Carbon\Carbon|null $token_expires_at
 * @property bool $auto_publish_enabled
 * @property \Carbon\Carbon $connected_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 *
 * @property-read User $user
 * @property-read \Illuminate\Database\Eloquent\Collection|FacebookPost[] $facebookPosts
 *
 * @see specs/001-immog-platform/contracts/facebook.md
 */
class FacebookPageConnection extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'facebook_page_connections';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'page_id',
        'page_name',
        'page_access_token',
        'token_expires_at',
        'auto_publish_enabled',
        'connected_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * CRITICAL: Never expose the access token in API responses.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'page_access_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'token_expires_at' => 'datetime',
        'connected_at' => 'datetime',
        'auto_publish_enabled' => 'boolean',
    ];

    /**
     * Get the user that owns this Facebook connection.
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all Facebook posts published through this connection.
     *
     * @return HasMany
     */
    public function facebookPosts(): HasMany
    {
        return $this->hasMany(FacebookPost::class);
    }

    /**
     * Encrypt the page access token before storing.
     * Uses Laravel Crypt (AES-256-GCM).
     *
     * @param string $value
     * @return void
     */
    public function setPageAccessTokenAttribute(string $value): void
    {
        $this->attributes['page_access_token'] = Crypt::encryptString($value);
    }

    /**
     * Decrypt the page access token when retrieving.
     * Uses Laravel Crypt (AES-256-GCM).
     *
     * @param string $value
     * @return string
     */
    public function getPageAccessTokenAttribute(string $value): string
    {
        return Crypt::decryptString($value);
    }

    /**
     * Check if the token is expired or will expire soon.
     *
     * @param int $hoursBuffer Hours before expiration to consider "expiring"
     * @return bool
     */
    public function isTokenExpiring(int $hoursBuffer = 24): bool
    {
        if (!$this->token_expires_at) {
            return false;
        }

        return $this->token_expires_at->subHours($hoursBuffer)->isPast();
    }

    /**
     * Check if the token has already expired.
     *
     * @return bool
     */
    public function isTokenExpired(): bool
    {
        if (!$this->token_expires_at) {
            return false;
        }

        return $this->token_expires_at->isPast();
    }

    /**
     * Scope a query to only include connections with auto-publish enabled.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAutoPublishEnabled($query)
    {
        return $query->where('auto_publish_enabled', true);
    }

    /**
     * Scope a query to only include connections with tokens expiring soon.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $days Number of days to check
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeTokenExpiringSoon($query, int $days = 7)
    {
        return $query->whereNotNull('token_expires_at')
            ->where('token_expires_at', '<=', now()->addDays($days));
    }

    /**
     * Get the count of published posts for this connection.
     *
     * @return int
     */
    public function getPublishedPostsCountAttribute(): int
    {
        return $this->facebookPosts()->where('status', 'published')->count();
    }
}
