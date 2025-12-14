<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CertificationDocument extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'type_document',
        'numero_document',
        'date_emission',
        'date_expiration',
        'fichier_url',
        'fichier_hash',
        'fichier_size',
        'fichier_mime_type',
        'statut_verification',
        'verified_by',
        'verified_at',
        'verification_notes',
        'raison_rejet',
    ];

    protected function casts(): array
    {
        return [
            'date_emission' => 'date',
            'date_expiration' => 'date',
            'verified_at' => 'datetime',
            'fichier_size' => 'integer',
            'ai_verification_data' => 'array',
            'ai_confidence_score' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function scopeVerified($query)
    {
        return $query->where('statut_verification', 'VERIFIE');
    }

    public function scopePending($query)
    {
        return $query->where('statut_verification', 'EN_ATTENTE');
    }

    public function isVerified(): bool
    {
        return $this->statut_verification === 'VERIFIE';
    }
}
