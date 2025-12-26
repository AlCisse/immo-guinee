<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles, HasUuids, SoftDeletes;

    /**
     * Force Spatie Permission to use 'web' guard for roles
     * This is necessary because API routes use Passport/Sanctum
     * but our roles are defined with guard_name='web'
     *
     * @var string
     */
    protected $guard_name = 'web';

     /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * Get the columns that should receive a unique identifier.
     *
     * @return array
     */
    public function uniqueIds()
    {
        return ['id'];
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'telephone',
        'mot_de_passe',
        'nom_complet',
        'email',
        'type_compte',
        'nom_entreprise',
        'numero_registre_commerce',
        'adresse',
        'badge',
        'statut_verification',
        'notification_preferences',
        'preferred_language',
        'telephone_verified_at',
        'email_verified_at',
        'is_active',
        'is_suspended',
        'last_login_at',
        // Real-time messaging
        'is_online',
        'last_seen_at',
        'push_tokens',
        // CGU acceptance
        'cgu_accepted_at',
        'cgu_version',
        'cgu_accepted_ip',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'mot_de_passe',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'telephone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'badge_updated_at' => 'datetime',
            'verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'notification_preferences' => 'array',
            'push_tokens' => 'array',
            'is_active' => 'boolean',
            'is_suspended' => 'boolean',
            'is_online' => 'boolean',
            'cgu_accepted_at' => 'datetime',
            'total_transactions' => 'integer',
            'total_disputes' => 'integer',
            'disputes_resolved' => 'integer',
            'avg_rating' => 'decimal:2',
        ];
    }

    /**
     * Get the password for authentication.
     */
    public function getAuthPassword(): string
    {
        return $this->mot_de_passe;
    }

    /**
     * Set the password attribute.
     * Note: The password should already be hashed when passed to this setter.
     * Use Hash::make() in your controller before setting this attribute.
     */
    public function setMotDePasseAttribute(string $value): void
    {
        $this->attributes['mot_de_passe'] = $value;
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * Listings owned by this user (as landlord/owner).
     */
    public function listings()
    {
        return $this->hasMany(Listing::class, 'user_id');
    }

    /**
     * Contracts where user is the landlord/owner.
     */
    public function contractsAsBailleur()
    {
        return $this->hasMany(Contract::class, 'bailleur_id');
    }

    /**
     * Contracts where user is the tenant.
     */
    public function contractsAsLocataire()
    {
        return $this->hasMany(Contract::class, 'locataire_id');
    }

    /**
     * Payments made by this user.
     */
    public function paymentsMade()
    {
        return $this->hasMany(Payment::class, 'payeur_id');
    }

    /**
     * Payments received by this user.
     */
    public function paymentsReceived()
    {
        return $this->hasMany(Payment::class, 'beneficiaire_id');
    }

    /**
     * Certification documents uploaded by this user.
     */
    public function certificationDocuments()
    {
        return $this->hasMany(CertificationDocument::class);
    }

    /**
     * Conversations initiated by this user.
     */
    public function conversationsInitiated()
    {
        return $this->hasMany(Conversation::class, 'initiator_id');
    }

    /**
     * Conversations where this user is a participant.
     */
    public function conversationsAsParticipant()
    {
        return $this->hasMany(Conversation::class, 'participant_id');
    }

    /**
     * Messages sent by this user.
     */
    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    /**
     * Disputes filed by this user (as complainant).
     */
    public function disputesFiled()
    {
        return $this->hasMany(Dispute::class, 'plaignant_id');
    }

    /**
     * Disputes against this user (as defendant).
     */
    public function disputesAgainst()
    {
        return $this->hasMany(Dispute::class, 'defendeur_id');
    }

    /**
     * Disputes where this user is the mediator.
     */
    public function disputesMediated()
    {
        return $this->hasMany(Dispute::class, 'mediateur_id');
    }

    /**
     * Transactions as landlord.
     */
    public function transactionsAsBailleur()
    {
        return $this->hasMany(Transaction::class, 'bailleur_id');
    }

    /**
     * Transactions as tenant.
     */
    public function transactionsAsLocataire()
    {
        return $this->hasMany(Transaction::class, 'locataire_id');
    }

    /**
     * Ratings given by this user.
     */
    public function ratingsGiven()
    {
        return $this->hasMany(Rating::class, 'evaluateur_id');
    }

    /**
     * Ratings received by this user.
     */
    public function ratingsReceived()
    {
        return $this->hasMany(Rating::class, 'evalue_id');
    }

    /**
     * Insurances for this user.
     */
    public function insurances()
    {
        return $this->hasMany(Insurance::class, 'assure_id');
    }

    /**
     * Favorite listings.
     */
    public function favorites()
    {
        return $this->belongsToMany(Listing::class, 'favorites', 'user_id', 'listing_id')
            ->withPivot('created_at', 'updated_at')
            ->withTimestamps();
    }

    // Note: notifications() is provided by the Notifiable trait

    // ==================== SCOPES ====================

    /**
     * Scope: Active users only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('is_suspended', false);
    }

    /**
     * Scope: Verified users only.
     */
    public function scopeVerified($query)
    {
        return $query->where('statut_verification', 'VERIFIE');
    }

    /**
     * Scope: Users with specific badge.
     */
    public function scopeWithBadge($query, string $badge)
    {
        return $query->where('badge', $badge);
    }

    /**
     * Scope: Users by account type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type_compte', $type);
    }

    // ==================== ACCESSORS & MUTATORS ====================

    /**
     * Get the user's commission rate based on badge (FR-045).
     */
    public function getCommissionRateAttribute(): float
    {
        return match($this->badge) {
            'DIAMANT' => 30.0,
            'OR' => 40.0,
            'ARGENT' => 50.0,
            'BRONZE' => 50.0,
            default => 50.0,
        };
    }

    /**
     * Check if user is eligible for badge upgrade.
     */
    public function canUpgradeBadge(): bool
    {
        // Silver: 1 transaction + CNI verified
        if ($this->badge === 'BRONZE' && $this->total_transactions >= 1) {
            $hasCNI = $this->certificationDocuments()
                ->where('type_document', 'CNI')
                ->where('statut_verification', 'VERIFIE')
                ->exists();

            if ($hasCNI) {
                return true;
            }
        }

        // Gold: 5+ transactions + titre foncier + avg rating >= 4.0
        if ($this->badge === 'ARGENT' && $this->total_transactions >= 5 && $this->avg_rating >= 4.0) {
            $hasTitre = $this->certificationDocuments()
                ->where('type_document', 'TITRE_FONCIER')
                ->where('statut_verification', 'VERIFIE')
                ->exists();

            if ($hasTitre) {
                return true;
            }
        }

        // Diamond: 20+ transactions + avg rating >= 4.5 + zero disputes
        if ($this->badge === 'OR' &&
            $this->total_transactions >= 20 &&
            $this->avg_rating >= 4.5 &&
            $this->total_disputes === 0) {
            return true;
        }

        return false;
    }

    /**
     * Check if user has two-factor authentication enabled.
     */
    public function hasTwoFactorEnabled(): bool
    {
        return !is_null($this->two_factor_confirmed_at);
    }

    /**
     * Check if user's phone is verified.
     */
    public function hasVerifiedPhone(): bool
    {
        return !is_null($this->telephone_verified_at);
    }

    /**
     * Get user's full name with badge emoji.
     */
    public function getDisplayNameAttribute(): string
    {
        $badgeEmoji = match($this->badge) {
            'DIAMANT' => '💎',
            'OR' => '🥇',
            'ARGENT' => '🥈',
            'BRONZE' => '🥉',
            default => '',
        };

        return $badgeEmoji ? "{$this->nom_complet} {$badgeEmoji}" : $this->nom_complet;
    }

    /**
     * Check if user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    /**
     * Check if user is a mediator.
     */
    public function isMediator(): bool
    {
        return $this->hasRole('mediator');
    }

    /**
     * Route notifications for the WhatsApp/WAHA channel.
     *
     * @param \Illuminate\Notifications\Notification $notification
     * @return string|null
     */
    public function routeNotificationForWaha($notification): ?string
    {
        return $this->telephone;
    }

    /**
     * WhatsApp messages sent to this user.
     */
    public function whatsappMessages()
    {
        return $this->hasMany(WhatsAppMessage::class);
    }

    /**
     * Reports made by this user.
     */
    public function reportsMade()
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    /**
     * Reports received against this user.
     */
    public function reportsReceived()
    {
        return $this->hasMany(Report::class, 'reported_user_id');
    }

    /**
     * Moderation actions performed by this user (as moderator).
     */
    public function moderationActions()
    {
        return $this->hasMany(ModerationLog::class, 'moderator_id');
    }

    /**
     * Check if user is a moderator.
     */
    public function isModerator(): bool
    {
        return $this->hasRole('moderator') || $this->hasRole('admin');
    }

    // ==================== REAL-TIME MESSAGING ====================

    /**
     * Mark user as online.
     */
    public function setOnline(): void
    {
        $this->update([
            'is_online' => true,
            'last_seen_at' => now(),
        ]);
    }

    /**
     * Mark user as offline.
     */
    public function setOffline(): void
    {
        $this->update([
            'is_online' => false,
            'last_seen_at' => now(),
        ]);
    }

    /**
     * Update last seen timestamp.
     */
    public function updateLastSeen(): void
    {
        $this->update(['last_seen_at' => now()]);
    }

    /**
     * Register a push notification token.
     */
    public function registerPushToken(string $token, string $platform): void
    {
        $tokens = $this->push_tokens ?? [];
        $tokens[$platform] = $token;
        $this->update(['push_tokens' => $tokens]);
    }

    /**
     * Remove a push notification token.
     */
    public function removePushToken(string $platform): void
    {
        $tokens = $this->push_tokens ?? [];
        unset($tokens[$platform]);
        $this->update(['push_tokens' => $tokens]);
    }

    /**
     * Get all push tokens for this user.
     */
    public function getPushTokens(): array
    {
        return $this->push_tokens ?? [];
    }

    /**
     * Check if user has push tokens registered.
     */
    public function hasPushTokens(): bool
    {
        return !empty($this->push_tokens);
    }

    /**
     * Scope: Online users only.
     */
    public function scopeOnline($query)
    {
        return $query->where('is_online', true);
    }

    /**
     * Get formatted last seen text.
     */
    public function getLastSeenTextAttribute(): string
    {
        if ($this->is_online) {
            return 'En ligne';
        }

        if (!$this->last_seen_at) {
            return 'Hors ligne';
        }

        return 'Vu ' . $this->last_seen_at->diffForHumans();
    }
}
