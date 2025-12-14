<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'reporter_id',
        'type',
        'listing_id',
        'reported_user_id',
        'message_id',
        'reason',
        'description',
        'severity',
        'status',
        'action_taken',
        'moderator_note',
        'processed_by',
        'processed_at',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The user who made the report.
     */
    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * The reported user (if type is USER).
     */
    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    /**
     * The reported listing (if type is LISTING).
     */
    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    /**
     * The reported message (if type is MESSAGE).
     */
    public function message()
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * The moderator who processed the report.
     */
    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Pending reports only.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'PENDING');
    }

    /**
     * Scope: By severity.
     */
    public function scopeBySeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope: By type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Critical reports (require immediate attention).
     */
    public function scopeCritical($query)
    {
        return $query->where('status', 'PENDING')
            ->where('severity', 'CRITICAL');
    }
}
