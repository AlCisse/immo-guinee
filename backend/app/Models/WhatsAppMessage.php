<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessage extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'whatsapp_messages';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'phone_number',
        'user_id',
        'message',
        'type',
        'status',
        'waha_message_id',
        'sent_at',
        'delivered_at',
        'read_at',
        'error_message',
        'attempts',
        'max_attempts',
        'metadata',
        'response_data',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'response_data' => 'array',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'attempts' => 'integer',
            'max_attempts' => 'integer',
        ];
    }

    // ==================== CONSTANTS ====================

    /**
     * Message status constants
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_READ = 'read';
    public const STATUS_FAILED = 'failed';

    /**
     * Message type constants
     */
    public const TYPE_OTP = 'otp';
    public const TYPE_ACCOUNT_VERIFICATION = 'account_verification';
    public const TYPE_NEW_MESSAGE = 'new_message';
    public const TYPE_CONTRACT = 'contract';
    public const TYPE_PAYMENT = 'payment';
    public const TYPE_LISTING_REMINDER = 'listing_reminder';
    public const TYPE_VISIT_CONFIRMATION = 'visit_confirmation';
    public const TYPE_GENERAL = 'general';
    public const TYPE_BULK = 'bulk';
    public const TYPE_IMAGE = 'image';
    public const TYPE_FILE = 'file';

    // ==================== RELATIONSHIPS ====================

    /**
     * Get the user associated with this message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Pending messages.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope: Failed messages.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope: Messages that can be retried.
     */
    public function scopeRetryable($query)
    {
        return $query->where('status', self::STATUS_FAILED)
            ->whereColumn('attempts', '<', 'max_attempts');
    }

    /**
     * Scope: Messages by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Messages sent today.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope: Messages for a specific phone number.
     */
    public function scopeForPhone($query, string $phoneNumber)
    {
        return $query->where('phone_number', $phoneNumber);
    }

    // ==================== ACCESSORS ====================

    /**
     * Check if message was sent successfully.
     */
    public function getIsSentAttribute(): bool
    {
        return in_array($this->status, [
            self::STATUS_SENT,
            self::STATUS_DELIVERED,
            self::STATUS_READ,
        ]);
    }

    /**
     * Check if message delivery failed.
     */
    public function getIsFailedAttribute(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Check if message can be retried.
     */
    public function getCanRetryAttribute(): bool
    {
        return $this->is_failed && $this->attempts < $this->max_attempts;
    }

    /**
     * Get formatted phone number with country code.
     */
    public function getFormattedPhoneAttribute(): string
    {
        return '+' . $this->phone_number;
    }

    // ==================== METHODS ====================

    /**
     * Mark message as sent.
     */
    public function markAsSent(?string $wahaMessageId = null): bool
    {
        return $this->update([
            'status' => self::STATUS_SENT,
            'waha_message_id' => $wahaMessageId,
            'sent_at' => now(),
        ]);
    }

    /**
     * Mark message as delivered.
     */
    public function markAsDelivered(): bool
    {
        return $this->update([
            'status' => self::STATUS_DELIVERED,
            'delivered_at' => now(),
        ]);
    }

    /**
     * Mark message as read.
     */
    public function markAsRead(): bool
    {
        return $this->update([
            'status' => self::STATUS_READ,
            'read_at' => now(),
        ]);
    }

    /**
     * Mark message as failed.
     */
    public function markAsFailed(string $errorMessage): bool
    {
        return $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
            'attempts' => $this->attempts + 1,
        ]);
    }

    /**
     * Increment retry attempt.
     */
    public function incrementAttempts(): bool
    {
        return $this->update([
            'attempts' => $this->attempts + 1,
        ]);
    }

    /**
     * Reset for retry.
     */
    public function resetForRetry(): bool
    {
        return $this->update([
            'status' => self::STATUS_PENDING,
            'error_message' => null,
        ]);
    }
}
