<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id',
        'listing_id',
        'bailleur_id',
        'locataire_id',
        'reference_transaction',
        'montant_total',
        'commission_plateforme',
        'date_transaction',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'montant_total' => 'decimal:2',
            'commission_plateforme' => 'decimal:2',
            'date_transaction' => 'date',
            'is_completed' => 'boolean',
            'has_dispute' => 'boolean',
            'dispute_resolved' => 'boolean',
        ];
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    public function bailleur()
    {
        return $this->belongsTo(User::class, 'bailleur_id');
    }

    public function locataire()
    {
        return $this->belongsTo(User::class, 'locataire_id');
    }

    public function scopeCompleted($query)
    {
        return $query->where('is_completed', true)
            ->where('statut', 'VALIDE');
    }

    public function scopeWithoutDispute($query)
    {
        return $query->where('has_dispute', false);
    }
}
