<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Insurance extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id',
        'assure_id',
        'numero_police',
        'assureur',
        'type_assurance',
        'montant_couverture',
        'garanties',
        'franchise',
        'prime_annuelle',
        'prime_mensuelle',
        'date_debut',
        'date_fin',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'montant_couverture' => 'decimal:2',
            'franchise' => 'decimal:2',
            'prime_annuelle' => 'decimal:2',
            'prime_mensuelle' => 'decimal:2',
            'garanties' => 'array',
            'claims_data' => 'array',
            'date_debut' => 'date',
            'date_fin' => 'date',
            'renewed_at' => 'datetime',
            'is_active' => 'boolean',
            'auto_renewal' => 'boolean',
            'has_claims' => 'boolean',
            'claims_count' => 'integer',
        ];
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function assure()
    {
        return $this->belongsTo(User::class, 'assure_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('date_debut', '<=', now())
            ->where('date_fin', '>=', now());
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('is_active', true)
            ->where('date_fin', '<=', now()->addDays($days))
            ->where('date_fin', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->date_fin < now();
    }

    public function canRenew(): bool
    {
        return $this->auto_renewal && $this->isExpired();
    }
}
