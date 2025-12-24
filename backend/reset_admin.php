<?php
/**
 * Script to reset admin user
 * Run with: php artisan tinker < reset_admin.php
 * Or copy-paste into: php artisan tinker
 */

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

echo "=== RESETTING ADMIN ===\n\n";

// Remove admin role from all existing admins
$admins = User::role('admin')->get();
echo "Found " . $admins->count() . " existing admin(s)\n";

foreach ($admins as $admin) {
    echo "Removing admin role from: {$admin->nom_complet} ({$admin->telephone})\n";
    $admin->removeRole('admin');
}

// New admin credentials
$phone = '224664043115';
$password = 'ImmoG@2024!Secure';

echo "\nCreating new admin...\n";

$admin = User::updateOrCreate(
    ['telephone' => $phone],
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
        'two_factor_secret' => null,
        'two_factor_recovery_codes' => null,
        'two_factor_confirmed_at' => null,
    ]
);

$admin->assignRole('admin');

echo "\n========================================\n";
echo "NEW ADMIN CREATED SUCCESSFULLY\n";
echo "========================================\n";
echo "Téléphone: {$phone}\n";
echo "Email: admin@immoguinee.com\n";
echo "Mot de passe: {$password}\n";
echo "========================================\n\n";
echo "IMPORTANT: Changez le mot de passe dans /admin/settings\n";
