<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GuineaLocationsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds all Guinea administrative divisions: Regions > Prefectures > Communes > Sous-Prefectures (Quartiers)
     */
    public function run(): void
    {
        // Clear existing data
        DB::table('sous_prefectures')->delete();
        DB::table('communes')->delete();
        DB::table('prefectures')->delete();
        DB::table('regions')->delete();

        $now = now();

        // The 5 communes of Conakry
        $communesConakry = [
            ['code' => 'CKY-DIXINN', 'nom' => 'Dixinn'],
            ['code' => 'CKY-KALOUM', 'nom' => 'Kaloum'],
            ['code' => 'CKY-MATAM', 'nom' => 'Matam'],
            ['code' => 'CKY-RATOMA', 'nom' => 'Ratoma'],
            ['code' => 'CKY-MATOTO', 'nom' => 'Matoto'],
        ];

        // Quartiers by commune in Conakry
        $quartiersByCommune = [
            'Dixinn' => [
                ['code' => 'CKY-01-01', 'nom' => 'Belle-vue école'],
                ['code' => 'CKY-01-02', 'nom' => 'Belle-vue-marché'],
                ['code' => 'CKY-01-03', 'nom' => 'Camayenne'],
                ['code' => 'CKY-01-04', 'nom' => 'Cameroun'],
                ['code' => 'CKY-01-05', 'nom' => 'Dixinn-cité 1'],
                ['code' => 'CKY-01-06', 'nom' => 'Dixinn-cité 2'],
                ['code' => 'CKY-01-07', 'nom' => 'Dixinn-gare'],
                ['code' => 'CKY-01-08', 'nom' => 'Dixinn-gare-rails'],
                ['code' => 'CKY-01-09', 'nom' => 'Dixinn-mosquée'],
                ['code' => 'CKY-01-10', 'nom' => 'Dixinn-port'],
                ['code' => 'CKY-01-11', 'nom' => 'Hafia 1'],
                ['code' => 'CKY-01-12', 'nom' => 'Hafia 2'],
                ['code' => 'CKY-01-13', 'nom' => 'Hafia-minière'],
                ['code' => 'CKY-01-14', 'nom' => 'Hafia-mosquée'],
                ['code' => 'CKY-01-15', 'nom' => 'Kénien'],
                ['code' => 'CKY-01-16', 'nom' => 'Landréah'],
                ['code' => 'CKY-01-17', 'nom' => 'Minière-cité'],
            ],
            'Kaloum' => [
                ['code' => 'CKY-01-18', 'nom' => 'Almamya'],
                ['code' => 'CKY-01-19', 'nom' => 'Boulbinet'],
                ['code' => 'CKY-01-20', 'nom' => 'Coronthie'],
                ['code' => 'CKY-01-21', 'nom' => 'Sandervalia'],
                ['code' => 'CKY-01-22', 'nom' => 'Tombo'],
                ['code' => 'CKY-01-23', 'nom' => 'Manquepas'],
                ['code' => 'CKY-01-24', 'nom' => 'Sans-Fil'],
            ],
            'Matam' => [
                ['code' => 'CKY-01-35', 'nom' => 'Matam-Centre'],
                ['code' => 'CKY-01-36', 'nom' => 'Madina'],
                ['code' => 'CKY-01-37', 'nom' => 'Hamdallaye'],
                ['code' => 'CKY-01-38', 'nom' => 'Teminetaye'],
                ['code' => 'CKY-01-39', 'nom' => 'Bonfie'],
                ['code' => 'CKY-01-40', 'nom' => 'Coléah'],
                ['code' => 'CKY-01-41', 'nom' => 'Hermakono'],
                ['code' => 'CKY-01-42', 'nom' => 'Lanséboudyi'],
            ],
            'Ratoma' => [
                ['code' => 'RTM-01-01', 'nom' => 'Taouyah'],
                ['code' => 'RTM-01-02', 'nom' => 'Kipé'],
                ['code' => 'RTM-01-03', 'nom' => 'Kipé 2'],
                ['code' => 'RTM-01-04', 'nom' => 'Nongo'],
                ['code' => 'RTM-01-05', 'nom' => 'Dar-es-salam'],
                ['code' => 'RTM-01-06', 'nom' => 'Hamdalaye 1'],
                ['code' => 'RTM-01-07', 'nom' => 'Hamdalaye 2'],
                ['code' => 'RTM-01-08', 'nom' => 'Hamdalaye-mosquée'],
                ['code' => 'RTM-01-09', 'nom' => 'Kaporo-centre'],
                ['code' => 'RTM-01-10', 'nom' => 'Kaporo-rails'],
                ['code' => 'RTM-01-11', 'nom' => 'Koloma 1'],
                ['code' => 'RTM-01-12', 'nom' => 'Koloma 2'],
                ['code' => 'RTM-01-13', 'nom' => 'Ratoma-centre'],
                ['code' => 'RTM-01-14', 'nom' => 'Ratoma-dispensaire'],
                ['code' => 'RTM-01-15', 'nom' => 'Demoudoula'],
                ['code' => 'RTM-01-16', 'nom' => 'Bomboli'],
                ['code' => 'RTM-01-17', 'nom' => 'Simanbossia'],
                ['code' => 'RTM-01-18', 'nom' => 'Dadiya'],
                ['code' => 'RTM-01-19', 'nom' => 'Kakimbo'],
                ['code' => 'RTM-01-20', 'nom' => 'Soloprimo'],
                ['code' => 'RTM-01-21', 'nom' => 'Sonfonia'],
                ['code' => 'RTM-01-22', 'nom' => 'Lambanyi'],
                ['code' => 'RTM-01-23', 'nom' => 'Kobaya'],
            ],
            'Matoto' => [
                ['code' => 'MTT-01-01', 'nom' => 'Béanzin'],
                ['code' => 'MTT-01-02', 'nom' => 'Camp Alpha Yaya Diallo'],
                ['code' => 'MTT-01-03', 'nom' => 'Dabompa'],
                ['code' => 'MTT-01-04', 'nom' => 'Dabondy 1'],
                ['code' => 'MTT-01-05', 'nom' => 'Dabondy 2'],
                ['code' => 'MTT-01-06', 'nom' => 'Dabondy 3'],
                ['code' => 'MTT-01-07', 'nom' => 'Dabondy école'],
                ['code' => 'MTT-01-08', 'nom' => 'Dabondy-rails'],
                ['code' => 'MTT-01-09', 'nom' => 'Dar-es-salam'],
                ['code' => 'MTT-01-10', 'nom' => 'Kissosso'],
                ['code' => 'MTT-01-11', 'nom' => 'Matoto-centre'],
                ['code' => 'MTT-01-12', 'nom' => 'Matoto-marché'],
                ['code' => 'MTT-01-13', 'nom' => 'Matoto-Khabitayah'],
                ['code' => 'MTT-01-14', 'nom' => 'Sangoya-mosquée'],
                ['code' => 'MTT-01-15', 'nom' => 'Simbaya 1'],
                ['code' => 'MTT-01-16', 'nom' => 'Simbaya 2'],
                ['code' => 'MTT-01-17', 'nom' => 'Tanéné-marché'],
                ['code' => 'MTT-01-18', 'nom' => 'Tanéné-mosquée'],
                ['code' => 'MTT-01-19', 'nom' => 'Yimbaya-école'],
                ['code' => 'MTT-01-20', 'nom' => 'Yimbaya-permanence'],
                ['code' => 'MTT-01-21', 'nom' => 'Yimbaya-tannerie'],
                ['code' => 'MTT-01-22', 'nom' => 'Cosa'],
                ['code' => 'MTT-01-23', 'nom' => 'Enta'],
                ['code' => 'MTT-01-24', 'nom' => 'Gbessia'],
            ],
        ];

        // All regions of Guinea
        $regions = [
            [
                'code' => '01',
                'nom' => 'Conakry',
                'prefectures' => [
                    [
                        'code' => 'CKY-01-01',
                        'nom' => 'Conakry',
                        'sousPrefectures' => [], // Will be handled via communes
                    ],
                ],
            ],
            [
                'code' => '02',
                'nom' => 'Kindia',
                'prefectures' => [
                    [
                        'code' => 'CYA-02-01',
                        'nom' => 'Coyah',
                        'sousPrefectures' => [
                            ['code' => 'CYA-02-01', 'nom' => 'Coyah-Centre'],
                            ['code' => 'CYA-02-02', 'nom' => 'Kouriah'],
                            ['code' => 'CYA-02-03', 'nom' => 'Manéah'],
                            ['code' => 'CYA-02-04', 'nom' => 'Wonkifong'],
                        ],
                    ],
                    [
                        'code' => 'DBK-02-02',
                        'nom' => 'Dubréka',
                        'sousPrefectures' => [
                            ['code' => 'DBK-02-01', 'nom' => 'Badi'],
                            ['code' => 'DBK-02-02', 'nom' => 'Dubréka-Centre'],
                            ['code' => 'DBK-02-03', 'nom' => 'Faléssadé'],
                            ['code' => 'DBK-02-04', 'nom' => 'Khorira'],
                            ['code' => 'DBK-02-05', 'nom' => 'Ouassou'],
                            ['code' => 'DBK-02-06', 'nom' => 'Tanènè'],
                            ['code' => 'DBK-02-07', 'nom' => 'Tondon'],
                        ],
                    ],
                    [
                        'code' => 'FRC-02-03',
                        'nom' => 'Forécariah',
                        'sousPrefectures' => [
                            ['code' => 'FRC-02-01', 'nom' => 'Alassoyah'],
                            ['code' => 'FRC-02-02', 'nom' => 'Benty'],
                            ['code' => 'FRC-02-03', 'nom' => 'Farmoriyah'],
                            ['code' => 'FRC-02-04', 'nom' => 'Forécariah-Centre'],
                            ['code' => 'FRC-02-05', 'nom' => 'Kaback'],
                            ['code' => 'FRC-02-06', 'nom' => 'Kakossa'],
                            ['code' => 'FRC-02-07', 'nom' => 'Kallia'],
                            ['code' => 'FRC-02-08', 'nom' => 'Maferenya'],
                            ['code' => 'FRC-02-09', 'nom' => 'Moussayah'],
                            ['code' => 'FRC-02-10', 'nom' => 'Sikhourou'],
                        ],
                    ],
                    [
                        'code' => 'KDA-02-04',
                        'nom' => 'Kindia',
                        'sousPrefectures' => [
                            ['code' => 'KDA-02-01', 'nom' => 'Bangouya'],
                            ['code' => 'KDA-02-02', 'nom' => 'Damankaniah'],
                            ['code' => 'KDA-02-03', 'nom' => 'Friguiagbé'],
                            ['code' => 'KDA-02-04', 'nom' => 'Kindia-Centre'],
                            ['code' => 'KDA-02-05', 'nom' => 'Kolenté'],
                            ['code' => 'KDA-02-06', 'nom' => 'Madina-Oula'],
                            ['code' => 'KDA-02-07', 'nom' => 'Mambiya'],
                            ['code' => 'KDA-02-08', 'nom' => 'Molota'],
                            ['code' => 'KDA-02-09', 'nom' => 'Samaya'],
                            ['code' => 'KDA-02-10', 'nom' => 'Souguéta'],
                            ['code' => 'KDA-02-11', 'nom' => 'Linsan'],
                        ],
                    ],
                    [
                        'code' => 'TML-02-05',
                        'nom' => 'Télimelé',
                        'sousPrefectures' => [
                            ['code' => 'TLM-02-01', 'nom' => 'Bourouwal'],
                            ['code' => 'TLM-02-02', 'nom' => 'Daramagnaki'],
                            ['code' => 'TLM-02-03', 'nom' => 'Gougoudjé'],
                            ['code' => 'TLM-02-04', 'nom' => 'Koba'],
                            ['code' => 'TLM-02-05', 'nom' => 'Kollet'],
                            ['code' => 'TLM-02-06', 'nom' => 'Konsotami'],
                            ['code' => 'TLM-02-07', 'nom' => 'Missira'],
                            ['code' => 'TLM-02-08', 'nom' => 'Santou'],
                            ['code' => 'TLM-02-09', 'nom' => 'Sarékali'],
                            ['code' => 'TLM-02-10', 'nom' => 'Sinta'],
                            ['code' => 'TLM-02-11', 'nom' => 'Sogolon'],
                            ['code' => 'TLM-02-12', 'nom' => 'Tarihoye'],
                            ['code' => 'TLM-02-13', 'nom' => 'Télimelé-Centre'],
                            ['code' => 'TLM-02-14', 'nom' => 'Thionthian'],
                            ['code' => 'TLM-02-15', 'nom' => 'Kawessi'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '03',
                'nom' => 'Boké',
                'prefectures' => [
                    [
                        'code' => 'BFA-03-01',
                        'nom' => 'Boffa',
                        'sousPrefectures' => [
                            ['code' => 'BFA-03-01', 'nom' => 'Boffa-Centre'],
                            ['code' => 'BFA-03-02', 'nom' => 'Colia'],
                            ['code' => 'BFA-03-03', 'nom' => 'Douprou'],
                            ['code' => 'BFA-03-04', 'nom' => 'Koba-Tatema'],
                            ['code' => 'BFA-03-05', 'nom' => 'Lisso'],
                            ['code' => 'BFA-03-06', 'nom' => 'Mankountan'],
                            ['code' => 'BFA-03-07', 'nom' => 'Tamita'],
                            ['code' => 'BFA-03-08', 'nom' => 'Tougnifily'],
                        ],
                    ],
                    [
                        'code' => 'BKE-03-02',
                        'nom' => 'Boké',
                        'sousPrefectures' => [
                            ['code' => 'BKE-03-01', 'nom' => 'Bintimodia'],
                            ['code' => 'BKE-03-02', 'nom' => 'Boké-Centre'],
                            ['code' => 'BKE-03-03', 'nom' => 'Dabiss'],
                            ['code' => 'BKE-03-04', 'nom' => 'Kamsar'],
                            ['code' => 'BKE-03-05', 'nom' => 'Kanfarandé'],
                            ['code' => 'BKE-03-06', 'nom' => 'Kolaboui'],
                            ['code' => 'BKE-03-07', 'nom' => 'Malapouyah'],
                            ['code' => 'BKE-03-08', 'nom' => 'Sangarédi'],
                            ['code' => 'BKE-03-09', 'nom' => 'Sansalé'],
                            ['code' => 'BKE-03-10', 'nom' => 'Tanènè'],
                        ],
                    ],
                    [
                        'code' => 'FRI-03-03',
                        'nom' => 'Fria',
                        'sousPrefectures' => [
                            ['code' => 'FRI-03-01', 'nom' => 'Banguinet'],
                            ['code' => 'FRI-03-02', 'nom' => 'Banguingny'],
                            ['code' => 'FRI-03-03', 'nom' => 'Fria-Centre'],
                            ['code' => 'FRI-03-04', 'nom' => 'Tormelin'],
                        ],
                    ],
                    [
                        'code' => 'GAL-03-04',
                        'nom' => 'Gaoual',
                        'sousPrefectures' => [
                            ['code' => 'GAL-03-01', 'nom' => 'Foulamory'],
                            ['code' => 'GAL-03-02', 'nom' => 'Gaoual-Centre'],
                            ['code' => 'GAL-03-03', 'nom' => 'Kakony'],
                            ['code' => 'GAL-03-04', 'nom' => 'Koumbia'],
                            ['code' => 'GAL-03-05', 'nom' => 'Kounsitel'],
                            ['code' => 'GAL-03-06', 'nom' => 'Malanta'],
                            ['code' => 'GAL-03-07', 'nom' => 'Touba'],
                            ['code' => 'GAL-03-08', 'nom' => "Wendou M'Bour"],
                        ],
                    ],
                    [
                        'code' => 'KDR-03-05',
                        'nom' => 'Koundara',
                        'sousPrefectures' => [
                            ['code' => 'KDR-03-01', 'nom' => 'Guingan'],
                            ['code' => 'KDR-03-02', 'nom' => 'Kamaby'],
                            ['code' => 'KDR-03-03', 'nom' => 'Koundara-Centre'],
                            ['code' => 'KDR-03-04', 'nom' => 'Sambaïlo'],
                            ['code' => 'KDR-03-05', 'nom' => 'Saréboïdo'],
                            ['code' => 'KDR-03-06', 'nom' => 'Termessé'],
                            ['code' => 'KDR-03-07', 'nom' => 'Youkounkoun'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '04',
                'nom' => 'Mamou',
                'prefectures' => [
                    [
                        'code' => 'DLB-04-01',
                        'nom' => 'Dalaba',
                        'sousPrefectures' => [
                            ['code' => 'DLB-04-01', 'nom' => 'Bodié'],
                            ['code' => 'DLB-04-02', 'nom' => 'Dalaba-Centre'],
                            ['code' => 'DLB-04-03', 'nom' => 'Ditinn'],
                            ['code' => 'DLB-04-04', 'nom' => 'Kaala'],
                            ['code' => 'DLB-04-05', 'nom' => 'Kankalabé'],
                            ['code' => 'DLB-04-06', 'nom' => 'Kébali'],
                            ['code' => 'DLB-04-07', 'nom' => 'Koba'],
                            ['code' => 'DLB-04-08', 'nom' => 'Mafara'],
                            ['code' => 'DLB-04-09', 'nom' => 'Mitty'],
                            ['code' => 'DLB-04-10', 'nom' => 'Mombéyah'],
                        ],
                    ],
                    [
                        'code' => 'MMU-04-02',
                        'nom' => 'Mamou',
                        'sousPrefectures' => [
                            ['code' => 'MMU-04-01', 'nom' => 'Bouliwel'],
                            ['code' => 'MMU-04-02', 'nom' => 'Dounet'],
                            ['code' => 'MMU-04-03', 'nom' => 'Gongorèt'],
                            ['code' => 'MMU-04-04', 'nom' => 'Kégnéko'],
                            ['code' => 'MMU-04-05', 'nom' => 'Konkouré'],
                            ['code' => 'MMU-04-06', 'nom' => 'Mamou-Centre'],
                            ['code' => 'MMU-04-07', 'nom' => 'Nyagara'],
                            ['code' => 'MMU-04-08', 'nom' => 'Ouré-Kaba'],
                            ['code' => 'MMU-04-09', 'nom' => 'Porédaka'],
                            ['code' => 'MMU-04-10', 'nom' => 'Saramoussayah'],
                            ['code' => 'MMU-04-11', 'nom' => 'Soyah'],
                            ['code' => 'MMU-04-12', 'nom' => 'Téguéréya'],
                            ['code' => 'MMU-04-13', 'nom' => 'Timbo'],
                            ['code' => 'MMU-04-14', 'nom' => 'Tolo'],
                        ],
                    ],
                    [
                        'code' => 'PTA-04-03',
                        'nom' => 'Pita',
                        'sousPrefectures' => [
                            ['code' => 'PTA-04-01', 'nom' => 'Bantignel'],
                            ['code' => 'PTA-04-02', 'nom' => 'Bourouwal-Tappé'],
                            ['code' => 'PTA-04-03', 'nom' => 'Donghol-Touma'],
                            ['code' => 'PTA-04-04', 'nom' => 'Gongorè'],
                            ['code' => 'PTA-04-05', 'nom' => 'Ley-Miro'],
                            ['code' => 'PTA-04-06', 'nom' => 'Maci'],
                            ['code' => 'PTA-04-07', 'nom' => 'Ninguélandé'],
                            ['code' => 'PTA-04-08', 'nom' => 'Pita-Centre'],
                            ['code' => 'PTA-04-09', 'nom' => 'Sangaréyah'],
                            ['code' => 'PTA-04-10', 'nom' => 'Sintali'],
                            ['code' => 'PTA-04-11', 'nom' => 'Timbi Madina'],
                            ['code' => 'PTA-04-12', 'nom' => 'Timbi-Touny'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '05',
                'nom' => 'Labé',
                'prefectures' => [
                    [
                        'code' => 'KBA-05-01',
                        'nom' => 'Koubia',
                        'sousPrefectures' => [
                            ['code' => 'KBA-05-01', 'nom' => 'Fafaya'],
                            ['code' => 'KBA-05-02', 'nom' => 'Gadha-Woundou'],
                            ['code' => 'KBA-05-03', 'nom' => 'Koubia-Centre'],
                            ['code' => 'KBA-05-04', 'nom' => 'Matakaou'],
                            ['code' => 'KBA-05-05', 'nom' => 'Missira'],
                            ['code' => 'KBA-05-06', 'nom' => 'Pilimini'],
                        ],
                    ],
                    [
                        'code' => 'LBE-05-02',
                        'nom' => 'Labé',
                        'sousPrefectures' => [
                            ['code' => 'LBE-05-01', 'nom' => 'Dalein'],
                            ['code' => 'LBE-05-02', 'nom' => 'Daralabe'],
                            ['code' => 'LBE-05-03', 'nom' => 'Diari'],
                            ['code' => 'LBE-05-04', 'nom' => 'Dionfo'],
                            ['code' => 'LBE-05-05', 'nom' => 'Garambé'],
                            ['code' => 'LBE-05-06', 'nom' => 'Hafia'],
                            ['code' => 'LBE-05-07', 'nom' => 'Kaalan'],
                            ['code' => 'LBE-05-08', 'nom' => 'Kouramandji'],
                            ['code' => 'LBE-05-09', 'nom' => 'Labé-Centre'],
                            ['code' => 'LBE-05-10', 'nom' => 'Noussy'],
                            ['code' => 'LBE-05-11', 'nom' => 'Popodara'],
                            ['code' => 'LBE-05-12', 'nom' => 'Sannoun'],
                            ['code' => 'LBE-05-13', 'nom' => 'Tountouroun'],
                            ['code' => 'LBE-05-14', 'nom' => 'Tarambaly'],
                        ],
                    ],
                    [
                        'code' => 'LLM-05-03',
                        'nom' => 'Lélouma',
                        'sousPrefectures' => [
                            ['code' => 'LLM-05-01', 'nom' => 'Balaya'],
                            ['code' => 'LLM-05-02', 'nom' => 'Djountou'],
                            ['code' => 'LLM-05-03', 'nom' => 'Hérico'],
                            ['code' => 'LLM-05-04', 'nom' => 'Korbè'],
                            ['code' => 'LLM-05-05', 'nom' => 'Lafou'],
                            ['code' => 'LLM-05-06', 'nom' => 'Lélouma-Centre'],
                            ['code' => 'LLM-05-07', 'nom' => 'Linsan'],
                            ['code' => 'LLM-05-08', 'nom' => 'Manda'],
                            ['code' => 'LLM-05-09', 'nom' => 'Parawol'],
                            ['code' => 'LLM-05-10', 'nom' => 'Sagalé'],
                            ['code' => 'LLM-05-11', 'nom' => 'Tyanguel-Bori'],
                        ],
                    ],
                    [
                        'code' => 'MLI-05-04',
                        'nom' => 'Mali',
                        'sousPrefectures' => [
                            ['code' => 'MLI-05-01', 'nom' => 'Balaki'],
                            ['code' => 'MLI-05-02', 'nom' => 'Donghol Sigon'],
                            ['code' => 'MLI-05-03', 'nom' => 'Dougountouny'],
                            ['code' => 'MLI-05-04', 'nom' => 'Fougou'],
                            ['code' => 'MLI-05-05', 'nom' => 'Gayah'],
                            ['code' => 'MLI-05-06', 'nom' => 'Hidayatou'],
                            ['code' => 'MLI-05-07', 'nom' => 'Lébékéré'],
                            ['code' => 'MLI-05-08', 'nom' => 'Madina Wora'],
                            ['code' => 'MLI-05-09', 'nom' => 'Mali-Centre'],
                            ['code' => 'MLI-05-10', 'nom' => 'Madina-Salambandé'],
                            ['code' => 'MLI-05-11', 'nom' => 'Téliré'],
                            ['code' => 'MLI-05-12', 'nom' => 'Touba'],
                            ['code' => 'MLI-05-13', 'nom' => 'Yembereng'],
                            ['code' => 'MLI-05-14', 'nom' => 'Badougoula'],
                        ],
                    ],
                    [
                        'code' => 'TGE-05-05',
                        'nom' => 'Tougué',
                        'sousPrefectures' => [
                            ['code' => 'TGE-05-01', 'nom' => 'Fatako'],
                            ['code' => 'TGE-05-02', 'nom' => 'Fello Koundoua'],
                            ['code' => 'TGE-05-03', 'nom' => 'Kansangui'],
                            ['code' => 'TGE-05-04', 'nom' => 'Kolangui'],
                            ['code' => 'TGE-05-05', 'nom' => 'Kollet'],
                            ['code' => 'TGE-05-06', 'nom' => 'Konah'],
                            ['code' => 'TGE-05-07', 'nom' => 'Kouratongo'],
                            ['code' => 'TGE-05-08', 'nom' => 'Koïn'],
                            ['code' => 'TGE-05-09', 'nom' => 'Tangali'],
                            ['code' => 'TGE-05-10', 'nom' => 'Tougué-Centre'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '06',
                'nom' => 'Faranah',
                'prefectures' => [
                    [
                        'code' => 'DBL-06-01',
                        'nom' => 'Dabola',
                        'sousPrefectures' => [
                            ['code' => 'DBL-06-01', 'nom' => 'Dabola-Centre'],
                            ['code' => 'DBL-06-02', 'nom' => 'Arfamoussaya'],
                            ['code' => 'DBL-06-03', 'nom' => 'Banko'],
                            ['code' => 'DBL-06-04', 'nom' => 'Bissikrima'],
                            ['code' => 'DBL-06-05', 'nom' => 'Dogomet'],
                            ['code' => 'DBL-06-06', 'nom' => 'Kankama'],
                            ['code' => 'DBL-06-07', 'nom' => 'Kindoye'],
                            ['code' => 'DBL-06-08', 'nom' => 'Konendou'],
                            ['code' => 'DBL-06-09', 'nom' => 'Ndéma'],
                            ['code' => 'DBL-06-10', 'nom' => 'Bantoun'],
                            ['code' => 'DBL-06-11', 'nom' => 'Dantilia'],
                            ['code' => 'DBL-06-12', 'nom' => 'Bambaya'],
                        ],
                    ],
                    [
                        'code' => 'DGR-06-02',
                        'nom' => 'Dinguiraye',
                        'sousPrefectures' => [
                            ['code' => 'DGR-06-01', 'nom' => 'Banora'],
                            ['code' => 'DGR-06-02', 'nom' => 'Dialakoro'],
                            ['code' => 'DGR-06-03', 'nom' => 'Diatifèrè'],
                            ['code' => 'DGR-06-04', 'nom' => 'Dinguiraye-Centre'],
                            ['code' => 'DGR-06-05', 'nom' => 'Gagnakaly'],
                            ['code' => 'DGR-06-06', 'nom' => 'Kalinko'],
                            ['code' => 'DGR-06-07', 'nom' => 'Lansanaya'],
                            ['code' => 'DGR-06-08', 'nom' => 'Sélouma'],
                        ],
                    ],
                    [
                        'code' => 'FRN-06-03',
                        'nom' => 'Faranah',
                        'sousPrefectures' => [
                            ['code' => 'FRN-06-01', 'nom' => 'Banian'],
                            ['code' => 'FRN-06-02', 'nom' => 'Beindou'],
                            ['code' => 'FRN-06-03', 'nom' => 'Faranah-Centre'],
                            ['code' => 'FRN-06-04', 'nom' => 'Gnaléah'],
                            ['code' => 'FRN-06-05', 'nom' => 'Hérémakonon'],
                            ['code' => 'FRN-06-06', 'nom' => 'Kobikoro'],
                            ['code' => 'FRN-06-07', 'nom' => 'Marela'],
                            ['code' => 'FRN-06-08', 'nom' => 'Passaya'],
                            ['code' => 'FRN-06-09', 'nom' => 'Sandéniyah'],
                            ['code' => 'FRN-06-10', 'nom' => 'Songoyah'],
                            ['code' => 'FRN-06-11', 'nom' => 'Tiro'],
                            ['code' => 'FRN-06-12', 'nom' => 'Tindo'],
                        ],
                    ],
                    [
                        'code' => 'KDG-06-04',
                        'nom' => 'Kissidougou',
                        'sousPrefectures' => [
                            ['code' => 'KDG-06-01', 'nom' => 'Albadariah'],
                            ['code' => 'KDG-06-02', 'nom' => 'Banama'],
                            ['code' => 'KDG-06-03', 'nom' => 'Bardou'],
                            ['code' => 'KDG-06-04', 'nom' => 'Beindou'],
                            ['code' => 'KDG-06-05', 'nom' => 'Fermessadou-Pombo'],
                            ['code' => 'KDG-06-06', 'nom' => 'Firawa-Yomadou'],
                            ['code' => 'KDG-06-07', 'nom' => 'Gbangbadou'],
                            ['code' => 'KDG-06-08', 'nom' => 'Kissidougou-Centre'],
                            ['code' => 'KDG-06-09', 'nom' => 'Koundiatou'],
                            ['code' => 'KDG-06-10', 'nom' => 'Manfran'],
                            ['code' => 'KDG-06-11', 'nom' => 'Sangardo'],
                            ['code' => 'KDG-06-12', 'nom' => 'Yendé-Millimou'],
                            ['code' => 'KDG-06-13', 'nom' => 'Yombiro'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '07',
                'nom' => 'Kankan',
                'prefectures' => [
                    [
                        'code' => 'KKA-07-01',
                        'nom' => 'Kankan',
                        'sousPrefectures' => [
                            ['code' => 'KKA-07-01', 'nom' => 'Balandougou'],
                            ['code' => 'KKA-07-02', 'nom' => 'Baté-Nafadji'],
                            ['code' => 'KKA-07-03', 'nom' => 'Boula'],
                            ['code' => 'KKA-07-04', 'nom' => 'Gbérédou-Baranama'],
                            ['code' => 'KKA-07-05', 'nom' => 'Kanfamoriya'],
                            ['code' => 'KKA-07-06', 'nom' => 'Kankan-Centre'],
                            ['code' => 'KKA-07-07', 'nom' => 'Koumba'],
                            ['code' => 'KKA-07-08', 'nom' => 'Mamouroudou'],
                            ['code' => 'KKA-07-09', 'nom' => 'Misamana'],
                            ['code' => 'KKA-07-10', 'nom' => 'Moribayah'],
                            ['code' => 'KKA-07-11', 'nom' => 'Sabadou-Baranama'],
                            ['code' => 'KKA-07-12', 'nom' => 'Tinti-Oulen'],
                            ['code' => 'KKA-07-13', 'nom' => 'Tokounou'],
                            ['code' => 'KKA-07-14', 'nom' => 'Fodecariah balimana'],
                            ['code' => 'KKA-07-15', 'nom' => 'Djimbala'],
                            ['code' => 'KKA-07-16', 'nom' => 'Djélibakoro'],
                        ],
                    ],
                    [
                        'code' => 'KRN-07-02',
                        'nom' => 'Kérouané',
                        'sousPrefectures' => [
                            ['code' => 'KRN-07-01', 'nom' => 'Balandou'],
                            ['code' => 'KRN-07-02', 'nom' => 'Bokaria'],
                            ['code' => 'KRN-07-03', 'nom' => 'Dabola-Koura'],
                            ['code' => 'KRN-07-04', 'nom' => 'Doko'],
                            ['code' => 'KRN-07-05', 'nom' => 'Foulaya'],
                            ['code' => 'KRN-07-06', 'nom' => 'Banankoro'],
                            ['code' => 'KRN-07-07', 'nom' => 'Damaro'],
                            ['code' => 'KRN-07-08', 'nom' => 'Kérouané-Centre'],
                            ['code' => 'KRN-07-09', 'nom' => 'Komodou'],
                            ['code' => 'KRN-07-10', 'nom' => 'Kounsankoro'],
                            ['code' => 'KRN-07-11', 'nom' => 'Linko'],
                            ['code' => 'KRN-07-12', 'nom' => 'Sibiribaro'],
                            ['code' => 'KRN-07-13', 'nom' => 'Soromayah'],
                        ],
                    ],
                    [
                        'code' => 'KRS-07-03',
                        'nom' => 'Kouroussa',
                        'sousPrefectures' => [
                            ['code' => 'KRS-07-01', 'nom' => 'Babila'],
                            ['code' => 'KRS-07-02', 'nom' => 'Balato'],
                            ['code' => 'KRS-07-03', 'nom' => 'Banfèlè'],
                            ['code' => 'KRS-07-04', 'nom' => 'Baro'],
                            ['code' => 'KRS-07-05', 'nom' => 'Cisséla'],
                            ['code' => 'KRS-07-06', 'nom' => 'Douako'],
                            ['code' => 'KRS-07-07', 'nom' => 'Doura'],
                            ['code' => 'KRS-07-08', 'nom' => 'Kiniéro'],
                            ['code' => 'KRS-07-09', 'nom' => 'Koumana'],
                            ['code' => 'KRS-07-10', 'nom' => 'Komola-Koura'],
                            ['code' => 'KRS-07-11', 'nom' => 'Kouroussa-Centre'],
                            ['code' => 'KRS-07-12', 'nom' => 'Sanguiana'],
                            ['code' => 'KRS-07-13', 'nom' => 'Fadou-Saba'],
                            ['code' => 'KRS-07-14', 'nom' => 'Kansereah'],
                        ],
                    ],
                    [
                        'code' => 'MDN-07-04',
                        'nom' => 'Mandiana',
                        'sousPrefectures' => [
                            ['code' => 'MDN-07-01', 'nom' => 'Balandougouba'],
                            ['code' => 'MDN-07-02', 'nom' => 'Dialakoro'],
                            ['code' => 'MDN-07-03', 'nom' => 'Faralako'],
                            ['code' => 'MDN-07-04', 'nom' => 'Kantoumania'],
                            ['code' => 'MDN-07-05', 'nom' => 'Kiniéran'],
                            ['code' => 'MDN-07-06', 'nom' => 'Koudianakoro'],
                            ['code' => 'MDN-07-07', 'nom' => 'Koundian'],
                            ['code' => 'MDN-07-08', 'nom' => 'Mandiana-Centre'],
                            ['code' => 'MDN-07-09', 'nom' => 'Morodou'],
                            ['code' => 'MDN-07-10', 'nom' => 'Niantanina'],
                            ['code' => 'MDN-07-11', 'nom' => 'Saladou'],
                            ['code' => 'MDN-07-12', 'nom' => 'Sansando'],
                        ],
                    ],
                    [
                        'code' => 'SGR-07-05',
                        'nom' => 'Siguiri',
                        'sousPrefectures' => [
                            ['code' => 'SGR-07-01', 'nom' => 'Bankon'],
                            ['code' => 'SGR-07-02', 'nom' => 'Doko'],
                            ['code' => 'SGR-07-03', 'nom' => 'Franwalia'],
                            ['code' => 'SGR-07-04', 'nom' => 'Kiniébakora'],
                            ['code' => 'SGR-07-05', 'nom' => 'Kintinian'],
                            ['code' => 'SGR-07-06', 'nom' => 'Maléah'],
                            ['code' => 'SGR-07-07', 'nom' => 'Naboun'],
                            ['code' => 'SGR-07-08', 'nom' => 'Niagassola'],
                            ['code' => 'SGR-07-09', 'nom' => 'Niandankoro'],
                            ['code' => 'SGR-07-10', 'nom' => 'Norassoba'],
                            ['code' => 'SGR-07-11', 'nom' => 'Siguiri-Centre'],
                            ['code' => 'SGR-07-12', 'nom' => 'Siguirini'],
                            ['code' => 'SGR-07-13', 'nom' => 'Nounkounkan'],
                            ['code' => 'SGR-07-14', 'nom' => 'Didi'],
                            ['code' => 'SGR-07-15', 'nom' => 'Kourémalé'],
                            ['code' => 'SGR-07-16', 'nom' => 'Tomba Kanssa'],
                            ['code' => 'SGR-07-17', 'nom' => 'Tomboni'],
                            ['code' => 'SGR-07-18', 'nom' => 'Fidako'],
                            ['code' => 'SGR-07-19', 'nom' => 'Mignada'],
                            ['code' => 'SGR-07-20', 'nom' => 'Koumandjanbougou'],
                            ['code' => 'SGR-07-21', 'nom' => 'Diomabana'],
                        ],
                    ],
                ],
            ],
            [
                'code' => '08',
                'nom' => 'Nzérékoré',
                'prefectures' => [
                    [
                        'code' => 'BLA-08-01',
                        'nom' => 'Beyla',
                        'sousPrefectures' => [
                            ['code' => 'BLA-08-01', 'nom' => 'Beyla-Centre'],
                            ['code' => 'BLA-08-02', 'nom' => 'Boola'],
                            ['code' => 'BLA-08-03', 'nom' => 'Diaraguérédou'],
                            ['code' => 'BLA-08-04', 'nom' => 'Fouala'],
                            ['code' => 'BLA-08-05', 'nom' => 'Gbessoba'],
                            ['code' => 'BLA-08-06', 'nom' => 'Karala'],
                            ['code' => 'BLA-08-07', 'nom' => 'Koumandou'],
                            ['code' => 'BLA-08-08', 'nom' => 'Moussadou'],
                            ['code' => 'BLA-08-09', 'nom' => 'Nionsomoridou'],
                            ['code' => 'BLA-08-10', 'nom' => 'Samana'],
                            ['code' => 'BLA-08-11', 'nom' => 'Sinko'],
                            ['code' => 'BLA-08-12', 'nom' => 'Sokourala'],
                        ],
                    ],
                    [
                        'code' => 'GKD-08-02',
                        'nom' => 'Guéckédou',
                        'sousPrefectures' => [
                            ['code' => 'GKD-08-01', 'nom' => 'Bolodou'],
                            ['code' => 'GKD-08-02', 'nom' => 'Fangamadou'],
                            ['code' => 'GKD-08-03', 'nom' => 'Guéckédou-Centre'],
                            ['code' => 'GKD-08-04', 'nom' => 'Guendembou'],
                            ['code' => 'GKD-08-05', 'nom' => 'Kassadou'],
                            ['code' => 'GKD-08-06', 'nom' => 'Koundou'],
                            ['code' => 'GKD-08-07', 'nom' => 'Nongoa'],
                            ['code' => 'GKD-08-08', 'nom' => 'Ouéndé-Kénéma'],
                            ['code' => 'GKD-08-09', 'nom' => 'Tékoulo'],
                            ['code' => 'GKD-08-10', 'nom' => 'Termessadou-Diowoula'],
                        ],
                    ],
                    [
                        'code' => 'LLA-08-03',
                        'nom' => 'Lola',
                        'sousPrefectures' => [
                            ['code' => 'LLA-08-01', 'nom' => 'Bossou'],
                            ['code' => 'LLA-08-02', 'nom' => 'Foumbadou'],
                            ['code' => 'LLA-08-03', 'nom' => 'Gama-Bérèma'],
                            ['code' => 'LLA-08-04', 'nom' => 'Guéasso'],
                            ['code' => 'LLA-08-05', 'nom' => 'Kokota'],
                            ['code' => 'LLA-08-06', 'nom' => 'Lainé'],
                            ['code' => 'LLA-08-07', 'nom' => 'Lola-Centre'],
                            ['code' => 'LLA-08-08', 'nom' => "N'Zoo"],
                            ['code' => 'LLA-08-09', 'nom' => 'Tounkarata'],
                        ],
                    ],
                    [
                        'code' => 'MCT-08-04',
                        'nom' => 'Macenta',
                        'sousPrefectures' => [
                            ['code' => 'MCT-08-01', 'nom' => 'Binikala'],
                            ['code' => 'MCT-08-02', 'nom' => 'Bofossou'],
                            ['code' => 'MCT-08-03', 'nom' => 'Daro'],
                            ['code' => 'MCT-08-04', 'nom' => 'Fassankoni'],
                            ['code' => 'MCT-08-05', 'nom' => 'Koyamah'],
                            ['code' => 'MCT-08-06', 'nom' => 'Macenta-Centre'],
                            ['code' => 'MCT-08-07', 'nom' => 'Orémai'],
                            ['code' => 'MCT-08-08', 'nom' => 'Panziazou'],
                            ['code' => 'MCT-08-09', 'nom' => 'Sengbédou'],
                            ['code' => 'MCT-08-10', 'nom' => 'Sérédou'],
                            ['code' => 'MCT-08-11', 'nom' => 'Vassérédou'],
                            ['code' => 'MCT-08-12', 'nom' => 'Watanka'],
                            ['code' => 'MCT-08-13', 'nom' => 'Zébéla'],
                        ],
                    ],
                    [
                        'code' => 'ZKR-08-05',
                        'nom' => 'Nzérékoré',
                        'sousPrefectures' => [
                            ['code' => 'ZKR-08-01', 'nom' => 'Bounouma'],
                            ['code' => 'ZKR-08-02', 'nom' => 'Gouécké'],
                            ['code' => 'ZKR-08-03', 'nom' => 'Kobéla'],
                            ['code' => 'ZKR-08-04', 'nom' => 'Koropara'],
                            ['code' => 'ZKR-08-05', 'nom' => 'Nzérékoré-Centre'],
                            ['code' => 'ZKR-08-06', 'nom' => 'Palé'],
                            ['code' => 'ZKR-08-07', 'nom' => 'Samou'],
                            ['code' => 'ZKR-08-08', 'nom' => 'Samoé'],
                            ['code' => 'ZKR-08-09', 'nom' => 'Soulouta'],
                            ['code' => 'ZKR-08-10', 'nom' => 'Womey'],
                            ['code' => 'ZKR-08-11', 'nom' => 'Yalenzou'],
                        ],
                    ],
                    [
                        'code' => 'YMU-08-06',
                        'nom' => 'Yomou',
                        'sousPrefectures' => [
                            ['code' => 'YMU-08-01', 'nom' => 'Banié'],
                            ['code' => 'YMU-08-02', 'nom' => 'Béhéta'],
                            ['code' => 'YMU-08-03', 'nom' => 'Bhéta'],
                            ['code' => 'YMU-08-04', 'nom' => 'Bowé'],
                            ['code' => 'YMU-08-05', 'nom' => 'Diécké'],
                            ['code' => 'YMU-08-06', 'nom' => 'Gbié'],
                            ['code' => 'YMU-08-07', 'nom' => 'Péla'],
                            ['code' => 'YMU-08-08', 'nom' => 'Yomou-Centre'],
                        ],
                    ],
                ],
            ],
        ];

        // Insert regions
        foreach ($regions as $regionData) {
            $regionId = DB::table('regions')->insertGetId([
                'code' => $regionData['code'],
                'nom' => $regionData['nom'],
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // For Conakry, insert communes first
            if ($regionData['code'] === '01') {
                $communeIds = [];
                foreach ($communesConakry as $commune) {
                    $communeId = DB::table('communes')->insertGetId([
                        'code' => $commune['code'],
                        'nom' => $commune['nom'],
                        'region_id' => $regionId,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $communeIds[$commune['nom']] = $communeId;
                }

                // Insert the single prefecture for Conakry
                $prefectureData = $regionData['prefectures'][0];
                $prefectureId = DB::table('prefectures')->insertGetId([
                    'code' => $prefectureData['code'],
                    'nom' => $prefectureData['nom'],
                    'region_id' => $regionId,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                // Insert quartiers by commune
                foreach ($quartiersByCommune as $communeName => $quartiers) {
                    $communeId = $communeIds[$communeName] ?? null;
                    foreach ($quartiers as $quartier) {
                        DB::table('sous_prefectures')->insert([
                            'code' => $quartier['code'],
                            'nom' => $quartier['nom'],
                            'prefecture_id' => $prefectureId,
                            'commune_id' => $communeId,
                            'is_active' => true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }
            } else {
                // For other regions, insert prefectures and sous-prefectures normally
                foreach ($regionData['prefectures'] as $prefectureData) {
                    $prefectureId = DB::table('prefectures')->insertGetId([
                        'code' => $prefectureData['code'],
                        'nom' => $prefectureData['nom'],
                        'region_id' => $regionId,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    // Insert sous-prefectures
                    foreach ($prefectureData['sousPrefectures'] as $sousPrefecture) {
                        DB::table('sous_prefectures')->insert([
                            'code' => $sousPrefecture['code'],
                            'nom' => $sousPrefecture['nom'],
                            'prefecture_id' => $prefectureId,
                            'commune_id' => null,
                            'is_active' => true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }
            }
        }

        $this->command->info('Guinea locations seeded successfully!');
        $this->command->info('- 8 regions');
        $this->command->info('- 5 communes of Conakry (Dixinn, Kaloum, Matam, Ratoma, Matoto)');
        $this->command->info('- ' . DB::table('prefectures')->count() . ' prefectures');
        $this->command->info('- ' . DB::table('sous_prefectures')->count() . ' sous-prefectures/quartiers');
    }
}
