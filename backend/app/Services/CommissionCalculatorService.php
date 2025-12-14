<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\User;

class CommissionCalculatorService
{
    /**
     * Commission rates based on transaction type (FR-040)
     */
    private const COMMISSION_RATES = [
        'LOCATION' => 0.50, // 50% of one month rent
        'VENTE_TERRAIN' => 0.01, // 1% of sale price
        'VENTE_MAISON' => 0.02, // 2% of sale price
        'VENTE_VILLA' => 0.02, // 2% of sale price
        'VENTE_APPARTEMENT' => 0.02, // 2% of sale price
        'MANDAT_GESTION' => 0.08, // 8% monthly
    ];

    /**
     * Badge discount rates (FR-056)
     */
    private const BADGE_DISCOUNTS = [
        'bronze' => 0,
        'argent' => 0.05,  // 5% discount
        'or' => 0.10,      // 10% discount
        'diamant' => 0.15, // 15% discount
    ];

    /**
     * Minimum commission in GNF
     */
    private const MIN_COMMISSION = 100000;

    /**
     * Calculate platform commission for a transaction
     */
    public function calculate(string $type, int $amount, ?string $propertyType = null): int
    {
        $rate = $this->getCommissionRate($type, $propertyType);

        return (int) round($amount * $rate);
    }

    /**
     * Get commission rate based on transaction type
     */
    private function getCommissionRate(string $type, ?string $propertyType): float
    {
        if ($type === 'LOCATION') {
            return self::COMMISSION_RATES['LOCATION'];
        }

        if ($type === 'VENTE') {
            if ($propertyType === 'TERRAIN') {
                return self::COMMISSION_RATES['VENTE_TERRAIN'];
            }

            // Default to 2% for all other property types (villa, maison, appartement)
            return self::COMMISSION_RATES['VENTE_MAISON'];
        }

        // Default fallback
        return 0.02;
    }

    /**
     * Calculate total amount including commission
     */
    public function calculateTotal(int $baseAmount, int $commission): int
    {
        return $baseAmount + $commission;
    }

    /**
     * Calculate commission for rental (caution + advance + commission)
     */
    public function calculateRentalCommission(int $monthlyRent, int $cautionMonths, int $advanceMonths): array
    {
        $cautionAmount = $monthlyRent * $cautionMonths;
        $advanceAmount = $monthlyRent * $advanceMonths;
        $commission = (int) round($monthlyRent * self::COMMISSION_RATES['LOCATION']);

        return [
            'montant_loyer_mensuel' => $monthlyRent,
            'montant_caution' => $cautionAmount,
            'montant_avance' => $advanceAmount,
            'commission_plateforme' => $commission,
            'montant_total' => $cautionAmount + $advanceAmount + $commission,
            'breakdown' => [
                'caution' => $cautionAmount,
                'avance' => $advanceAmount,
                'commission' => $commission,
            ],
        ];
    }

    /**
     * Calculate commission for property sale
     */
    public function calculateSaleCommission(int $salePrice, string $propertyType): array
    {
        $rate = $this->getCommissionRate('VENTE', $propertyType);
        $commission = (int) round($salePrice * $rate);

        return [
            'prix_vente' => $salePrice,
            'taux_commission' => $rate * 100 . '%',
            'commission_plateforme' => $commission,
            'montant_total' => $salePrice + $commission,
        ];
    }

    /**
     * Get commission breakdown for invoice display
     */
    public function getCommissionBreakdown(string $type, int $amount, array $params = []): array
    {
        if ($type === 'LOCATION') {
            return $this->calculateRentalCommission(
                $amount,
                $params['caution_mois'] ?? 1,
                $params['avance_mois'] ?? 1
            );
        }

        if ($type === 'VENTE') {
            return $this->calculateSaleCommission(
                $amount,
                $params['type_bien'] ?? 'VILLA'
            );
        }

        return [
            'montant_base' => $amount,
            'commission_plateforme' => 0,
            'montant_total' => $amount,
        ];
    }

    /**
     * Check if commission is non-refundable (transparency rule)
     */
    public function isCommissionRefundable(): bool
    {
        // Per FR-042: Commission is NEVER refundable
        return false;
    }

    /**
     * Calculate commission for a contract with all details (FR-040)
     */
    public function calculateForContract(Contract $contract): array
    {
        $type = $contract->type_contrat;

        if (in_array($type, ['BAIL_LOCATION_RESIDENTIEL', 'BAIL_LOCATION_COMMERCIAL'])) {
            return $this->calculateRentalCommission(
                $contract->loyer_mensuel,
                $contract->donnees_personnalisees['caution_mois'] ?? 1,
                $contract->donnees_personnalisees['avance_mois'] ?? 1
            );
        }

        if ($type === 'PROMESSE_VENTE_TERRAIN') {
            return $this->calculateSaleCommission(
                $contract->donnees_personnalisees['prix_vente'] ?? 0,
                'TERRAIN'
            );
        }

        if (in_array($type, ['PROMESSE_VENTE_MAISON', 'PROMESSE_VENTE_VILLA', 'PROMESSE_VENTE_APPARTEMENT'])) {
            return $this->calculateSaleCommission(
                $contract->donnees_personnalisees['prix_vente'] ?? 0,
                'MAISON'
            );
        }

        if ($type === 'MANDAT_GESTION') {
            return $this->calculateManagementCommission($contract->loyer_mensuel);
        }

        return [
            'montant_base' => $contract->loyer_mensuel,
            'commission_plateforme' => 0,
            'montant_total' => $contract->loyer_mensuel,
        ];
    }

    /**
     * Calculate commission for management mandate (FR-040)
     */
    public function calculateManagementCommission(int $monthlyRent): array
    {
        $commission = (int) round($monthlyRent * self::COMMISSION_RATES['MANDAT_GESTION']);

        return [
            'montant_loyer_mensuel' => $monthlyRent,
            'taux_commission' => '8%',
            'commission_mensuelle' => $commission,
            'note' => 'Commission prélevée mensuellement sur les loyers collectés',
        ];
    }

    /**
     * Apply badge discount to commission (FR-056)
     */
    public function applyBadgeDiscount(int $commission, User $user): array
    {
        $badge = $user->badge ?? 'bronze';
        $discountRate = self::BADGE_DISCOUNTS[$badge] ?? 0;
        $discount = (int) round($commission * $discountRate);
        $finalCommission = max($commission - $discount, self::MIN_COMMISSION);

        return [
            'original_commission' => $commission,
            'badge' => $badge,
            'discount_rate' => ($discountRate * 100) . '%',
            'discount_amount' => $discount,
            'final_commission' => $finalCommission,
            'savings_formatted' => number_format($discount, 0, ',', ' ') . ' GNF',
        ];
    }

    /**
     * Get full payment breakdown for invoice display (FR-041)
     */
    public function getInvoiceBreakdown(Contract $contract, ?User $payer = null): array
    {
        $commissionData = $this->calculateForContract($contract);
        $commission = $commissionData['commission_plateforme'] ?? 0;

        // Apply badge discount if user provided
        if ($payer) {
            $discountData = $this->applyBadgeDiscount($commission, $payer);
            $commission = $discountData['final_commission'];
            $commissionData['badge_discount'] = $discountData;
        }

        // Ensure minimum commission
        $commission = max($commission, self::MIN_COMMISSION);

        $caution = $commissionData['montant_caution'] ?? 0;
        $avance = $commissionData['montant_avance'] ?? 0;
        $total = $caution + $avance + $commission;

        return [
            'contract_reference' => $contract->reference,
            'contract_type' => $contract->type_contrat,
            'sections' => [
                [
                    'label' => 'Caution',
                    'amount' => $caution,
                    'formatted' => number_format($caution, 0, ',', ' ') . ' GNF',
                    'description' => ($commissionData['breakdown']['caution'] ?? 0) > 0
                        ? 'Dépôt de garantie'
                        : null,
                ],
                [
                    'label' => 'Avance',
                    'amount' => $avance,
                    'formatted' => number_format($avance, 0, ',', ' ') . ' GNF',
                    'description' => 'Premier(s) mois de loyer',
                ],
                [
                    'label' => 'Commission plateforme',
                    'amount' => $commission,
                    'formatted' => number_format($commission, 0, ',', ' ') . ' GNF',
                    'description' => 'Non remboursable (FR-042)',
                    'non_refundable' => true,
                ],
            ],
            'total' => [
                'amount' => $total,
                'formatted' => number_format($total, 0, ',', ' ') . ' GNF',
            ],
            'pour_proprietaire' => [
                'amount' => $caution + $avance,
                'formatted' => number_format($caution + $avance, 0, ',', ' ') . ' GNF',
                'note' => 'Transféré après validation (48h max)',
            ],
            'pour_plateforme' => [
                'amount' => $commission,
                'formatted' => number_format($commission, 0, ',', ' ') . ' GNF',
            ],
        ];
    }

    /**
     * Split payment between platform and escrow
     */
    public function splitPayment(int $totalPaid, Contract $contract): array
    {
        $breakdown = $this->getInvoiceBreakdown($contract);
        $platformCommission = $breakdown['pour_plateforme']['amount'];
        $escrowAmount = $breakdown['pour_proprietaire']['amount'];

        return [
            'platform_commission' => $platformCommission,
            'escrow_amount' => $escrowAmount,
            'total' => $totalPaid,
            'validated' => $totalPaid >= $breakdown['total']['amount'],
        ];
    }

    /**
     * Get commission rates info for transparency display
     */
    public function getCommissionRatesInfo(): array
    {
        return [
            [
                'type' => 'Location (résidentielle ou commerciale)',
                'rate' => '50%',
                'description' => '50% d\'un mois de loyer, payé une seule fois à la signature',
            ],
            [
                'type' => 'Vente de terrain',
                'rate' => '1%',
                'description' => '1% du prix de vente',
            ],
            [
                'type' => 'Vente de maison/villa/appartement',
                'rate' => '2%',
                'description' => '2% du prix de vente',
            ],
            [
                'type' => 'Mandat de gestion',
                'rate' => '8%',
                'description' => '8% du loyer collecté, prélevé mensuellement',
            ],
        ];
    }
}
