<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle pour les enregistrements d'audit d'intégrité
 *
 * Stocke les hash et métadonnées des documents archivés
 * séparément de la table principale pour une sécurité accrue
 */
class IntegrityAudit extends Model
{
    use HasUuids;

    protected $fillable = [
        'entity_type',
        'entity_id',
        'reference_number',
        'file_path',
        'storage_disk',
        'original_hash',
        'encrypted_hash',
        'file_size',
        'archived_at',
        'retention_until',
        'bailleur_id',
        'locataire_id',
        'metadata',
        'last_verified_at',
        'verification_count',
        'integrity_violations',
        'last_violation_at',
        'last_violation_type',
    ];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
            'retention_until' => 'datetime',
            'last_verified_at' => 'datetime',
            'last_violation_at' => 'datetime',
            'verification_count' => 'integer',
            'integrity_violations' => 'integer',
            'file_size' => 'integer',
        ];
    }

    // Relationships

    public function contract()
    {
        return $this->belongsTo(Contract::class, 'entity_id')
            ->where('entity_type', 'contract');
    }

    public function bailleur()
    {
        return $this->belongsTo(User::class, 'bailleur_id');
    }

    public function locataire()
    {
        return $this->belongsTo(User::class, 'locataire_id');
    }

    // Scopes

    public function scopeForContracts($query)
    {
        return $query->where('entity_type', 'contract');
    }

    public function scopeActiveRetention($query)
    {
        return $query->where('retention_until', '>', now());
    }

    public function scopeWithViolations($query)
    {
        return $query->where('integrity_violations', '>', 0);
    }

    public function scopeNeedingVerification($query, int $daysSinceLastCheck = 30)
    {
        return $query->where(function ($q) use ($daysSinceLastCheck) {
            $q->whereNull('last_verified_at')
                ->orWhere('last_verified_at', '<', now()->subDays($daysSinceLastCheck));
        });
    }

    // Methods

    public function isValid(): bool
    {
        return $this->integrity_violations === 0;
    }

    public function isExpired(): bool
    {
        return $this->retention_until < now();
    }

    public function getMetadataAttribute($value)
    {
        return json_decode($value, true);
    }
}
