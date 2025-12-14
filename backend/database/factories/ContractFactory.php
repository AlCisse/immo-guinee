<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Contract>
 */
class ContractFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $dateDebut = fake()->dateTimeBetween('now', '+30 days');
        $dureeMois = fake()->numberBetween(6, 24);
        $dateFin = (clone $dateDebut)->modify("+{$dureeMois} months");

        $loyerMensuel = fake()->numberBetween(1000000, 5000000);
        $caution = $loyerMensuel * fake()->numberBetween(1, 3);

        return [
            'listing_id' => Listing::factory(),
            'bailleur_id' => User::factory()->particulier(), // ✅ Utilise particuler au lieu de proprietaire
            'locataire_id' => User::factory()->chercheur(),
            'numero_contrat' => 'CTR-' . strtoupper(fake()->bothify('????####')),
            'loyer_mensuel' => $loyerMensuel,
            'caution' => $caution,
            'duree_mois' => $dureeMois,
            'date_debut' => $dateDebut,
            'date_fin' => $dateFin,
            'clauses_specifiques' => fake()->optional()->sentences(3, true),
            'termes_standards' => $this->generateTermesStandards(),
            'statut' => 'BROUILLON',
            'pdf_url' => fake()->optional()->url(),
            'pdf_hash' => fake()->optional()->sha256(),
            'bailleur_signed_at' => null,
            'locataire_signed_at' => null,
            'bailleur_signature_otp' => null,
            'locataire_signature_otp' => null,
            'bailleur_signature_ip' => null,
            'locataire_signature_ip' => null,
            'bailleur_signature_data' => null,
            'locataire_signature_data' => null,
            'cachet_electronique' => null,
            'cachet_applied_at' => null,
            'is_locked' => false,
            'locked_at' => null,
            'blockchain_hash' => null,
            'is_archived' => false,
            'archived_at' => null,
            'scheduled_deletion_at' => null,
            'initial_payment_id' => null,
        ];
    }

    /**
     * Generate standard terms for contract
     */
    protected function generateTermesStandards(): array
    {
        return [
            'Le locataire s\'engage à payer le loyer mensuellement avant le 5 de chaque mois.',
            'Le locataire s\'engage à entretenir le logement et à le restituer en bon état.',
            'Le propriétaire s\'engage à assurer la jouissance paisible du bien.',
            'Toute modification du bien doit être approuvée par le propriétaire.',
            'Un préavis de 3 mois est requis pour la résiliation du contrat.',
        ];
    }

    /**
     * Indicate that the contract is signed by both parties.
     */
    public function signed(): static
    {
        $now = now();
        return $this->state(fn (array $attributes) => [
            'statut' => 'SIGNE',
            'bailleur_signed_at' => $now->copy()->subHours(2),
            'locataire_signed_at' => $now,
            'bailleur_signature_ip' => fake()->ipv4(),
            'locataire_signature_ip' => fake()->ipv4(),
            'bailleur_signature_data' => json_encode([
                'method' => 'OTP_SMS',
                'timestamp' => now()->toIso8601String(),
                'device' => 'Mobile',
            ]),
            'locataire_signature_data' => json_encode([
                'method' => 'OTP_SMS', 
                'timestamp' => now()->toIso8601String(),
                'device' => 'Mobile',
            ]),
        ]);
    }

    /**
     * Indicate that the contract is active.
     */
    public function active(): static
    {
        $dateDebut = now()->subDays(30);
        $dateFin = now()->addDays(300);
        
        return $this->state(fn (array $attributes) => [
            'statut' => 'ACTIF',
            'date_debut' => $dateDebut,
            'date_fin' => $dateFin,
            'is_locked' => true,
            'locked_at' => now()->subDays(29),
            'bailleur_signed_at' => now()->subDays(30),
            'locataire_signed_at' => now()->subDays(30),
            'cachet_applied_at' => now()->subDays(29),
            'cachet_electronique' => fake()->sha256(),
        ]);
    }

    /**
     * Indicate that the contract is pending tenant signature.
     */
    public function pendingTenant(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'EN_ATTENTE_SIGNATURE_LOCATAIRE',
            'bailleur_signed_at' => now()->subDays(1),
            'bailleur_signature_ip' => fake()->ipv4(),
        ]);
    }

    /**
     * Indicate that the contract is pending landlord signature.
     */
    public function pendingLandlord(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'EN_ATTENTE_SIGNATURE_BAILLEUR', 
            'locataire_signed_at' => now()->subDays(1),
            'locataire_signature_ip' => fake()->ipv4(),
        ]);
    }

    /**
     * Indicate that the contract is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'TERMINE',
            'date_fin' => now()->subDays(30),
            'is_locked' => true,
            'is_archived' => true,
            'archived_at' => now()->subDays(29),
        ]);
    }
}