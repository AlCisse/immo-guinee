<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'listing_id',
        'initiator_id',
        'participant_id',
        'subject',
        'last_message_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'is_active' => 'boolean',
            'is_archived_by_initiator' => 'boolean',
            'is_archived_by_participant' => 'boolean',
        ];
    }

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function participant()
    {
        return $this->belongsTo(User::class, 'participant_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latest();
    }

    // Aliases for admin interface compatibility
    public function participant1()
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function participant2()
    {
        return $this->belongsTo(User::class, 'participant_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('initiator_id', $userId)
              ->orWhere('participant_id', $userId);
        });
    }
}
