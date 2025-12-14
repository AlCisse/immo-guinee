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
        'reply_to_message_id',
        'is_read',
        'is_delivered',
        'is_admin_message',
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
            'read_at' => 'datetime',
            'delivered_at' => 'datetime',
            'reported_at' => 'datetime',
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
     * Boot method to broadcast new message event.
     */
    protected static function boot()
    {
        parent::boot();

        static::created(function ($message) {
            // Broadcast NewMessageEvent to conversation channel
            broadcast(new NewMessageEvent($message))->toOthers();

            // Update conversation last_message_at
            $message->conversation->update([
                'last_message_at' => now(),
            ]);
        });
    }
}
