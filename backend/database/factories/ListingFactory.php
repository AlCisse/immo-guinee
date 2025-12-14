<?php

namespace Database\Factories;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Listing>
 */
class ListingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Valeurs probables basées sur les contraintes PostgreSQL
        $typesBien = ['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'TERRAIN', 'COMMERCIAL'];
        $communes = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'];

        $quartiers = [
            'Kaloum' => ['Almamya', 'Boulbinet', 'Coronthie', 'Sandervalia', 'Tombo'],
            'Dixinn' => ['Dixinn Centre', 'Dixinn Port', 'Dixinn Mosquée', 'Cameroun', 'Landréah'],
            'Matam' => ['Matam Centre', 'Madina', 'Hamdallaye', 'Teminetaye', 'Belle-Vue'],
            'Ratoma' => ['Ratoma Centre', 'Kipé', 'Dar-es-Salam', 'Sonfonia', 'Kaporo'],
            'Matoto' => ['Matoto Centre', 'Yimbaya', 'Cosa', 'Sangoyah', 'Kobaya'],
        ];

        $commodites = ['climatisation', 'chauffage', 'piscine', 'jardin', 'garage', 'balcon', 'terrasse', 'ascenseur', 'gardien', 'eau_courante', 'electricite', 'wifi'];

        $typeBien = fake()->randomElement($typesBien);
        $commune = fake()->randomElement($communes);
        $quartier = fake()->randomElement($quartiers[$commune]);

        // Generate realistic prices based on property type
        $loyerMensuel = match($typeBien) {
            'STUDIO' => fake()->numberBetween(800000, 2000000),
            'APPARTEMENT' => fake()->numberBetween(1500000, 5000000),
            'MAISON' => fake()->numberBetween(3000000, 8000000),
            'VILLA' => fake()->numberBetween(5000000, 20000000),
            'COMMERCIAL' => fake()->numberBetween(2000000, 10000000),
            'TERRAIN' => fake()->numberBetween(1000000, 5000000),
            default => fake()->numberBetween(1000000, 5000000),
        };

        $titre = $this->generateTitle($typeBien, $quartier);

        return [
            'user_id' => User::factory(),
            'titre' => $titre,
            'slug' => Str::slug($titre) . '-' . Str::random(6),
            'description' => fake()->paragraphs(3, true),
            'type_bien' => $typeBien,
            'quartier' => $quartier,
            'commune' => $commune,
            'adresse_complete' => fake()->streetAddress() . ', ' . $quartier . ', ' . $commune . ', Conakry',
            'loyer_mensuel' => $loyerMensuel,
            'caution' => $loyerMensuel * fake()->numberBetween(1, 3),
            'surface_m2' => $typeBien !== 'TERRAIN' ? fake()->numberBetween(30, 300) : fake()->numberBetween(100, 5000),
            'nombre_chambres' => in_array($typeBien, ['APPARTEMENT', 'MAISON', 'VILLA']) ? fake()->numberBetween(1, 6) : 0,
            'nombre_salles_bain' => in_array($typeBien, ['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO']) ? fake()->numberBetween(1, 3) : 0,
            'meuble' => in_array($typeBien, ['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO']) ? fake()->boolean(40) : false,
            'commodites' => json_encode(fake()->randomElements($commodites, fake()->numberBetween(3, 8))),
            'photos' => json_encode($this->generatePhotos($typeBien)),
            'photo_principale' => fake()->imageUrl(800, 600, 'house', true),
            'statut' => 'ACTIVE',
            'disponible' => true,
            'date_disponibilite' => fake()->dateTimeBetween('now', '+3 months'),
            'vues_count' => fake()->numberBetween(0, 1000),
            'favoris_count' => fake()->numberBetween(0, 50),
            'contacts_count' => fake()->numberBetween(0, 30),
            'publie_at' => now(),
            'expire_at' => now()->addDays(30),
        ];
    }

    /**
     * Generate realistic title for listing
     */
    protected function generateTitle(string $type, string $quartier): string
    {
        $prefixes = [
            'Magnifique',
            'Superbe',
            'Belle',
            'Spacieux',
            'Moderne',
            'Élégante',
            'Charmante',
            'Lumineux',
            'Confortable',
            'Exceptionnel',
        ];

        $typeLabel = match($type) {
            'APPARTEMENT' => 'Appartement',
            'MAISON' => 'Maison',
            'VILLA' => 'Villa',
            'STUDIO' => 'Studio',
            'TERRAIN' => 'Terrain',
            'COMMERCIAL' => 'Local Commercial',
            default => 'Propriété',
        };

        return fake()->randomElement($prefixes) . ' ' . $typeLabel . ' à louer à ' . $quartier;
    }

    /**
     * Generate photo URLs
     */
    protected function generatePhotos(string $type): array
    {
        $count = fake()->numberBetween(3, 10);
        $photos = [];

        // Different image categories based on property type
        $categories = match($type) {
            'APPARTEMENT', 'MAISON', 'VILLA' => ['house', 'interior', 'kitchen', 'bedroom', 'bathroom', 'livingroom'],
            'STUDIO' => ['apartment', 'interior', 'bedroom', 'kitchen'],
            'TERRAIN' => ['land', 'garden', 'construction', 'property'],
            'COMMERCIAL' => ['office', 'building', 'workspace', 'store', 'shop'],
            default => ['house', 'building', 'property'],
        };

        for ($i = 0; $i < $count; $i++) {
            $category = fake()->randomElement($categories);
            $photos[] = fake()->imageUrl(800, 600, $category, true, $type . ' ' . $category);
        }

        return $photos;
    }

    /**
     * Indicate that the listing is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'ACTIVE',
            'disponible' => true,
            'publie_at' => now(),
            'expire_at' => now()->addDays(30),
        ]);
    }

    /**
     * Indicate that the listing is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'INACTIVE',
            'disponible' => false,
        ]);
    }

    /**
     * Indicate that the listing is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => 'EXPIRED',
            'expire_at' => now()->subDays(rand(1, 30)),
        ]);
    }

    /**
     * Indicate that the listing is furnished.
     */
    public function furnished(): static
    {
        return $this->state(fn (array $attributes) => [
            'meuble' => true,
            'loyer_mensuel' => $attributes['loyer_mensuel'] * 1.1,
        ]);
    }

    /**
     * Indicate that the listing is an apartment.
     */
    public function apartment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'APPARTEMENT',
            'nombre_chambres' => fake()->numberBetween(1, 3),
            'nombre_salles_bain' => fake()->numberBetween(1, 2),
            'surface_m2' => fake()->numberBetween(40, 120),
            'loyer_mensuel' => fake()->numberBetween(1500000, 4000000),
        ]);
    }

    /**
     * Indicate that the listing is a house.
     */
    public function house(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'MAISON',
            'nombre_chambres' => fake()->numberBetween(2, 5),
            'nombre_salles_bain' => fake()->numberBetween(2, 4),
            'surface_m2' => fake()->numberBetween(80, 250),
            'loyer_mensuel' => fake()->numberBetween(3000000, 8000000),
        ]);
    }

    /**
     * Indicate that the listing is a villa.
     */
    public function villa(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'VILLA',
            'nombre_chambres' => fake()->numberBetween(3, 6),
            'nombre_salles_bain' => fake()->numberBetween(3, 5),
            'surface_m2' => fake()->numberBetween(150, 400),
            'loyer_mensuel' => fake()->numberBetween(5000000, 20000000),
        ]);
    }

    /**
     * Indicate that the listing is a studio.
     */
    public function studio(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'STUDIO',
            'nombre_chambres' => 1,
            'nombre_salles_bain' => 1,
            'surface_m2' => fake()->numberBetween(20, 40),
            'loyer_mensuel' => fake()->numberBetween(800000, 1500000),
        ]);
    }

    /**
     * Indicate that the listing is commercial.
     */
    public function commercial(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'COMMERCIAL',
            'nombre_chambres' => 0,
            'nombre_salles_bain' => fake()->numberBetween(1, 2),
            'surface_m2' => fake()->numberBetween(50, 300),
            'loyer_mensuel' => fake()->numberBetween(2000000, 10000000),
        ]);
    }

    /**
     * Indicate that the listing is land.
     */
    public function land(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_bien' => 'TERRAIN',
            'nombre_chambres' => 0,
            'nombre_salles_bain' => 0,
            'surface_m2' => fake()->numberBetween(100, 5000),
            'loyer_mensuel' => fake()->numberBetween(1000000, 5000000),
            'meuble' => false,
        ]);
    }
}