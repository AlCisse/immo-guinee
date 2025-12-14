<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Listing;
use App\Models\Contract;
use App\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed Guinea locations first
        $this->call(GuineaLocationsSeeder::class);

        // Create roles
        $this->createRoles();

        // Create admin user
        $admin = $this->createAdminUser();

        // Create moderator user
        $moderator = $this->createModeratorUser();

        // Create test users
        $proprietaires = $this->createProprietaires();
        $chercheurs = $this->createChercheurs();
        $agences = $this->createAgences();

        // Create listings for proprietaires
        $listings = $this->createListings($proprietaires);

        // Create some contracts
        $this->createContracts($listings, $chercheurs);

        $this->command->info('Database seeded successfully!');
        $this->command->info('');
        $this->command->info('Admin credentials:');
        $this->command->info('  Téléphone: 224620000000');
        $this->command->info('  Mot de passe: admin123');
        $this->command->info('');
        $this->command->info('Moderator credentials:');
        $this->command->info('  Téléphone: 224620000001');
        $this->command->info('  Mot de passe: moderator123');
    }

    /**
     * Create roles and permissions
     */
    protected function createRoles(): void
    {
        $this->command->info('Creating roles and permissions...');

        // Create roles
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        $mediatorRole = Role::firstOrCreate(['name' => 'mediator']);
        $proprietaireRole = Role::firstOrCreate(['name' => 'proprietaire']);
        $chercheurRole = Role::firstOrCreate(['name' => 'chercheur']);
        $agenceRole = Role::firstOrCreate(['name' => 'agence']);

        // Create permissions
        $permissions = [
            'manage_users',
            'manage_roles',
            'manage_listings',
            'manage_contracts',
            'manage_payments',
            'manage_certifications',
            'view_analytics',
            'moderate_content',
            'moderate_listings',
            'moderate_ratings',
            'resolve_disputes',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Assign all permissions to admin
        $adminRole->syncPermissions(Permission::all());

        // Assign moderation permissions to moderator
        $moderatorRole->syncPermissions([
            'moderate_content',
            'moderate_listings',
            'moderate_ratings',
            'view_analytics',
        ]);

        // Assign dispute resolution permissions to mediator
        $mediatorRole->syncPermissions([
            'resolve_disputes',
            'view_analytics',
        ]);
    }

    /**
     * Create admin user
     */
    protected function createAdminUser(): User
    {
        $this->command->info('Creating admin user...');

        $admin = User::firstOrCreate(
            ['telephone' => '224620000000'],
            [
                'nom_complet' => 'Admin ImmoGuinée',
                'email' => 'admin@immoguinee.com',
                'mot_de_passe' => Hash::make('admin123'),
                'type_compte' => 'AGENCE',
                'badge' => 'DIAMANT',
                'statut_verification' => 'VERIFIE',
                'telephone_verified_at' => now(),
                'email_verified_at' => now(),
                'verified_at' => now(),
                'is_active' => true,
                'nom_entreprise' => 'ImmoGuinée',
                'numero_registre_commerce' => 'RC001',
                'adresse' => 'Kaloum, Conakry',
                'preferred_language' => 'fr',
                'notification_preferences' => json_encode([
                    'email' => true,
                    'whatsapp' => true,
                    'sms' => true,
                    'telegram' => false,
                ]),
            ]
        );

        $admin->assignRole('admin');

        return $admin;
    }

    /**
     * Create moderator user
     */
    protected function createModeratorUser(): User
    {
        $this->command->info('Creating moderator user...');

        $moderator = User::firstOrCreate(
            ['telephone' => '224620000001'],
            [
                'nom_complet' => 'Modérateur ImmoGuinée',
                'email' => 'moderator@immoguinee.com',
                'mot_de_passe' => Hash::make('moderator123'),
                'type_compte' => 'PARTICULIER',
                'badge' => 'OR',
                'statut_verification' => 'VERIFIE',
                'telephone_verified_at' => now(),
                'email_verified_at' => now(),
                'verified_at' => now(),
                'is_active' => true,
                'adresse' => 'Kaloum, Conakry',
                'preferred_language' => 'fr',
                'notification_preferences' => json_encode([
                    'email' => true,
                    'whatsapp' => true,
                    'sms' => true,
                    'telegram' => false,
                ]),
            ]
        );

        $moderator->assignRole('moderator');

        return $moderator;
    }

    /**
     * Create proprietaire test users
     */
    protected function createProprietaires(): array
    {
        $this->command->info('Creating proprietaire users...');

        $proprietaires = [];

        // Create verified proprietaire
        $proprietaires[] = User::factory()->particulier()->create([
            'nom_complet' => 'Mamadou Diallo',
            'telephone' => '224621111111',
            'email' => 'mamadou.diallo@example.gn',
            'mot_de_passe' => Hash::make('password'),
            'badge' => 'ARGENT',
            'adresse' => 'Kaloum, Boulbinet, Conakry',
        ]);

        $proprietaires[] = User::factory()->particulier()->create([
            'nom_complet' => 'Fatoumata Camara',
            'telephone' => '224622222222',
            'email' => 'fatoumata.camara@example.gn',
            'mot_de_passe' => Hash::make('password'),
            'badge' => 'OR',
            'adresse' => 'Ratoma, Kipé, Conakry',
        ]);

        $proprietaires[] = User::factory()->particulier()->create([
            'nom_complet' => 'Ibrahima Bah',
            'telephone' => '224623333333',
            'email' => 'ibrahima.bah@example.gn',
            'mot_de_passe' => Hash::make('password'),
            'badge' => 'BRONZE',
            'adresse' => 'Matam, Hamdallaye, Conakry',
        ]);

        // Create more random proprietaires
        $randomProprietaires = User::factory()
            ->particulier()
            ->count(7)
            ->create();

        foreach ($randomProprietaires as $proprietaire) {
            $proprietaires[] = $proprietaire;
            $proprietaire->assignRole('proprietaire');
        }

        // Assign role to all proprietaires
        foreach ($proprietaires as $proprietaire) {
            $proprietaire->assignRole('proprietaire');
        }

        return $proprietaires;
    }

    /**
     * Create chercheur test users
     */
    protected function createChercheurs(): array
    {
        $this->command->info('Creating chercheur users...');

        $chercheurs = [];

        // Create test chercheur
        $chercheurs[] = User::factory()->chercheur()->create([
            'nom_complet' => 'Aissatou Sow',
            'telephone' => '224624444444',
            'email' => 'aissatou.sow@example.gn',
            'mot_de_passe' => Hash::make('password'),
            'adresse' => 'Dixinn, Dixinn Centre, Conakry',
        ]);

        // Create more random chercheurs
        $randomChercheurs = User::factory()
            ->chercheur()
            ->count(14)
            ->create();

        foreach ($randomChercheurs as $chercheur) {
            $chercheurs[] = $chercheur;
            $chercheur->assignRole('chercheur');
        }

        // Assign role to all chercheurs
        foreach ($chercheurs as $chercheur) {
            $chercheur->assignRole('chercheur');
        }

        return $chercheurs;
    }

    /**
     * Create agence test users
     */
    protected function createAgences(): array
    {
        $this->command->info('Creating agence users...');

        $agences = [];

        // Create test agence
        $agences[] = User::factory()->agence()->create([
            'nom_complet' => 'ImmoPlus Guinée',
            'telephone' => '224625555555',
            'email' => 'contact@immoplus.gn',
            'mot_de_passe' => Hash::make('password'),
            'nom_entreprise' => 'ImmoPlus Guinée SARL',
            'numero_registre_commerce' => 'RC7890',
            'adresse' => 'Kaloum, Almamya, Conakry',
            'badge' => 'DIAMANT',
        ]);

        // Create more random agences
        $randomAgences = User::factory()
            ->agence()
            ->count(4)
            ->create();

        foreach ($randomAgences as $agence) {
            $agences[] = $agence;
            $agence->assignRole('agence');
        }

        // Assign role to all agences
        foreach ($agences as $agence) {
            $agence->assignRole('agence');
        }

        return $agences;
    }

    /**
     * Create listings
     */
    protected function createListings(array $proprietaires): array
    {
        $this->command->info('Creating listings...');

        $listings = [];

        foreach ($proprietaires as $proprietaire) {
            // Each proprietaire creates 1-3 listings
            $count = rand(1, 3);

            for ($i = 0; $i < $count; $i++) {
                $listings[] = Listing::factory()->active()->create([
                    'user_id' => $proprietaire->id,
                ]);
            }
        }

        $this->command->info('Created ' . count($listings) . ' listings');

        return $listings;
    }

    /**
     * Create contracts
     */
    protected function createContracts(array $listings, array $chercheurs): void
    {
        $this->command->info('Creating contracts...');

        $contractCount = 0;

        // Create contracts for some listings
        foreach (array_slice($listings, 0, min(5, count($listings))) as $listing) {
            $chercheur = $chercheurs[array_rand($chercheurs)];

            $contract = Contract::factory()->active()->create([
                'listing_id' => $listing->id,
                'bailleur_id' => $listing->user_id, // ✅ Utilise user_id (bailleur_id)
                'locataire_id' => $chercheur->id,
            ]);

            // Create payment for the contract
            Payment::factory()->completed()->create([
                'contract_id' => $contract->id,
                'payeur_id' => $chercheur->id,
                'beneficiaire_id' => $listing->user_id,
            ]);

            $contractCount++;
        }

        // Create some pending contracts
        foreach (array_slice($listings, 5, min(3, count($listings) - 5)) as $listing) {
            $chercheur = $chercheurs[array_rand($chercheurs)];

            Contract::factory()->pendingTenant()->create([
                'listing_id' => $listing->id,
                'bailleur_id' => $listing->user_id,
                'locataire_id' => $chercheur->id,
            ]);

            $contractCount++;
        }

        $this->command->info('Created ' . $contractCount . ' contracts');
    }
}
