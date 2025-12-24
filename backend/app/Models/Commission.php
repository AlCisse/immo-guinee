<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'type_transaction',
        'label',
        'taux_pourcentage',
        'mois',
        'description',
        'is_active',
    ];

    protected $casts = [
        'taux_pourcentage' => 'decimal:2',
        'mois' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get commission by transaction type
     */
    public static function getByType(string $type): ?self
    {
        return self::where('type_transaction', $type)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Get all active commissions
     */
    public static function getAllActive()
    {
        return self::where('is_active', true)->get();
    }
}
