<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Visit extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'visites';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'listing_id',
        'proprietaire_id',
        'visiteur_id',
        'client_nom',
        'client_telephone',
        'client_email',
        'date_visite',
        'heure_visite',
        'duree_minutes',
        'statut',
        'notes',
        'notes_proprietaire',
        'motif_annulation',
        'confirmed_at',
        'completed_at',
        'cancelled_at',
        'cancelled_by',
        'client_response',
        'proposed_date',
        'proposed_time',
        'client_message',
        'client_responded_at',
        'response_token',
        'notification_sent',
        'notification_sent_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_visite' => 'date',
            'heure_visite' => 'datetime:H:i',
            'duree_minutes' => 'integer',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'proposed_date' => 'date',
            'client_responded_at' => 'datetime',
            'notification_sent' => 'boolean',
            'notification_sent_at' => 'datetime',
        ];
    }

    /**
     * Generate a unique response token for client.
     */
    public function generateResponseToken(): string
    {
        $this->response_token = bin2hex(random_bytes(32));
        $this->save();
        return $this->response_token;
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The listing being visited.
     */
    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    /**
     * The property owner.
     */
    public function proprietaire()
    {
        return $this->belongsTo(User::class, 'proprietaire_id');
    }

    /**
     * The visitor (if logged in user).
     */
    public function visiteur()
    {
        return $this->belongsTo(User::class, 'visiteur_id');
    }

    /**
     * The user who cancelled the visit.
     */
    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Pending visits only.
     */
    public function scopePending($query)
    {
        return $query->where('statut', 'PENDING');
    }

    /**
     * Scope: Confirmed visits only.
     */
    public function scopeConfirmed($query)
    {
        return $query->where('statut', 'CONFIRMED');
    }

    /**
     * Scope: Completed visits only.
     */
    public function scopeCompleted($query)
    {
        return $query->where('statut', 'COMPLETED');
    }

    /**
     * Scope: Cancelled visits only.
     */
    public function scopeCancelled($query)
    {
        return $query->where('statut', 'CANCELLED');
    }

    /**
     * Scope: Visits for a specific date.
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('date_visite', $date);
    }

    /**
     * Scope: Upcoming visits (today and future).
     */
    public function scopeUpcoming($query)
    {
        return $query->where('date_visite', '>=', now()->startOfDay())
            ->whereIn('statut', ['PENDING', 'CONFIRMED'])
            ->orderBy('date_visite')
            ->orderBy('heure_visite');
    }

    /**
     * Scope: Past visits.
     */
    public function scopePast($query)
    {
        return $query->where('date_visite', '<', now()->startOfDay())
            ->orWhere('statut', 'COMPLETED');
    }

    /**
     * Scope: Visits for a specific property owner.
     */
    public function scopeForProprietaire($query, $userId)
    {
        return $query->where('proprietaire_id', $userId);
    }

    /**
     * Scope: Visits for a specific visitor.
     */
    public function scopeForVisiteur($query, $userId)
    {
        return $query->where('visiteur_id', $userId);
    }

    // ==================== ACCESSORS & MUTATORS ====================

    /**
     * Get the formatted date and time.
     */
    public function getDateTimeFormatteeAttribute(): string
    {
        return $this->date_visite->format('d/m/Y') . ' à ' . $this->heure_visite->format('H:i');
    }

    /**
     * Check if visit is pending.
     */
    public function getIsPendingAttribute(): bool
    {
        return $this->statut === 'PENDING';
    }

    /**
     * Check if visit is confirmed.
     */
    public function getIsConfirmedAttribute(): bool
    {
        return $this->statut === 'CONFIRMED';
    }

    /**
     * Check if visit is completed.
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->statut === 'COMPLETED';
    }

    /**
     * Check if visit is cancelled.
     */
    public function getIsCancelledAttribute(): bool
    {
        return $this->statut === 'CANCELLED';
    }

    /**
     * Check if visit can be confirmed.
     */
    public function canBeConfirmed(): bool
    {
        return $this->statut === 'PENDING' && $this->date_visite >= now()->startOfDay();
    }

    /**
     * Check if visit can be completed.
     */
    public function canBeCompleted(): bool
    {
        return $this->statut === 'CONFIRMED';
    }

    /**
     * Check if visit can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->statut, ['PENDING', 'CONFIRMED']);
    }

    // ==================== ACTIONS ====================

    /**
     * Confirm the visit.
     */
    public function confirm(): bool
    {
        if (!$this->canBeConfirmed()) {
            return false;
        }

        $this->statut = 'CONFIRMED';
        $this->confirmed_at = now();

        return $this->save();
    }

    /**
     * Complete the visit.
     */
    public function complete(): bool
    {
        if (!$this->canBeCompleted()) {
            return false;
        }

        $this->statut = 'COMPLETED';
        $this->completed_at = now();

        return $this->save();
    }

    /**
     * Cancel the visit.
     */
    public function cancel(string $reason = null, $userId = null): bool
    {
        if (!$this->canBeCancelled()) {
            return false;
        }

        $this->statut = 'CANCELLED';
        $this->cancelled_at = now();
        $this->motif_annulation = $reason;
        $this->cancelled_by = $userId;

        return $this->save();
    }
}
