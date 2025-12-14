<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Authentication (FR-001, FR-003)
            'telephone' => '224' . fake()->numberBetween(600000000, 799999999),
            'mot_de_passe' => static::$password ??= Hash::make('password'),
            'telephone_verified_at' => fake()->boolean(80) ? now() : null,

            // Profile information (FR-002)
            'nom_complet' => $this->faker->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => fake()->boolean(60) ? now() : null,
            'type_compte' => fake()->randomElement(['PARTICULIER', 'AGENCE', 'PROMOTEUR']),

            // For agencies/promoters
            'nom_entreprise' => fake()->boolean(30) ? fake()->company() : null,
            'numero_registre_commerce' => fake()->boolean(30) ? 'RC' . fake()->numberBetween(1000, 9999) : null,
            'adresse' => fake()->boolean(50) ? fake()->address() : null,

            // Badge system (FR-053)
            'badge' => fake()->randomElement(['BRONZE', 'ARGENT', 'OR', 'DIAMANT']),
            'badge_updated_at' => fake()->boolean(70) ? now() : null,

            // Statistics for badge calculation
            'total_transactions' => fake()->numberBetween(0, 100),
            'avg_rating' => fake()->randomFloat(2, 0, 5),
            'total_disputes' => fake()->numberBetween(0, 10),
            'disputes_resolved' => fake()->numberBetween(0, 10),

            // Verification status
            'statut_verification' => fake()->randomElement(['EN_ATTENTE', 'VERIFIE', 'REJETE']),
            'verified_at' => fake()->boolean(40) ? now() : null,

            // Account status
            'is_active' => fake()->boolean(90),
            'is_suspended' => fake()->boolean(5),
            'suspended_at' => fake()->boolean(5) ? now() : null,
            'suspension_reason' => fake()->boolean(5) ? fake()->sentence() : null,

            // Preferences (FR-061)
            'notification_preferences' => json_encode([
                'email' => fake()->boolean(70),
                'whatsapp' => fake()->boolean(80),
                'sms' => fake()->boolean(60),
                'telegram' => fake()->boolean(40),
            ]),
            'preferred_language' => fake()->randomElement(['fr', 'en']),

            // Last login
            'last_login_at' => fake()->boolean(70) ? now() : null,
        ];
    }

    /**
     * Indicate that the user is a verified particulier (proprietaire).
     */
    public function particulier(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_compte' => 'PARTICULIER',
            'telephone_verified_at' => now(),
            'email_verified_at' => now(),
            'statut_verification' => 'VERIFIE',
            'verified_at' => now(),
        ]);
    }

    /**
     * Alias for particulier (proprietaire)
     */
    public function proprietaire(): static
    {
        return $this->particulier();
    }

    /**
     * Indicate that the user is a chercheur (PARTICULIER).
     */
    public function chercheur(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_compte' => 'PARTICULIER',
            'badge' => 'BRONZE',
            'nom_entreprise' => null,
            'numero_registre_commerce' => null,
        ]);
    }

    /**
     * Indicate that the user is an agence.
     */
    public function agence(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_compte' => 'AGENCE',
            'badge' => fake()->randomElement(['OR', 'DIAMANT']),
            'nom_entreprise' => fake()->company(),
            'numero_registre_commerce' => 'RC' . fake()->numberBetween(1000, 9999),
            'adresse' => fake()->address(),
            'telephone_verified_at' => now(),
            'email_verified_at' => now(),
            'statut_verification' => 'VERIFIE',
            'verified_at' => now(),
        ]);
    }

    /**
     * Indicate that the user is a promoteur.
     */
    public function promoteur(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_compte' => 'PROMOTEUR',
            'badge' => fake()->randomElement(['ARGENT', 'OR', 'DIAMANT']),
            'nom_entreprise' => fake()->company(),
            'numero_registre_commerce' => 'RC' . fake()->numberBetween(1000, 9999),
            'adresse' => fake()->address(),
            'telephone_verified_at' => now(),
            'email_verified_at' => now(),
            'statut_verification' => 'VERIFIE',
            'verified_at' => now(),
        ]);
    }

    /**
     * Indicate that the user is fully verified.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'telephone_verified_at' => now(),
            'email_verified_at' => now(),
            'statut_verification' => 'VERIFIE',
            'verified_at' => now(),
        ]);
    }

    /**
     * Indicate that the user has premium badge.
     */
    public function premium(): static
    {
        return $this->state(fn (array $attributes) => [
            'badge' => fake()->randomElement(['OR', 'DIAMANT']),
            'badge_updated_at' => now(),
        ]);
    }

    /**
     * Indicate that the user is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspension_reason' => fake()->sentence(),
        ]);
    }

    /**
     * Indicate that the user is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}