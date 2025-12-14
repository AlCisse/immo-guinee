<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Listing;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivityLogSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::limit(5)->get();
        $listings = Listing::limit(5)->get();
        $admin = User::whereHas('roles', fn($q) => $q->where('name', 'admin'))->first();

        $activities = [
            // User activities
            [
                'log_name' => 'user',
                'description' => 'User logged in',
                'subject_type' => User::class,
                'subject_id' => $users[0]->id ?? null,
                'event' => 'login',
                'causer_type' => User::class,
                'causer_id' => $users[0]->id ?? null,
                'properties' => json_encode(['ip' => '192.168.1.100', 'user_agent' => 'Mozilla/5.0']),
            ],
            [
                'log_name' => 'user',
                'description' => 'User updated profile',
                'subject_type' => User::class,
                'subject_id' => $users[1]->id ?? null,
                'event' => 'updated',
                'causer_type' => User::class,
                'causer_id' => $users[1]->id ?? null,
                'properties' => json_encode(['old' => ['nom_complet' => 'Ancien Nom'], 'new' => ['nom_complet' => 'Nouveau Nom']]),
            ],
            // Listing activities
            [
                'log_name' => 'listing',
                'description' => 'Listing created',
                'subject_type' => Listing::class,
                'subject_id' => $listings[0]->id ?? null,
                'event' => 'created',
                'causer_type' => User::class,
                'causer_id' => $users[0]->id ?? null,
                'properties' => json_encode(['titre' => $listings[0]->titre ?? 'Nouvelle annonce']),
            ],
            [
                'log_name' => 'listing',
                'description' => 'Listing approved',
                'subject_type' => Listing::class,
                'subject_id' => $listings[1]->id ?? null,
                'event' => 'approved',
                'causer_type' => User::class,
                'causer_id' => $admin->id ?? null,
                'properties' => json_encode(['status' => 'ACTIVE']),
            ],
            [
                'log_name' => 'listing',
                'description' => 'Listing suspended',
                'subject_type' => Listing::class,
                'subject_id' => $listings[2]->id ?? null,
                'event' => 'suspended',
                'causer_type' => User::class,
                'causer_id' => $admin->id ?? null,
                'properties' => json_encode(['reason' => 'Contenu inapproprié']),
            ],
            // Admin activities
            [
                'log_name' => 'admin',
                'description' => 'User role changed',
                'subject_type' => User::class,
                'subject_id' => $users[2]->id ?? null,
                'event' => 'role_changed',
                'causer_type' => User::class,
                'causer_id' => $admin->id ?? null,
                'properties' => json_encode(['old_role' => 'user', 'new_role' => 'moderator']),
            ],
            [
                'log_name' => 'admin',
                'description' => 'User suspended',
                'subject_type' => User::class,
                'subject_id' => $users[3]->id ?? null,
                'event' => 'suspended',
                'causer_type' => User::class,
                'causer_id' => $admin->id ?? null,
                'properties' => json_encode(['reason' => 'Violation des conditions', 'duration' => '7 jours']),
            ],
            [
                'log_name' => 'system',
                'description' => 'Database backup completed',
                'subject_type' => null,
                'subject_id' => null,
                'event' => 'backup',
                'causer_type' => null,
                'causer_id' => null,
                'properties' => json_encode(['size' => '256MB', 'duration' => '45s']),
            ],
            [
                'log_name' => 'payment',
                'description' => 'Payment received',
                'subject_type' => User::class,
                'subject_id' => $users[0]->id ?? null,
                'event' => 'payment_received',
                'causer_type' => User::class,
                'causer_id' => $users[0]->id ?? null,
                'properties' => json_encode(['amount' => 500000, 'currency' => 'GNF', 'method' => 'Orange Money']),
            ],
            [
                'log_name' => 'certification',
                'description' => 'Certification approved',
                'subject_type' => User::class,
                'subject_id' => $users[1]->id ?? null,
                'event' => 'certification_approved',
                'causer_type' => User::class,
                'causer_id' => $admin->id ?? null,
                'properties' => json_encode(['document_type' => 'CNI']),
            ],
        ];

        foreach ($activities as $index => $activity) {
            DB::table('activity_log')->insert([
                'id' => Str::uuid(),
                'log_name' => $activity['log_name'],
                'description' => $activity['description'],
                'subject_type' => $activity['subject_type'],
                'subject_id' => $activity['subject_id'],
                'event' => $activity['event'],
                'causer_type' => $activity['causer_type'],
                'causer_id' => $activity['causer_id'],
                'properties' => $activity['properties'],
                'batch_uuid' => null,
                'created_at' => now()->subMinutes(rand(1, 60 * 24 * 7)),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Created ' . count($activities) . ' activity log entries');
    }
}
