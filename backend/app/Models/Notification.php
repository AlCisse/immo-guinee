<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'type',
        'titre',
        'message',
        'data',
        'is_read',
        'read_at',
        'action_url',
        'canaux',
        'email_sent_at',
        'whatsapp_sent_at',
        'sms_sent_at',
        'telegram_sent_at',
        'priority',
    ];

    protected $casts = [
        'data' => 'array',
        'canaux' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'email_sent_at' => 'datetime',
        'whatsapp_sent_at' => 'datetime',
        'sms_sent_at' => 'datetime',
        'telegram_sent_at' => 'datetime',
    ];

    // Types de notifications
    const TYPE_LISTING_CREATED = 'listing_created';
    const TYPE_LISTING_APPROVED = 'listing_approved';
    const TYPE_LISTING_REJECTED = 'listing_rejected';
    const TYPE_CONTRACT_CREATED = 'contract_created';
    const TYPE_CONTRACT_SIGNED = 'contract_signed';
    const TYPE_CONTRACT_CANCELLED = 'contract_cancelled';
    const TYPE_PAYMENT_RECEIVED = 'payment_received';
    const TYPE_PAYMENT_REMINDER = 'payment_reminder';
    const TYPE_MESSAGE_RECEIVED = 'message_received';
    const TYPE_VISIT_REQUESTED = 'visit_requested';
    const TYPE_VISIT_CONFIRMED = 'visit_confirmed';
    const TYPE_VISIT_CANCELLED = 'visit_cancelled';
    const TYPE_RATING_RECEIVED = 'rating_received';
    const TYPE_DISPUTE_OPENED = 'dispute_opened';
    const TYPE_DISPUTE_RESOLVED = 'dispute_resolved';
    const TYPE_CERTIFICATION_APPROVED = 'certification_approved';
    const TYPE_CERTIFICATION_REJECTED = 'certification_rejected';
    const TYPE_SYSTEM = 'system';
    const TYPE_WELCOME = 'welcome';

    // Priorités
    const PRIORITY_LOW = 'low';
    const PRIORITY_NORMAL = 'normal';
    const PRIORITY_HIGH = 'high';
    const PRIORITY_URGENT = 'urgent';

    /**
     * Relation avec l'utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope pour les notifications non lues
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope pour les notifications lues
     */
    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope par type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope par priorité
     */
    public function scopeOfPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Marquer comme lu
     */
    public function markAsRead(): self
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return $this;
    }

    /**
     * Marquer comme non lu
     */
    public function markAsUnread(): self
    {
        $this->update([
            'is_read' => false,
            'read_at' => null,
        ]);

        return $this;
    }

    /**
     * Obtenir l'icône par défaut selon le type
     */
    public static function getDefaultIcon(string $type): string
    {
        return match ($type) {
            self::TYPE_LISTING_CREATED, self::TYPE_LISTING_APPROVED => 'home',
            self::TYPE_LISTING_REJECTED => 'x-circle',
            self::TYPE_CONTRACT_CREATED, self::TYPE_CONTRACT_SIGNED => 'file-text',
            self::TYPE_CONTRACT_CANCELLED => 'file-x',
            self::TYPE_PAYMENT_RECEIVED => 'credit-card',
            self::TYPE_PAYMENT_REMINDER => 'alert-circle',
            self::TYPE_MESSAGE_RECEIVED => 'message-circle',
            self::TYPE_VISIT_REQUESTED, self::TYPE_VISIT_CONFIRMED => 'calendar',
            self::TYPE_VISIT_CANCELLED => 'calendar-x',
            self::TYPE_RATING_RECEIVED => 'star',
            self::TYPE_DISPUTE_OPENED => 'alert-triangle',
            self::TYPE_DISPUTE_RESOLVED => 'check-circle',
            self::TYPE_CERTIFICATION_APPROVED => 'shield-check',
            self::TYPE_CERTIFICATION_REJECTED => 'shield-x',
            self::TYPE_WELCOME => 'user-plus',
            default => 'bell',
        };
    }

    /**
     * Créer une notification
     */
    public static function notify(
        User $user,
        string $type,
        string $titre,
        string $message,
        ?array $data = null,
        ?string $actionUrl = null,
        string $priority = self::PRIORITY_NORMAL
    ): self {
        return self::create([
            'user_id' => $user->id,
            'type' => $type,
            'titre' => $titre,
            'message' => $message,
            'data' => $data,
            'action_url' => $actionUrl,
            'priority' => $priority,
        ]);
    }

    /**
     * Accesseur pour obtenir l'icône basée sur le type
     */
    public function getIconAttribute(): string
    {
        return self::getDefaultIcon($this->type);
    }
}
