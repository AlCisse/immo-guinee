<?php

namespace App\Models;

use App\Events\NewMessageEvent;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'type_message',
        'contenu',
        'media_url',
        'media_mime_type',
        'media_size',
        'reply_to_message_id',
        'is_read',
        'is_delivered',
        'is_admin_message',
        'read_at',
        'delivered_at',
        'status',
        'deleted_for_sender',
        'deleted_for_recipient',
        'deleted_for_everyone',
        'deleted_at',
        // E2E encrypted media
        'encrypted_media_id',
        'is_e2e_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'is_delivered' => 'boolean',
            'is_reported' => 'boolean',
            'is_flagged' => 'boolean',
            'is_blocked' => 'boolean',
            'is_admin_message' => 'boolean',
            'is_e2e_encrypted' => 'boolean',
            'deleted_for_sender' => 'boolean',
            'deleted_for_recipient' => 'boolean',
            'deleted_for_everyone' => 'boolean',
            'read_at' => 'datetime',
            'delivered_at' => 'datetime',
            'reported_at' => 'datetime',
            'deleted_at' => 'datetime',
            'fraud_score_data' => 'array',
            'media_size' => 'integer',
            'vocal_duration_seconds' => 'integer',
        ];
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function replyTo()
    {
        return $this->belongsTo(Message::class, 'reply_to_message_id');
    }

    /**
     * Encrypted media relationship (E2E encrypted media)
     */
    public function encryptedMedia()
    {
        return $this->belongsTo(EncryptedMedia::class, 'encrypted_media_id');
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeNotBlocked($query)
    {
        return $query->where('is_blocked', false);
    }

    public function markAsRead(): bool
    {
        $this->is_read = true;
        $this->read_at = now();

        return $this->save();
    }

    /**
     * Boot method for model events.
     * Note: Broadcasting is handled in MessagingController to include encryption key for E2E media.
     */
    protected static function boot()
    {
        parent::boot();

        static::created(function ($message) {
            // Update conversation last_message_at
            // Note: NewMessageEvent broadcast is handled in MessagingController
            // to support encryption key for E2E encrypted media
            $message->conversation->update([
                'last_message_at' => now(),
            ]);
        });
    }
}
