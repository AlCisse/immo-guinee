<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RegionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Region::create([
            'nom' => 'Conakry',
            'code_region' => 'GN-C',
            'population' => 1667864,
            'description' => 'Capitale économique'
        ]);

        Region::create([
            'nom' => 'Kindia',
            'code_region' => 'GN-KD',
            'population' => 554299,
            'description' => 'Région agricole'
        ]);
    }
}
