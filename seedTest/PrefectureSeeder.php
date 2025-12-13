<?php

namespace Database\Seeders;

use App\Models\Prefecture;
use App\Models\Region;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PrefectureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();
        $prefectures = [
            ['name' => 'Conakry', 'code' => 'CKY-01-01', 'region_code' => '01', 'region_id' => '01'],

            ['name' => 'Coyah', 'code' => 'CYA-02-01', 'region_code' => '02', 'region_id' => '02'],
            ['name' => 'Dubréka', 'code' => 'DBK-02-02', 'region_code' => '02', 'region_id' => '02'],
            ['name' => 'Forécariah', 'code' => 'FRC-02-03', 'region_code' => '02', 'region_id' => '02'],
            ['name' => 'Kindia', 'code' => 'KDA-02-04', 'region_code' => '02', 'region_id' => '02'],
            ['name' => 'Télimelé', 'code' => 'TML-02-05', 'region_code' => '02', 'region_id' => '02'],

            ['name' => 'Boffa', 'code' => 'BFA-03-01', 'region_code' => '03', 'region_id' => '03'],
            ['name' => 'Boké', 'code' => 'BKE-03-02', 'region_code' => '03', 'region_id' => '03'],
            ['name' => 'Fria', 'code' => 'FRI-03-03', 'region_code' => '03', 'region_id' => '03'],
            ['name' => 'Gaoual', 'code' => 'GAL-03-04', 'region_code' => '03', 'region_id' => '03'],
            ['name' => 'Koundara', 'code' => 'KDR-03-05', 'region_code' => '03', 'region_id' => '03'],

            ['name' => 'Dalaba', 'code' => 'DLB-04-01', 'region_code' => '04', 'region_id' => '04'],
            ['name' => 'Mamou', 'code' => 'MMU-04-02', 'region_code' => '04', 'region_id' => '04'],
            ['name' => 'Pita', 'code' => 'PTA-04-03', 'region_code' => '04', 'region_id' => '04'],

            ['name' => 'Koubia', 'code' => 'KBA-05-01', 'region_code' => '05', 'region_id' => '05'],
            ['name' => 'Labé', 'code' => 'LBE-05-02', 'region_code' => '05', 'region_id' => '05'],
            ['name' => 'Lélouma', 'code' => 'LLM-05-03', 'region_code' => '05', 'region_id' => '05'],
            ['name' => 'Mali', 'code' => 'MLI-05-04', 'region_code' => '05', 'region_id' => '05'],
            ['name' => 'Tougué', 'code' => 'TGE-05-05', 'region_code' => '05', 'region_id' => '05'],

            ['name' => 'Dabola', 'code' => 'DBL-06-01', 'region_code' => '06', 'region_id' => '06'],
            ['name' => 'Dinguiraye', 'code' => 'DGR-06-02', 'region_code' => '06', 'region_id' => '06'],
            ['name' => 'Faranah', 'code' => 'FRN-06-03', 'region_code' => '06', 'region_id' => '06'],
            ['name' => 'Kissidougou', 'code' => 'KDG-06-04', 'region_code' => '06', 'region_id' => '06'],

            ['name' => 'Kankan', 'code' => 'KKA-07-01', 'region_code' => '07', 'region_id' => '07'],
            ['name' => 'Kérouané', 'code' => 'KRN-07-02', 'region_code' => '07', 'region_id' => '07'],
            ['name' => 'Kouroussa', 'code' => 'KRS-07-03', 'region_code' => '07', 'region_id' => '07'],
            ['name' => 'Mandiana', 'code' => 'MDN-07-04', 'region_code' => '07', 'region_id' => '07'],
            ['name' => 'Siguiri', 'code' => 'SGR-07-05', 'region_code' => '07', 'region_id' => '07'],

            ['name' => 'Beyla', 'code' => 'BLA-08-01', 'region_code' => '08', 'region_id' => '08'],
            ['name' => 'Guéckedou', 'code' => 'GKD-08-02', 'region_code' => '08', 'region_id' => '08'],
            ['name' => 'Lola', 'code' => 'LLA-08-03', 'region_code' => '08', 'region_id' => '08'],
            ['name' => 'Macenta', 'code' => 'MCT-08-04', 'region_code' => '08', 'region_id' => '08'],
            ['name' => 'Nzérékoré', 'code' => 'ZKR-08-05', 'region_code' => '08', 'region_id' => '08'],
            ['name' => 'Yomou', 'code' => 'YMU-08-06', 'region_code' => '08', 'region_id' => '08']
        ];


        // Récupération des régions en une seule requête
        $codesRegion = collect($prefectures)->pluck('region_code')->unique()->toArray();
        $regions = Region::whereIn('code', $codesRegion)->get()->keyBy('code');

        $maintenant = Carbon::now();
        $donneesPrefectures = [];
        $compteur = 0;

        foreach ($prefectures as $prefecture) {
            if (!isset($regions[$prefecture['region_code']])) {
                $this->command->error("Région {$prefecture['region_code']} introuvable pour {$prefecture['nom']}");
                continue;
            }

            $donneesPrefectures[] = [
                'code' => $prefecture['code'],
                'name' => $prefecture['name'],
                'region_id' => $regions[$prefecture['region_code']]->id,
                'created_at' => $maintenant,
                'updated_at' => $maintenant
            ];
            $compteur++;
        }

        try {
            // Utilisation de insertOrIgnore pour éviter les doublons
            $resultat = Prefecture::insertOrIgnore($donneesPrefectures);

            // Affichage du nombre réel d'insertions
            $this->command->info("$compteur préfectures traitées (" . count($donneesPrefectures) . " insérées)");
        } catch (\Exception $e) {
            $this->command->error("Erreur : " . $e->getMessage());
        }
    }
    /*
    DB::table('prefectures')->updateOrInsert(
        ['code' => $prefecture['code']],
        [
            'name' => $prefecture['name'],
            'region_code' => $prefecture['region_code'],
            'created_at' => $now,
            'updated_at' => $now
        ]
    );*/
}
