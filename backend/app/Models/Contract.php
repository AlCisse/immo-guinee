<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'listing_id',
        'bailleur_id',
        'locataire_id',
        'numero_contrat',
        'loyer_mensuel',
        'caution',
        'duree_mois',
        'date_debut',
        'date_fin',
        'clauses_specifiques',
        'termes_standards',
        'statut',
        // PDF storage fields
        'pdf_url',
        'pdf_hash',
        'pdf_storage_disk',
        'pdf_encrypted',
        // Secure archive (WORM storage)
        'secure_archive_path',
        'secure_archive_disk',
        // Signature fields
        'bailleur_signed_at',
        'bailleur_signature_ip',
        'bailleur_signature_data',
        'bailleur_signature_otp',
        'locataire_signed_at',
        'locataire_signature_ip',
        'locataire_signature_data',
        'locataire_signature_otp',
        // Lock/archive fields
        'cachet_electronique',
        'cachet_applied_at',
        'is_locked',
        'locked_at',
        'is_archived',
        'archived_at',
        'scheduled_deletion_at',
        'historique_telechargements',
        // Termination/Résiliation fields
        'resiliation_requested_at',
        'resiliation_requested_by',
        'resiliation_motif',
        'resiliation_effective_date',
        'preavis_months',
        'resiliation_confirmed_at',
        'resiliation_confirmed_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'loyer_mensuel' => 'decimal:2',
            'caution' => 'decimal:2',
            'duree_mois' => 'integer',
            'date_debut' => 'date',
            'date_fin' => 'date',
            'termes_standards' => 'array',
            'bailleur_signed_at' => 'datetime',
            'locataire_signed_at' => 'datetime',
            'cachet_applied_at' => 'datetime',
            'locked_at' => 'datetime',
            'archived_at' => 'datetime',
            'scheduled_deletion_at' => 'datetime',
            'is_locked' => 'boolean',
            'is_archived' => 'boolean',
            'pdf_encrypted' => 'boolean',
            // Termination fields
            'resiliation_requested_at' => 'datetime',
            'resiliation_effective_date' => 'date',
            'preavis_months' => 'integer',
            'resiliation_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Check if a termination is pending (requested but not yet effective)
     */
    public function isTerminationPending(): bool
    {
        return $this->resiliation_requested_at !== null
            && $this->resiliation_effective_date !== null
            && $this->resiliation_effective_date->isFuture();
    }

    /**
     * Check if the contract is terminated
     */
    public function isTerminated(): bool
    {
        return $this->statut === 'RESILIE'
            || ($this->resiliation_effective_date !== null && $this->resiliation_effective_date->isPast());
    }

    /**
     * Get the party who requested termination
     */
    public function terminationRequestedBy()
    {
        return $this->belongsTo(User::class, 'resiliation_requested_by');
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The listing associated with this contract.
     */
    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    /**
     * The landlord/owner user.
     */
    public function bailleur()
    {
        return $this->belongsTo(User::class, 'bailleur_id');
    }

    public function proprietaire()
    {
        return $this->bailleur();
    }

    /**
     * The tenant user.
     */
    public function locataire()
    {
        return $this->belongsTo(User::class, 'locataire_id');
    }

    /**
     * Initial payment (caution).
     */
    public function initialPayment()
    {
        return $this->belongsTo(Payment::class, 'initial_payment_id');
    }

    /**
     * All payments related to this contract.
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Disputes related to this contract.
     */
    public function disputes()
    {
        return $this->hasMany(Dispute::class);
    }

    /**
     * Ratings related to this contract.
     */
    public function ratings()
    {
        return $this->hasMany(Rating::class);
    }

    /**
     * Transactions related to this contract.
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Insurance associated with this contract.
     */
    public function insurance()
    {
        return $this->hasOne(Insurance::class);
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Active contracts.
     */
    public function scopeActive($query)
    {
        return $query->where('statut', 'ACTIF')
            ->where('date_debut', '<=', now())
            ->where('date_fin', '>=', now());
    }

    /**
     * Scope: Signed contracts.
     */
    public function scopeSigned($query)
    {
        return $query->whereIn('statut', ['SIGNE', 'ACTIF', 'TERMINE']);
    }

    /**
     * Scope: Pending signature contracts.
     */
    public function scopePendingSignature($query)
    {
        return $query->whereIn('statut', [
            'EN_ATTENTE_SIGNATURE_LOCATAIRE',
            'EN_ATTENTE_SIGNATURE_BAILLEUR'
        ]);
    }

    /**
     * Scope: Contracts for specific user (as either bailleur or locataire).
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('bailleur_id', $userId)
                ->orWhere('locataire_id', $userId);
        });
    }

    /**
     * Scope: Expiring soon contracts.
     */
    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('statut', 'ACTIF')
            ->where('date_fin', '<=', now()->addDays($days))
            ->where('date_fin', '>', now());
    }

    // ==================== METHODS ====================

    /**
     * Check if contract is fully signed (FR-026).
     */
    public function isFullySigned(): bool
    {
        return !is_null($this->bailleur_signed_at) &&
            !is_null($this->locataire_signed_at);
    }

    /**
     * Check if contract is waiting for bailleur signature.
     */
    public function isWaitingForBailleur(): bool
    {
        return $this->statut === 'EN_ATTENTE_SIGNATURE_BAILLEUR';
    }

    /**
     * Check if contract is waiting for locataire signature.
     */
    public function isWaitingForLocataire(): bool
    {
        return $this->statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE';
    }

    /**
     * Sign contract by bailleur (FR-027, FR-028).
     */
    public function signByBailleur(string $otp, string $ipAddress): bool
    {
        if ($this->is_locked || !is_null($this->bailleur_signed_at)) {
            return false;
        }

        $this->bailleur_signed_at = now();
        $this->bailleur_signature_otp = bcrypt($otp);
        $this->bailleur_signature_ip = $ipAddress;
        $this->bailleur_signature_data = json_encode([
            'method' => 'OTP_SMS',
            'timestamp' => now()->toIso8601String(),
            'ip' => $ipAddress,
        ]);

        // Update status
        if ($this->isFullySigned()) {
            $this->statut = 'SIGNE';
        } else {
            $this->statut = 'EN_ATTENTE_SIGNATURE_LOCATAIRE';
        }

        return $this->save();
    }

    /**
     * Sign contract by locataire (FR-027, FR-028).
     */
    public function signByLocataire(string $otp, string $ipAddress): bool
    {
        if ($this->is_locked || !is_null($this->locataire_signed_at)) {
            return false;
        }

        $this->locataire_signed_at = now();
        $this->locataire_signature_otp = bcrypt($otp);
        $this->locataire_signature_ip = $ipAddress;
        $this->locataire_signature_data = json_encode([
            'method' => 'OTP_SMS',
            'timestamp' => now()->toIso8601String(),
            'ip' => $ipAddress,
        ]);

        // Update status
        if ($this->isFullySigned()) {
            $this->statut = 'SIGNE';
        } else {
            $this->statut = 'EN_ATTENTE_SIGNATURE_BAILLEUR';
        }

        return $this->save();
    }

    /**
     * Apply digital seal to contract (FR-030).
     */
    public function applySeal(): bool
    {
        if (!$this->isFullySigned() || $this->cachet_electronique) {
            return false;
        }

        // Generate seal hash from contract data
        $sealData = [
            'numero_contrat' => $this->numero_contrat,
            'bailleur_id' => $this->bailleur_id,
            'locataire_id' => $this->locataire_id,
            'bailleur_signed_at' => $this->bailleur_signed_at->toIso8601String(),
            'locataire_signed_at' => $this->locataire_signed_at->toIso8601String(),
            'pdf_hash' => $this->pdf_hash,
        ];

        $this->cachet_electronique = hash('sha256', json_encode($sealData));
        $this->cachet_applied_at = now();

        return $this->save();
    }

    /**
     * Lock contract to make it immutable (FR-032).
     */
    public function lock(): bool
    {
        if (!$this->isFullySigned() || $this->is_locked) {
            return false;
        }

        $this->is_locked = true;
        $this->locked_at = now();

        // Schedule deletion after 10 years (FR-032)
        $this->scheduled_deletion_at = now()->addYears(
            config('app.contract_retention_years', 10)
        );

        return $this->save();
    }

    /**
     * Archive contract (FR-032).
     */
    public function archive(): bool
    {
        if (!$this->is_locked) {
            return false;
        }

        $this->is_archived = true;
        $this->archived_at = now();

        return $this->save();
    }

    /**
     * Check if contract is active.
     */
    public function isActive(): bool
    {
        return $this->statut === 'ACTIF' &&
            $this->date_debut <= now() &&
            $this->date_fin >= now();
    }

    /**
     * Check if contract is expired.
     */
    public function isExpired(): bool
    {
        return $this->date_fin < now();
    }

    /**
     * Get contract duration in days.
     */
    public function getDurationInDays(): int
    {
        return $this->date_debut->diffInDays($this->date_fin);
    }

    /**
     * Get remaining days in contract.
     */
    public function getRemainingDays(): int
    {
        if ($this->isExpired()) {
            return 0;
        }

        return now()->diffInDays($this->date_fin);
    }

    /**
     * Generate unique contract number (FR-023).
     */
    public static function generateContractNumber(): string
    {
        $year = now()->year;
        $random = strtoupper(\Str::random(5));

        return "IMMOG-{$year}-{$random}";
    }

    /**
     * Boot method to auto-generate contract number and prevent deletion of signed contracts.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($contract) {
            if (empty($contract->numero_contrat)) {
                $contract->numero_contrat = self::generateContractNumber();
            }
        });

        // Prevent deletion of signed/locked contracts
        static::deleting(function ($contract) {
            if ($contract->is_locked) {
                throw new \Exception('Impossible de supprimer un contrat verrouillé.');
            }

            // Check if both parties have signed
            if ($contract->isFullySigned()) {
                throw new \Exception('Impossible de supprimer un contrat signé par les deux parties.');
            }
        });

        // Prevent updates to locked contracts (except specific fields)
        static::updating(function ($contract) {
            if ($contract->is_locked) {
                // Allow only specific fields to be updated on locked contracts
                $allowedFields = [
                    'historique_telechargements', // Download history can be updated
                    'is_archived',
                    'archived_at',
                ];

                $dirty = $contract->getDirty();
                $forbiddenUpdates = array_diff(array_keys($dirty), $allowedFields);

                if (!empty($forbiddenUpdates)) {
                    throw new \Exception('Impossible de modifier un contrat verrouillé.');
                }
            }
        });
    }
}
