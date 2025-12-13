<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RegionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $regions = [
            ['nom' => 'Conakry', 'code' => '01'],
            ['nom' => 'Kindia', 'code' => '02'],
            ['nom' => 'Boké', 'code' => '03'],
            ['nom' => 'Mamou', 'code' => '04'],
            ['nom' => 'Labé', 'code' => '05'],
            ['nom' => 'Faranah', 'code' => '06'],
            ['nom' => 'Kankan', 'code' => '07'],
            ['nom' => 'Nzérékoré', 'code' => '08'],
        ];

        foreach ($regions as $region) {
            DB::table('regions')->insert([
                'nom' => $region['nom'],
                'code' => $region['code'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
