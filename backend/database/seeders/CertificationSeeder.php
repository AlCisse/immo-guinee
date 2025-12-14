<?php

namespace Database\Seeders;

use App\Models\CertificationDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CertificationSeeder extends Seeder
{
    public function run(): void
    {
        // Get some users to link certifications
        $users = User::limit(5)->get();

        if ($users->isEmpty()) {
            $this->command->info('No users found, creating test user...');
            return;
        }

        $certifications = [
            [
                'user_id' => $users[0]->id ?? null,
                'type_document' => 'CNI',
                'numero_document' => 'CNI-2024-001234',
                'date_emission' => '2023-01-15',
                'date_expiration' => '2028-01-15',
                'fichier_url' => 'certifications/cni_mamadou_diallo.pdf',
                'fichier_hash' => hash('sha256', 'test_file_1'),
                'fichier_size' => 245000,
                'fichier_mime_type' => 'application/pdf',
                'statut_verification' => 'EN_ATTENTE',
            ],
            [
                'user_id' => $users[1]->id ?? $users[0]->id,
                'type_document' => 'TITRE_FONCIER',
                'numero_document' => 'TF-CONAKRY-2024-5678',
                'date_emission' => '2022-06-20',
                'date_expiration' => null,
                'fichier_url' => 'certifications/titre_foncier_camara.pdf',
                'fichier_hash' => hash('sha256', 'test_file_2'),
                'fichier_size' => 512000,
                'fichier_mime_type' => 'application/pdf',
                'statut_verification' => 'EN_ATTENTE',
            ],
            [
                'user_id' => $users[2]->id ?? $users[0]->id,
                'type_document' => 'CNI',
                'numero_document' => 'CNI-2023-009876',
                'date_emission' => '2021-03-10',
                'date_expiration' => '2026-03-10',
                'fichier_url' => 'certifications/cni_ibrahim_sow.jpg',
                'fichier_hash' => hash('sha256', 'test_file_3'),
                'fichier_size' => 180000,
                'fichier_mime_type' => 'image/jpeg',
                'statut_verification' => 'VERIFIE',
                'verified_at' => now(),
                'verification_notes' => 'Document valide, identite confirmee',
            ],
            [
                'user_id' => $users[3]->id ?? $users[0]->id,
                'type_document' => 'AUTRES',
                'numero_document' => 'REG-COMM-2024-1111',
                'date_emission' => '2024-01-01',
                'date_expiration' => '2025-01-01',
                'fichier_url' => 'certifications/registre_commerce_agence.pdf',
                'fichier_hash' => hash('sha256', 'test_file_4'),
                'fichier_size' => 320000,
                'fichier_mime_type' => 'application/pdf',
                'statut_verification' => 'REJETE',
                'raison_rejet' => 'Document illisible, veuillez fournir une copie plus claire',
            ],
            [
                'user_id' => $users[4]->id ?? $users[0]->id,
                'type_document' => 'TITRE_FONCIER',
                'numero_document' => 'TF-KINDIA-2023-3333',
                'date_emission' => '2020-08-15',
                'date_expiration' => null,
                'fichier_url' => 'certifications/titre_foncier_barry.pdf',
                'fichier_hash' => hash('sha256', 'test_file_5'),
                'fichier_size' => 456000,
                'fichier_mime_type' => 'application/pdf',
                'statut_verification' => 'EN_ATTENTE',
            ],
            [
                'user_id' => $users[0]->id ?? null,
                'type_document' => 'TITRE_FONCIER',
                'numero_document' => 'TF-CONAKRY-2024-9999',
                'date_emission' => '2024-02-28',
                'date_expiration' => null,
                'fichier_url' => 'certifications/titre_foncier_diallo_2.pdf',
                'fichier_hash' => hash('sha256', 'test_file_6'),
                'fichier_size' => 389000,
                'fichier_mime_type' => 'application/pdf',
                'statut_verification' => 'EN_ATTENTE',
            ],
        ];

        foreach ($certifications as $cert) {
            if ($cert['user_id']) {
                CertificationDocument::create($cert);
            }
        }

        $this->command->info('Created ' . count($certifications) . ' certification documents');
    }
}
