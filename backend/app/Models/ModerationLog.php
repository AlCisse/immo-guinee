<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModerationLog extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     */
    protected $table = 'moderation_logs';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'moderator_id',
        'action',
        'entity_type',
        'entity_id',
        'note',
        'ip_address',
        'user_agent',
    ];

    // ==================== RELATIONSHIPS ====================

    /**
     * The moderator who performed the action.
     */
    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }

    /**
     * Get the related entity (polymorphic).
     */
    public function getEntityAttribute()
    {
        return match ($this->entity_type) {
            'listing' => Listing::find($this->entity_id),
            'user' => User::find($this->entity_id),
            'report' => Report::find($this->entity_id),
            'message' => Message::find($this->entity_id),
            default => null,
        };
    }

    // ==================== SCOPES ====================

    /**
     * Scope: By moderator.
     */
    public function scopeByModerator($query, string $moderatorId)
    {
        return $query->where('moderator_id', $moderatorId);
    }

    /**
     * Scope: By action type.
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: By entity type.
     */
    public function scopeByEntityType($query, string $type)
    {
        return $query->where('entity_type', $type);
    }

    /**
     * Scope: Today's logs.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope: This week's logs.
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
    }

    /**
     * Scope: For a specific entity.
     */
    public function scopeForEntity($query, string $type, string $id)
    {
        return $query->where('entity_type', $type)->where('entity_id', $id);
    }

    // ==================== HELPERS ====================

    /**
     * Get human-readable action label.
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'approve' => 'Approbation',
            'reject' => 'Rejet',
            'suspend' => 'Suspension',
            'unsuspend' => 'Levée de suspension',
            'warn' => 'Avertissement',
            'flag' => 'Signalement',
            'handle_report' => 'Traitement signalement',
            'contact_owner' => 'Contact propriétaire',
            'request_changes' => 'Demande de modifications',
            'suspend_24h' => 'Suspension 24h',
            'suspend_7d' => 'Suspension 7 jours',
            default => ucfirst($this->action),
        };
    }
}
