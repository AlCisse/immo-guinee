<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'contract_id',
        'payeur_id',
        'beneficiaire_id',
        'reference_paiement',
        'montant_total',
        'montant_caution',
        'montant_loyer',
        'commission_pourcentage',
        'commission_montant',
        'commission_due_date',
        'type_paiement',
        'mobile_money_reference',
        'mobile_money_numero',
        'mobile_money_metadata',
        'statut',
        'escrow_started_at',
        'escrow_released_at',
        'escrow_duration_days',
        'escrow_release_reason',
        'jour_caution',
        'caution_confirmed_at',
        'montant_verse_beneficiaire',
        'beneficiaire_payed_at',
        'beneficiaire_receipt_url',
        'frais_plateforme',
        'frais_preleves_at',
        'webhook_data',
        'webhook_received_at',
        'verification_code',
        'verified_at',
        'ip_address',
        'user_agent',
        'montant_rembourse',
        'remboursement_initie_at',
        'remboursement_complete_at',
        'raison_remboursement',
        'error_message',
        'retry_count',
        'last_retry_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'montant_total' => 'decimal:2',
            'montant_caution' => 'decimal:2',
            'montant_loyer' => 'decimal:2',
            'commission_pourcentage' => 'decimal:2',
            'commission_montant' => 'decimal:2',
            'frais_plateforme' => 'decimal:2',
            'montant_verse_beneficiaire' => 'decimal:2',
            'montant_rembourse' => 'decimal:2',
            'commission_due_date' => 'date',
            'jour_caution' => 'date',
            'mobile_money_metadata' => 'array',
            'webhook_data' => 'array',
            'escrow_started_at' => 'datetime',
            'escrow_released_at' => 'datetime',
            'caution_confirmed_at' => 'datetime',
            'beneficiaire_payed_at' => 'datetime',
            'frais_preleves_at' => 'datetime',
            'webhook_received_at' => 'datetime',
            'verified_at' => 'datetime',
            'remboursement_initie_at' => 'datetime',
            'remboursement_complete_at' => 'datetime',
            'last_retry_at' => 'datetime',
            'escrow_duration_days' => 'integer',
            'retry_count' => 'integer',
        ];
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * The contract associated with this payment.
     */
    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * The user making the payment (payer).
     */
    public function payeur()
    {
        return $this->belongsTo(User::class, 'payeur_id');
    }

    /**
     * The user receiving the payment (beneficiary).
     */
    public function beneficiaire()
    {
        return $this->belongsTo(User::class, 'beneficiaire_id');
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Payments in escrow.
     */
    public function scopeInEscrow($query)
    {
        return $query->where('statut', 'ESCROW')
            ->whereNotNull('escrow_started_at')
            ->whereNull('escrow_released_at');
    }

    /**
     * Scope: Completed payments.
     */
    public function scopeCompleted($query)
    {
        return $query->where('statut', 'COMPLETE');
    }

    /**
     * Scope: Pending payments.
     */
    public function scopePending($query)
    {
        return $query->where('statut', 'EN_ATTENTE');
    }

    /**
     * Scope: Failed payments.
     */
    public function scopeFailed($query)
    {
        return $query->where('statut', 'ECHOUE');
    }

    /**
     * Scope: Payments for specific user.
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('payeur_id', $userId)
                ->orWhere('beneficiaire_id', $userId);
        });
    }

    /**
     * Scope: Commission due soon.
     */
    public function scopeCommissionDueSoon($query, int $days = 7)
    {
        return $query->whereNotNull('commission_due_date')
            ->where('commission_due_date', '<=', now()->addDays($days))
            ->where('statut', 'ESCROW');
    }

    // ==================== ACCESSORS & MUTATORS ====================

    /**
     * Calculate commission based on user badge (FR-045).
     */
    public function calculateCommission(): void
    {
        $user = $this->beneficiaire;

        if (!$user) {
            return;
        }

        // Get commission rate from user badge
        $commissionRate = $user->commission_rate;

        $this->commission_pourcentage = $commissionRate;
        $this->commission_montant = ($this->montant_total * $commissionRate) / 100;

        // Commission due 3 months after caution day (FR-044)
        if ($this->jour_caution) {
            $this->commission_due_date = \Carbon\Carbon::parse($this->jour_caution)
                ->addMonths(3);
        }
    }

    /**
     * Place payment in escrow (FR-036, FR-037).
     */
    public function placeInEscrow(): bool
    {
        if ($this->statut !== 'EN_ATTENTE') {
            return false;
        }

        $this->statut = 'ESCROW';
        $this->escrow_started_at = now();
        $this->jour_caution = now()->toDateString();

        // Calculate commission
        $this->calculateCommission();

        return $this->save();
    }

    /**
     * Release payment from escrow (FR-042).
     */
    public function releaseFromEscrow(string $reason = 'Contract signed'): bool
    {
        if ($this->statut !== 'ESCROW') {
            return false;
        }

        $this->statut = 'COMPLETE';
        $this->escrow_released_at = now();
        $this->escrow_release_reason = $reason;

        // Calculate escrow duration
        if ($this->escrow_started_at) {
            $this->escrow_duration_days = $this->escrow_started_at
                ->diffInDays($this->escrow_released_at);
        }

        // Calculate amount to be paid to beneficiary (FR-046)
        $this->montant_verse_beneficiaire = $this->montant_total - $this->commission_montant;
        $this->beneficiaire_payed_at = now();

        return $this->save();
    }

    /**
     * Refund payment (FR-047).
     */
    public function refund(string $reason): bool
    {
        if (!in_array($this->statut, ['ESCROW', 'COMPLETE'])) {
            return false;
        }

        $this->statut = 'REMBOURSE';
        $this->montant_rembourse = $this->montant_total;
        $this->raison_remboursement = $reason;
        $this->remboursement_initie_at = now();
        $this->remboursement_complete_at = now();

        return $this->save();
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(string $errorMessage): bool
    {
        $this->statut = 'ECHOUE';
        $this->error_message = $errorMessage;
        $this->last_retry_at = now();
        $this->increment('retry_count');

        return $this->save();
    }

    /**
     * Verify payment with OTP.
     */
    public function verify(string $code): bool
    {
        if ($this->statut !== 'EN_ATTENTE') {
            return false;
        }

        if ($this->verification_code !== $code) {
            return false;
        }

        $this->verified_at = now();

        return $this->save();
    }

    /**
     * Check if payment is verified.
     */
    public function isVerified(): bool
    {
        return !is_null($this->verified_at);
    }

    /**
     * Check if payment is in escrow.
     */
    public function isInEscrow(): bool
    {
        return $this->statut === 'ESCROW';
    }

    /**
     * Check if commission is due.
     */
    public function isCommissionDue(): bool
    {
        return $this->commission_due_date &&
            $this->commission_due_date <= now() &&
            $this->statut === 'ESCROW';
    }

    /**
     * Get days remaining in escrow.
     */
    public function getEscrowDaysRemaining(): int
    {
        if (!$this->commission_due_date || $this->statut !== 'ESCROW') {
            return 0;
        }

        $diff = now()->diffInDays($this->commission_due_date, false);

        return max(0, $diff);
    }

    /**
     * Get formatted payment reference.
     */
    public function getFormattedReferenceAttribute(): string
    {
        return $this->reference_paiement;
    }

    /**
     * Get payment method display name.
     */
    public function getPaymentMethodNameAttribute(): string
    {
        return match ($this->type_paiement) {
            'ORANGE_MONEY' => 'Orange Money',
            'MTN_MOMO' => 'MTN Mobile Money',
            'VIREMENT' => 'Virement bancaire',
            'ESPECES' => 'Espèces',
            default => 'Inconnu',
        };
    }

    /**
     * Generate unique payment reference (FR-040).
     */
    public static function generatePaymentReference(): string
    {
        $year = now()->year;
        $random = strtoupper(\Str::random(6));

        return "PAY-{$year}-{$random}";
    }

    /**
     * Boot method to auto-generate payment reference.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            if (empty($payment->reference_paiement)) {
                $payment->reference_paiement = self::generatePaymentReference();
            }
        });
    }
}
