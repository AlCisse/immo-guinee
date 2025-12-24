<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class ResetAdminCommand extends Command
{
    protected $signature = 'admin:reset {--phone= : Phone number for new admin} {--password= : Password for new admin}';
    protected $description = 'Remove all existing admins and create a new one';

    public function handle(): int
    {
        $phone = $this->option('phone') ?? '224664043115';
        $password = $this->option('password') ?? '***REDACTED***';

        $this->info('Removing existing admin users...');

        // Get all users with admin role
        $adminRole = Role::where('name', 'admin')->first();

        if ($adminRole) {
            $admins = User::role('admin')->get();
            $count = $admins->count();

            foreach ($admins as $admin) {
                $this->warn("Removing admin: {$admin->nom_complet} ({$admin->telephone})");
                // Remove admin role first
                $admin->removeRole('admin');
                // Optionally soft-delete the user
                // $admin->delete();
            }

            $this->info("Removed admin role from {$count} user(s).");
        }

        // Create new admin
        $this->info('Creating new admin user...');

        // Normalize phone number
        $normalizedPhone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($normalizedPhone) === 9 && in_array($normalizedPhone[0], ['6', '7'])) {
            $normalizedPhone = '224' . $normalizedPhone;
        }

        $admin = User::updateOrCreate(
            ['telephone' => $normalizedPhone],
            [
                'nom_complet' => 'Admin ImmoGuinée',
                'email' => 'admin@immoguinee.com',
                'mot_de_passe' => Hash::make($password),
                'type_compte' => 'AGENCE',
                'badge' => 'DIAMANT',
                'statut_verification' => 'VERIFIE',
                'telephone_verified_at' => now(),
                'email_verified_at' => now(),
                'verified_at' => now(),
                'is_active' => true,
                'nom_entreprise' => 'ImmoGuinée',
                'numero_registre_commerce' => 'RC001',
                'adresse' => 'Conakry, Guinée',
                'preferred_language' => 'fr',
                'notification_preferences' => [
                    'email' => true,
                    'whatsapp' => true,
                    'sms' => true,
                    'telegram' => false,
                ],
            ]
        );

        // Assign admin role
        if (!$admin->hasRole('admin')) {
            $admin->assignRole('admin');
        }

        // Disable 2FA for fresh start
        $admin->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $this->newLine();
        $this->info('========================================');
        $this->info('NEW ADMIN CREATED SUCCESSFULLY');
        $this->info('========================================');
        $this->table(
            ['Field', 'Value'],
            [
                ['Téléphone', $normalizedPhone],
                ['Email', 'admin@immoguinee.com'],
                ['Mot de passe', $password],
            ]
        );
        $this->newLine();
        $this->warn('IMPORTANT: Changez le mot de passe après la première connexion!');
        $this->info('Pour changer le mot de passe:');
        $this->info('  1. Connectez-vous au dashboard admin');
        $this->info('  2. Allez dans Paramètres > Profil ou /admin/settings');
        $this->info('  3. Section "Sécurité" > Changer le mot de passe');
        $this->newLine();

        return Command::SUCCESS;
    }
}
