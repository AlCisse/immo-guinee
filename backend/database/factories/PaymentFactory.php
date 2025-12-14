<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $montantLoyer = fake()->numberBetween(1000000, 5000000);
        $montantCaution = fake()->numberBetween(1000000, 10000000);
        $montantTotal = $montantLoyer + $montantCaution;
        
        $commissionPourcentage = 50.00; // 50% pour badge BRONZE
        $commissionMontant = $montantTotal * ($commissionPourcentage / 100);

        $typePaiement = fake()->randomElement(['ORANGE_MONEY', 'MTN_MOMO', 'VIREMENT', 'ESPECES']);
        $statut = fake()->randomElement(['EN_ATTENTE', 'ESCROW', 'COMPLETE', 'ECHOUE']);

        $escrowStarted = $statut === 'ESCROW' ? Carbon::instance(fake()->dateTimeBetween('-7 days', 'now')) : null;
        $escrowReleased = $statut === 'COMPLETE' ? Carbon::instance(fake()->dateTimeBetween('-3 days', 'now')) : null;
        $escrowDuration = $escrowStarted && $escrowReleased ? $escrowStarted->diffInDays($escrowReleased) : null;

        return [
            'contract_id' => Contract::factory(),
            'payeur_id' => User::factory(),
            'beneficiaire_id' => User::factory(),
            'reference_paiement' => 'PAY-' . now()->year . '-' . strtoupper(fake()->bothify('?????')),
            'montant_total' => $montantTotal,
            'montant_caution' => $montantCaution,
            'montant_loyer' => $montantLoyer,
            'commission_pourcentage' => $commissionPourcentage,
            'commission_montant' => $commissionMontant,
            'commission_due_date' => $statut === 'ESCROW' ? fake()->dateTimeBetween('+2 months', '+3 months') : null,
            'type_paiement' => $typePaiement,
            'mobile_money_reference' => in_array($typePaiement, ['ORANGE_MONEY', 'MTN_MOMO']) ? fake()->uuid() : null,
            'mobile_money_numero' => in_array($typePaiement, ['ORANGE_MONEY', 'MTN_MOMO']) ? '224' . fake()->numberBetween(600000000, 799999999) : null,
            'mobile_money_metadata' => in_array($typePaiement, ['ORANGE_MONEY', 'MTN_MOMO']) ? json_encode([
                'operator' => $typePaiement === 'ORANGE_MONEY' ? 'Orange' : 'MTN',
                'transaction_id' => fake()->uuid(),
                'user_agent' => fake()->userAgent(),
                'ip_address' => fake()->ipv4(),
                'device_type' => fake()->randomElement(['mobile', 'desktop']),
            ]) : null,
            'statut' => $statut,
            'escrow_started_at' => $escrowStarted,
            'escrow_released_at' => $escrowReleased,
            'escrow_duration_days' => $escrowDuration,
            'escrow_release_reason' => $escrowReleased ? fake()->randomElement(['Contract signed', 'Payment confirmed', 'Manual release']) : null,
            'jour_caution' => $statut === 'ESCROW' ? fake()->dateTimeBetween('-7 days', 'now')->format('Y-m-d') : null,
            'caution_confirmed_at' => $statut === 'COMPLETE' ? fake()->dateTimeBetween('-2 days', 'now') : null,
            'montant_verse_beneficiaire' => $statut === 'COMPLETE' ? $montantTotal - $commissionMontant : 0,
            'beneficiaire_payed_at' => $statut === 'COMPLETE' ? fake()->dateTimeBetween('-1 days', 'now') : null,
            'beneficiaire_receipt_url' => $statut === 'COMPLETE' ? fake()->url() : null,
            'frais_plateforme' => $commissionMontant,
            'frais_preleves_at' => $statut === 'COMPLETE' ? fake()->dateTimeBetween('-1 days', 'now') : null,
            'webhook_data' => $statut !== 'EN_ATTENTE' ? json_encode([
                'provider' => $typePaiement,
                'transaction_id' => fake()->uuid(),
                'amount' => $montantTotal,
                'status' => 'success',
                'timestamp' => now()->toISOString(),
            ]) : null,
            'webhook_received_at' => $statut !== 'EN_ATTENTE' ? fake()->dateTimeBetween('-5 days', 'now') : null,
            'verification_code' => $statut === 'EN_ATTENTE' ? str_pad(fake()->numberBetween(0, 999999), 6, '0', STR_PAD_LEFT) : null,
            'verified_at' => $statut !== 'EN_ATTENTE' ? fake()->dateTimeBetween('-5 days', 'now') : null,
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'montant_rembourse' => 0,
            'remboursement_initie_at' => null,
            'remboursement_complete_at' => null,
            'raison_remboursement' => null,
            'error_message' => $statut === 'ECHOUE' ? fake()->sentence() : null,
            'retry_count' => $statut === 'ECHOUE' ? fake()->numberBetween(1, 3) : 0,
            'last_retry_at' => $statut === 'ECHOUE' ? fake()->dateTimeBetween('-1 days', 'now') : null,
        ];
    }

    /**
     * Indicate that the payment is completed.
     */
    public function completed(): static
    {
        $escrowStarted = Carbon::instance(fake()->dateTimeBetween('-30 days', '-3 days'));
        $escrowReleased = $escrowStarted->copy()->addDays(2);

        return $this->state(fn (array $attributes) => [
            'statut' => 'COMPLETE',
            'escrow_started_at' => $escrowStarted,
            'escrow_released_at' => $escrowReleased,
            'escrow_duration_days' => $escrowStarted->diffInDays($escrowReleased),
            'escrow_release_reason' => 'Contract successfully completed',
            'jour_caution' => $escrowStarted->format('Y-m-d'),
            'caution_confirmed_at' => $escrowReleased,
            'montant_verse_beneficiaire' => $attributes['montant_total'] - $attributes['commission_montant'],
            'beneficiaire_payed_at' => $escrowReleased,
            'beneficiaire_receipt_url' => fake()->url(),
            'frais_preleves_at' => $escrowReleased,
            'commission_due_date' => $escrowStarted->copy()->addMonths(3)->format('Y-m-d'),
            'verified_at' => $escrowStarted,
            'webhook_received_at' => $escrowStarted,
        ]);
    }

    /**
     * Indicate that the payment is in escrow.
     */
    public function escrow(): static
    {
        $escrowStarted = Carbon::instance(fake()->dateTimeBetween('-7 days', 'now'));

        return $this->state(fn (array $attributes) => [
            'statut' => 'ESCROW',
            'escrow_started_at' => $escrowStarted,
            'escrow_released_at' => null,
            'escrow_duration_days' => null,
            'escrow_release_reason' => null,
            'jour_caution' => $escrowStarted->format('Y-m-d'),
            'caution_confirmed_at' => null,
            'montant_verse_beneficiaire' => 0,
            'beneficiaire_payed_at' => null,
            'beneficiaire_receipt_url' => null,
            'frais_preleves_at' => null,
            'commission_due_date' => $escrowStarted->copy()->addMonths(3)->format('Y-m-d'),
            'verified_at' => $escrowStarted,
            'webhook_received_at' => $escrowStarted,
        ]);
    }

    /**
     * Indicate that the payment is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'EN_ATTENTE',
            'escrow_started_at' => null,
            'escrow_released_at' => null,
            'escrow_duration_days' => null,
            'escrow_release_reason' => null,
            'jour_caution' => null,
            'caution_confirmed_at' => null,
            'montant_verse_beneficiaire' => 0,
            'beneficiaire_payed_at' => null,
            'beneficiaire_receipt_url' => null,
            'frais_preleves_at' => null,
            'commission_due_date' => null,
            'verified_at' => null,
            'webhook_received_at' => null,
            'verification_code' => str_pad(fake()->numberBetween(0, 999999), 6, '0', STR_PAD_LEFT),
            'retry_count' => 0,
            'last_retry_at' => null,
            'error_message' => null,
        ]);
    }

    /**
     * Indicate that the payment is via Orange Money.
     */
    public function orangeMoney(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_paiement' => 'ORANGE_MONEY',
            'mobile_money_reference' => fake()->uuid(),
            'mobile_money_numero' => '224' . fake()->numberBetween(620000000, 629999999),
            'mobile_money_metadata' => json_encode([
                'operator' => 'Orange',
                'transaction_id' => fake()->uuid(),
                'user_agent' => fake()->userAgent(),
                'ip_address' => fake()->ipv4(),
                'device_type' => 'mobile',
            ]),
        ]);
    }

    /**
     * Indicate that the payment is via MTN Mobile Money.
     */
    public function mtnMomo(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_paiement' => 'MTN_MOMO',
            'mobile_money_reference' => fake()->uuid(),
            'mobile_money_numero' => '224' . fake()->numberBetween(660000000, 669999999),
            'mobile_money_metadata' => json_encode([
                'operator' => 'MTN',
                'transaction_id' => fake()->uuid(),
                'user_agent' => fake()->userAgent(),
                'ip_address' => fake()->ipv4(),
                'device_type' => 'mobile',
            ]),
        ]);
    }

    /**
     * Indicate that the payment is via bank transfer.
     */
    public function bankTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_paiement' => 'VIREMENT',
            'mobile_money_reference' => null,
            'mobile_money_numero' => null,
            'mobile_money_metadata' => null,
        ]);
    }

    /**
     * Indicate that the payment is for rent only.
     */
    public function rentOnly(): static
    {
        $montantLoyer = fake()->numberBetween(1000000, 5000000);
        $commissionMontant = $montantLoyer * 0.5; // 50%

        return $this->state(fn (array $attributes) => [
            'montant_loyer' => $montantLoyer,
            'montant_caution' => 0,
            'montant_total' => $montantLoyer,
            'commission_montant' => $commissionMontant,
        ]);
    }

    /**
     * Indicate that the payment is for deposit only.
     */
    public function depositOnly(): static
    {
        $montantCaution = fake()->numberBetween(1000000, 10000000);
        $commissionMontant = $montantCaution * 0.5; // 50%

        return $this->state(fn (array $attributes) => [
            'montant_loyer' => 0,
            'montant_caution' => $montantCaution,
            'montant_total' => $montantCaution,
            'commission_montant' => $commissionMontant,
        ]);
    }

    /**
     * Indicate that the payment failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'ECHOUE',
            'escrow_started_at' => null,
            'escrow_released_at' => null,
            'escrow_duration_days' => null,
            'jour_caution' => null,
            'caution_confirmed_at' => null,
            'montant_verse_beneficiaire' => 0,
            'beneficiaire_payed_at' => null,
            'frais_preleves_at' => null,
            'verified_at' => null,
            'error_message' => fake()->sentence(),
            'retry_count' => fake()->numberBetween(1, 3),
            'last_retry_at' => now(),
        ]);
    }

    /**
     * Indicate that the payment is refunded.
     */
    public function refunded(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'REMBOURSE',
            'montant_rembourse' => $attributes['montant_total'],
            'remboursement_initie_at' => fake()->dateTimeBetween('-5 days', '-1 days'),
            'remboursement_complete_at' => now(),
            'raison_remboursement' => fake()->randomElement(['Contract cancelled', 'Tenant request', 'Double payment']),
        ]);
    }
}