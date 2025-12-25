<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

/**
 * EncryptedMedia Model
 *
 * Represents an E2E encrypted media file stored temporarily on the server.
 * The server stores only encrypted blobs - decryption keys are NEVER stored.
 * Keys are transmitted via WebSocket and stored only on client devices.
 *
 * @property string $id
 * @property string|null $message_id
 * @property string $uploader_id
 * @property string $conversation_id
 * @property string $media_type VOCAL|PHOTO|VIDEO
 * @property string $storage_path
 * @property string $storage_disk
 * @property int $encrypted_size
 * @property int|null $original_size
 * @property string $iv Base64 encoded IV
 * @property string|null $auth_tag Base64 encoded auth tag
 * @property string|null $mime_type
 * @property int|null $duration_seconds
 * @property \Carbon\Carbon $expires_at
 * @property bool $is_downloaded_by_recipient
 * @property \Carbon\Carbon|null $downloaded_at
 * @property string|null $downloaded_by
 * @property bool $is_deleted
 * @property string|null $deletion_reason
 * @property \Carbon\Carbon|null $deleted_at
 * @property bool $reminder_sent
 * @property \Carbon\Carbon|null $reminder_sent_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class EncryptedMedia extends Model
{
    use HasUuids;

    protected $table = 'encrypted_media';

    protected $fillable = [
        'message_id',
        'uploader_id',
        'conversation_id',
        'media_type',
        'storage_path',
        'storage_disk',
        'encrypted_size',
        'original_size',
        'iv',
        'auth_tag',
        'mime_type',
        'duration_seconds',
        'expires_at',
        'is_downloaded_by_recipient',
        'downloaded_at',
        'downloaded_by',
        'reminder_sent',
        'reminder_sent_at',
        'is_deleted',
        'deletion_reason',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'encrypted_size' => 'integer',
            'original_size' => 'integer',
            'duration_seconds' => 'integer',
            'expires_at' => 'datetime',
            'downloaded_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'deleted_at' => 'datetime',
            'is_downloaded_by_recipient' => 'boolean',
            'reminder_sent' => 'boolean',
            'is_deleted' => 'boolean',
        ];
    }

    /**
     * Days before sending reminder notification
     */
    public const REMINDER_DAYS = 3;

    /**
     * TTL in days before auto-deletion
     */
    public const TTL_DAYS = 5;

    /**
     * Maximum file sizes in bytes
     */
    public const MAX_SIZE_VOCAL = 10 * 1024 * 1024;  // 10 MB
    public const MAX_SIZE_PHOTO = 10 * 1024 * 1024;  // 10 MB
    public const MAX_SIZE_VIDEO = 50 * 1024 * 1024;  // 50 MB

    /**
     * Deletion reasons
     */
    public const DELETION_REASON_EXPIRED = 'expired';
    public const DELETION_REASON_DOWNLOADED = 'downloaded';
    public const DELETION_REASON_LISTING_UNAVAILABLE = 'listing_unavailable';
    public const DELETION_REASON_MANUAL = 'manual';

    // =========================================================================
    // RELATIONSHIPS
    // =========================================================================

    /**
     * The message this media belongs to
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * The user who uploaded this media
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }

    /**
     * The conversation this media belongs to
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * The user who downloaded this media
     */
    public function downloadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'downloaded_by');
    }

    // =========================================================================
    // SCOPES
    // =========================================================================

    /**
     * Scope for expired media (past TTL)
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<', now())
                     ->where('is_deleted', false);
    }

    /**
     * Scope for downloaded media
     */
    public function scopeDownloaded(Builder $query): Builder
    {
        return $query->where('is_downloaded_by_recipient', true)
                     ->where('is_deleted', false);
    }

    /**
     * Scope for media ready for cleanup (expired OR downloaded)
     */
    public function scopeReadyForCleanup(Builder $query): Builder
    {
        return $query->where('is_deleted', false)
                     ->where(function (Builder $q) {
                         $q->where('expires_at', '<', now())
                           ->orWhere('is_downloaded_by_recipient', true);
                     });
    }

    /**
     * Scope for active (not deleted, not expired) media
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_deleted', false)
                     ->where('expires_at', '>=', now());
    }

    /**
     * Scope for media needing reminder notification (3+ days old, not downloaded, no reminder sent)
     */
    public function scopeNeedsReminder(Builder $query): Builder
    {
        return $query->where('is_deleted', false)
                     ->where('is_downloaded_by_recipient', false)
                     ->where('reminder_sent', false)
                     ->where('created_at', '<=', now()->subDays(self::REMINDER_DAYS));
    }

    /**
     * Scope for media ready for deletion (5+ days old and not downloaded)
     */
    public function scopeExpiredAndNotDownloaded(Builder $query): Builder
    {
        return $query->where('is_deleted', false)
                     ->where('is_downloaded_by_recipient', false)
                     ->where('created_at', '<=', now()->subDays(self::TTL_DAYS));
    }

    /**
     * Scope for media in a specific conversation
     */
    public function scopeInConversation(Builder $query, string $conversationId): Builder
    {
        return $query->where('conversation_id', $conversationId);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Check if media has expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    /**
     * Check if media is available for download
     */
    public function isAvailable(): bool
    {
        return !$this->is_deleted && !$this->isExpired();
    }

    /**
     * Check if user can access this media
     */
    public function canBeAccessedBy(User $user): bool
    {
        return $this->conversation->initiator_id === $user->id
            || $this->conversation->participant_id === $user->id;
    }

    /**
     * Mark as downloaded by recipient
     */
    public function markAsDownloaded(string $userId): void
    {
        if ($this->uploader_id !== $userId) {
            $this->update([
                'is_downloaded_by_recipient' => true,
                'downloaded_at' => now(),
                'downloaded_by' => $userId,
            ]);
        }
    }

    /**
     * Mark reminder as sent
     */
    public function markReminderSent(): void
    {
        $this->update([
            'reminder_sent' => true,
            'reminder_sent_at' => now(),
        ]);
    }

    /**
     * Soft delete the media with reason
     */
    public function markAsDeleted(string $reason = self::DELETION_REASON_MANUAL): void
    {
        $this->update([
            'is_deleted' => true,
            'deletion_reason' => $reason,
            'deleted_at' => now(),
        ]);
    }

    /**
     * Get human-readable media type in French
     */
    public function getMediaTypeLabel(): string
    {
        return match ($this->media_type) {
            'VOCAL' => 'message vocal',
            'PHOTO' => 'image',
            'VIDEO' => 'vidéo',
            default => 'média',
        };
    }

    /**
     * Get the recipient user (the one who should download the media)
     */
    public function getRecipient(): ?User
    {
        $conversation = $this->conversation;
        if (!$conversation) {
            return null;
        }

        // Recipient is the participant who is NOT the uploader
        if ($conversation->initiator_id === $this->uploader_id) {
            return $conversation->participant;
        }

        return $conversation->initiator;
    }

    /**
     * Get max file size for media type
     */
    public static function getMaxSizeForType(string $mediaType): int
    {
        return match ($mediaType) {
            'VOCAL' => self::MAX_SIZE_VOCAL,
            'PHOTO' => self::MAX_SIZE_PHOTO,
            'VIDEO' => self::MAX_SIZE_VIDEO,
            default => self::MAX_SIZE_PHOTO,
        };
    }

    /**
     * Get human-readable file size
     */
    public function getFormattedSize(): string
    {
        $size = $this->original_size ?? $this->encrypted_size;

        if ($size >= 1073741824) {
            return number_format($size / 1073741824, 2) . ' GB';
        }
        if ($size >= 1048576) {
            return number_format($size / 1048576, 2) . ' MB';
        }
        if ($size >= 1024) {
            return number_format($size / 1024, 2) . ' KB';
        }

        return $size . ' bytes';
    }

    /**
     * Get formatted duration for audio/video
     */
    public function getFormattedDuration(): ?string
    {
        if (!$this->duration_seconds) {
            return null;
        }

        $minutes = floor($this->duration_seconds / 60);
        $seconds = $this->duration_seconds % 60;

        return sprintf('%d:%02d', $minutes, $seconds);
    }
}
