<?php

namespace Database\Seeders;

use App\Models\Commission;
use Illuminate\Database\Seeder;

class CommissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $commissions = [
            [
                'type_transaction' => 'location',
                'label' => 'Location longue duree',
                'taux_pourcentage' => 0,
                'mois' => 1,
                'description' => 'Commission de 1 mois de loyer pour les locations longue duree',
                'is_active' => true,
            ],
            [
                'type_transaction' => 'location_courte',
                'label' => 'Location courte duree',
                'taux_pourcentage' => 10,
                'mois' => 0,
                'description' => 'Commission de 10% du montant total pour les locations courte duree',
                'is_active' => true,
            ],
            [
                'type_transaction' => 'vente',
                'label' => 'Vente immobiliere',
                'taux_pourcentage' => 3,
                'mois' => 0,
                'description' => 'Commission de 3% du prix de vente',
                'is_active' => true,
            ],
        ];

        foreach ($commissions as $commission) {
            Commission::updateOrCreate(
                ['type_transaction' => $commission['type_transaction']],
                $commission
            );
        }
    }
}
