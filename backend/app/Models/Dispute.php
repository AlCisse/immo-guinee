<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Dispute extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id',
        'plaignant_id',
        'defendeur_id',
        'reference_litige',
        'motif',
        'description',
        'preuves',
        'categorie',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'preuves' => 'array',
            'mediation_started_at' => 'datetime',
            'mediation_ended_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
            'legal_escalation_at' => 'datetime',
            'montant_resolution' => 'decimal:2',
            'is_closed' => 'boolean',
            'escalated_to_legal' => 'boolean',
            'affects_plaignant_rating' => 'boolean',
            'affects_defendeur_rating' => 'boolean',
            'affects_plaignant_badge' => 'boolean',
            'affects_defendeur_badge' => 'boolean',
        ];
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function plaignant()
    {
        return $this->belongsTo(User::class, 'plaignant_id');
    }

    public function defendeur()
    {
        return $this->belongsTo(User::class, 'defendeur_id');
    }

    public function mediateur()
    {
        return $this->belongsTo(User::class, 'mediateur_id');
    }

    // Alias for admin interface compatibility
    public function demandeur()
    {
        return $this->belongsTo(User::class, 'plaignant_id');
    }

    // Accessor for date_ouverture (uses created_at)
    public function getDateOuvertureAttribute()
    {
        return $this->created_at;
    }

    public function scopeOpen($query)
    {
        return $query->where('is_closed', false);
    }

    public function scopeInMediation($query)
    {
        return $query->where('statut', 'EN_MEDIATION');
    }

    public function scopeResolved($query)
    {
        return $query->whereIn('statut', ['RESOLU_AMIABLE', 'RESOLU_JUDICIAIRE']);
    }

    public static function generateReference(): string
    {
        $year = now()->year;
        $random = strtoupper(\Str::random(5));
        return "LIT-{$year}-{$random}";
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($dispute) {
            if (empty($dispute->reference_litige)) {
                $dispute->reference_litige = self::generateReference();
            }
        });
    }
}
