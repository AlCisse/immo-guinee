<?php

namespace Database\Seeders;

use App\Models\Prefecture;
use App\Models\SousPrefecture;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SousPrefectureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sousPrefectures = [

            //Préfecture de Dabola
            ['code' => 'DBL-06-01', 'nom' => 'Dabola-Centre (urbaine)', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-02', 'nom' => 'Arfamoussaya', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-03', 'nom' => 'Banko', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-04', 'nom' => 'Bissikrima', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-05', 'nom' => 'Dogomet', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-06', 'nom' => 'Kankama', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-07', 'nom' => 'Kindoye', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-08', 'nom' => 'Konendou', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-09', 'nom' => 'Ndéma', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-10', 'nom' => 'Bantoun', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-11', 'nom' => 'Dantilia', 'prefecture_code' => '06'],
            ['code' => 'DBL-06-12', 'nom' => 'Bambaya', 'prefecture_code' => '06'],

            //Préfecture de Dinguiraye
            ['code' => 'DGR-06-01', 'nom' => 'Banora', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-02', 'nom' => 'Dialakoro', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-03', 'nom' => 'Diatifèrè', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-04', 'nom' => 'Dinguiraye-Centre (urbaine)', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-05', 'nom' => 'Gagnakaly', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-06', 'nom' => 'Kalinko', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-07', 'nom' => 'Lansanaya', 'prefecture_code' => '06'],
            ['code' => 'DGR-06-08', 'nom' => 'Sélouma', 'prefecture_code' => '06'],

            //Préfecture de Faranah
            ['code' => 'FRN-06-01', 'nom' => 'Banian', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-02', 'nom' => 'Beindou', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-03', 'nom' => 'Faranah-Centre (urbaine)', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-04', 'nom' => 'Gnaléah', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-05', 'nom' => 'Hérémakonon', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-06', 'nom' => 'Kobikoro', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-07', 'nom' => 'Marela', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-08', 'nom' => 'Passaya', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-09', 'nom' => 'Sandéniyah', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-10', 'nom' => 'Songoyah', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-11', 'nom' => 'Tiro', 'prefecture_code' => '06'],
            ['code' => 'FRN-06-12', 'nom' => 'Tindo', 'prefecture_code' => '06'],

            //Préfecture de Kissidougou
            ['code' => 'KDG-06-01', 'nom' => 'Albadariah', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-02', 'nom' => 'Banama', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-03', 'nom' => 'Bardou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-04', 'nom' => 'Beindou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-05', 'nom' => 'Fermessadou-Pombo', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-06', 'nom' => 'Firawa-Yomadou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-07', 'nom' => 'Gbangbadou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-08', 'nom' => 'Kissidougou-Centre (urbaine)', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-09', 'nom' => 'Koundiatou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-10', 'nom' => 'Manfran', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-11', 'nom' => 'Sangardo', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-12', 'nom' => 'Yendé-Millimou', 'prefecture_code' => '06'],
            ['code' => 'KDG-06-13', 'nom' => 'Yombiro', 'prefecture_code' => '06'],

            //Préfecture de Kankan
            ['code' => 'KKA-07-01', 'nom' => 'Balandougou', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-02', 'nom' => 'Baté-Nafadji', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-03', 'nom' => 'Boula', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-04', 'nom' => 'Gbérédou-Baranama', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-05', 'nom' => 'Kanfamoriya', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-06', 'nom' => 'Kankan-Centre (urbaine)', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-07', 'nom' => 'Koumba', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-08', 'nom' => 'Mamouroudou', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-09', 'nom' => 'Misamana', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-10', 'nom' => 'Moribayah', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-11', 'nom' => 'Sabadou-Baranama', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-12', 'nom' => 'Tinti-Oulen', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-13', 'nom' => 'Tokounou', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-14', 'nom' => 'Fodecariah balimana', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-15', 'nom' => 'Djimbala', 'prefecture_code' => '07'],
            ['code' => 'KKA-07-16', 'nom' => 'Djélibakoro', 'prefecture_code' => '07'],

            //Préfecture de Kérouané
            ['code' => 'KRN-07-01', 'nom' => 'Balandou', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-02', 'nom' => 'Bokaria', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-03', 'nom' => 'Dabola-Koura', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-04', 'nom' => 'Doko', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-05', 'nom' => 'Foulaya', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-06', 'nom' => 'Banankoro', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-07', 'nom' => 'Damaro', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-08', 'nom' => 'Kérouané-Centre (urbaine)', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-09', 'nom' => 'Komodou', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-10', 'nom' => 'Kounsankoro', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-11', 'nom' => 'Linko', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-12', 'nom' => 'Sibiribaro', 'prefecture_code' => '07'],
            ['code' => 'KRN-07-13', 'nom' => 'Soromayah', 'prefecture_code' => '07'],

            //Préfecture de KOUROUSA
            ['code' => 'KRS-07-01', 'nom' => 'Babila', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-02', 'nom' => 'Balato', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-03', 'nom' => 'Banfèlè', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-04', 'nom' => 'Baro', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-05', 'nom' => 'Cisséla', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-06', 'nom' => 'Douako', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-07', 'nom' => 'Doura', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-08', 'nom' => 'Kiniéro', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-09', 'nom' => 'Koumana', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-10', 'nom' => 'Komola-Koura', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-11', 'nom' => 'Kouroussa-Centre (urbaine)', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-12', 'nom' => 'Sanguiana', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-13', 'nom' => 'Fadou-Saba', 'prefecture_code' => '07'],
            ['code' => 'KRS-07-14', 'nom' => 'Kansereah', 'prefecture_code' => '07'],

            //Préfecture de mandiana
            ['code' => 'MDN-07-01', 'nom' => 'Balandougouba', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-02', 'nom' => 'Dialakoro', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-03', 'nom' => 'Faralako', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-04', 'nom' => 'Kantoumania', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-05', 'nom' => 'Kiniéran', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-06', 'nom' => 'Koudianakoro', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-07', 'nom' => 'Koundian', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-08', 'nom' => 'Mandiana-Centre (urbaine)', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-09', 'nom' => 'Morodou', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-10', 'nom' => 'Niantanina', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-11', 'nom' => 'Saladou', 'prefecture_code' => '07'],
            ['code' => 'MDN-07-12', 'nom' => 'Sansando', 'prefecture_code' => '07'],

            //Préfecture de siguiri
            ['code' => 'SGR-07-01', 'nom' => 'Bankon', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-02', 'nom' => 'Doko', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-03', 'nom' => 'Franwalia', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-04', 'nom' => 'Kiniébakora', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-05', 'nom' => 'Kintinian', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-06', 'nom' => 'Maléah', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-07', 'nom' => 'Naboun', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-08', 'nom' => 'Niagassola', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-09', 'nom' => 'Niandankoro', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-10', 'nom' => 'Norassoba', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-11', 'nom' => 'Siguiri-Centre (urbaine)', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-12', 'nom' => 'Siguirini', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-13', 'nom' => 'Nounkounkan', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-14', 'nom' => 'Didi', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-15', 'nom' => 'Kourémalé', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-16', 'nom' => 'Tomba Kanssa', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-17', 'nom' => 'Tomboni', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-18', 'nom' => 'Fidako', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-19', 'nom' => 'Mignada', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-20', 'nom' => 'Koumandjanbougou', 'prefecture_code' => '07'],
            ['code' => 'SGR-07-21', 'nom' => 'Diomabana', 'prefecture_code' => '07'],

            // Préfecture de Boffa
            ['code' => 'BFA-03-01', 'nom' => 'Boffa-Centre (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-02', 'nom' => 'Colia', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-03', 'nom' => 'Douprou', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-04', 'nom' => 'Koba-Tatema', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-05', 'nom' => 'Lisso', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-06', 'nom' => 'Mankountan', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-07', 'nom' => 'Tamita', 'prefecture_code' => '03'],
            ['code' => 'BFA-03-08', 'nom' => 'Tougnifily', 'prefecture_code' => '03'],

            // Préfecture de Boké
            ['code' => 'BKE-03-01', 'nom' => 'Bintimodia', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-02', 'nom' => 'Boké-Centre (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-03', 'nom' => 'Dabiss', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-04', 'nom' => 'Kamsar (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-05', 'nom' => 'Kanfarandé', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-06', 'nom' => 'Kolaboui', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-07', 'nom' => 'Malapouyah', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-08', 'nom' => 'Sangarédi (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-09', 'nom' => 'Sansalé', 'prefecture_code' => '03'],
            ['code' => 'BKE-03-10', 'nom' => 'Tanènè', 'prefecture_code' => '03'],

            // Préfecture de Fria
            ['code' => 'FRI-03-01', 'nom' => 'Banguinet', 'prefecture_code' => '03'],
            ['code' => 'FRI-03-02', 'nom' => 'Banguingny', 'prefecture_code' => '03'],
            ['code' => 'FRI-03-03', 'nom' => 'Fria-Centre (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'FRI-03-04', 'nom' => 'Tormelin', 'prefecture_code' => '03'],

            // Préfecture de Gaoual
            ['code' => 'GAL-03-01', 'nom' => 'Foulamory', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-02', 'nom' => 'Gaoual-Centre (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-03', 'nom' => 'Kakony', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-04', 'nom' => 'Koumbia', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-05', 'nom' => 'Kounsitel', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-06', 'nom' => 'Malanta', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-07', 'nom' => 'Touba', 'prefecture_code' => '03'],
            ['code' => 'GAL-03-08', 'nom' => 'Wendou M\'Bour', 'prefecture_code' => '03'],

            // Préfecture de Koundara
            ['code' => 'KDR-03-01', 'nom' => 'Guingan', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-02', 'nom' => 'Kamaby', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-03', 'nom' => 'Koundara-Centre (urbaine)', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-04', 'nom' => 'Sambaïlo', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-05', 'nom' => 'Saréboïdo', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-06', 'nom' => 'Termessé', 'prefecture_code' => '03'],
            ['code' => 'KDR-03-07', 'nom' => 'Youkounkoun', 'prefecture_code' => '03'],

            // Préfecture de Coyah
            ['code' => 'CYA-02-01', 'nom' => 'Coyah-Centre (urbaine)', 'prefecture_code' => '02'],
            ['code' => 'CYA-02-02', 'nom' => 'Kouriah', 'prefecture_code' => '02'],
            ['code' => 'CYA-02-03', 'nom' => 'Manéah', 'prefecture_code' => '02'],
            ['code' => 'CYA-02-04', 'nom' => 'Wonkifong', 'prefecture_code' => '02'],

            // Préfecture de Dubréka
            ['code' => 'DBK-02-01', 'nom' => 'Badi', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-02', 'nom' => 'Dubréka-Centre (urbaine)', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-03', 'nom' => 'Faléssadé', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-04', 'nom' => 'Khorira', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-05', 'nom' => 'Ouassou', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-06', 'nom' => 'Tanènè', 'prefecture_code' => '02'],
            ['code' => 'DBK-02-07', 'nom' => 'Tondon', 'prefecture_code' => '02'],

            // Préfecture de Forécariah
            ['code' => 'FRC-02-01', 'nom' => 'Alassoyah', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-02', 'nom' => 'Benty', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-03', 'nom' => 'Farmoriyah', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-04', 'nom' => 'Forécariah-Centre (urbaine)', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-05', 'nom' => 'Kaback', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-06', 'nom' => 'Kakossa', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-07', 'nom' => 'Kallia', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-08', 'nom' => 'Maferenya', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-09', 'nom' => 'Moussayah', 'prefecture_code' => '02'],
            ['code' => 'FRC-02-10', 'nom' => 'Sikhourou', 'prefecture_code' => '02'],

            // Préfecture de Kindia
            ['code' => 'KDA-02-01', 'nom' => 'Bangouya', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-02', 'nom' => 'Damankaniah', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-03', 'nom' => 'Friguiagbé', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-04', 'nom' => 'Kindia-Centre (urbaine)', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-05', 'nom' => 'Kolenté', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-06', 'nom' => 'Madina-Oula', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-07', 'nom' => 'Mambiya', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-08', 'nom' => 'Molota', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-09', 'nom' => 'Samaya', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-10', 'nom' => 'Souguéta', 'prefecture_code' => '02'],
            ['code' => 'KDA-02-11', 'nom' => 'Linsan (Kindia)', 'prefecture_code' => '02'],

            // Préfecture de Télimélé
            ['code' => 'TLM-02-01', 'nom' => 'Bourouwal', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-02', 'nom' => 'Daramagnaki', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-03', 'nom' => 'Gougoudjé', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-04', 'nom' => 'Koba', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-05', 'nom' => 'Kollet', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-06', 'nom' => 'Konsotami', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-07', 'nom' => 'Missira', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-08', 'nom' => 'Santou', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-09', 'nom' => 'Sarékali', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-10', 'nom' => 'Sinta', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-11', 'nom' => 'Sogolon', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-12', 'nom' => 'Tarihoye', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-13', 'nom' => 'Télimélé-Centre (urbaine)', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-14', 'nom' => 'Thionthian', 'prefecture_code' => '02'],
            ['code' => 'TLM-02-15', 'nom' => 'Kawessi', 'prefecture_code' => '02'],

            //Préfecture de labé
            ['code' => 'LBE-05-01', 'nom' => 'Fafaya', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-02', 'nom' => 'Gadha-Woundou', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-03', 'nom' => 'Koubia-Centre (urbaine)', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-04', 'nom' => 'Matakaou', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-05', 'nom' => 'Missira', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-06', 'nom' => 'Pilimini', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-07', 'nom' => 'Dalein', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-08', 'nom' => 'Daralabe', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-09', 'nom' => 'Diari', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-10', 'nom' => 'Dionfo', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-11', 'nom' => 'Garambé', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-12', 'nom' => 'Hafia', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-13', 'nom' => 'Kaalan', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-14', 'nom' => 'Kouramandji', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-15', 'nom' => 'Labé-Centre (urbaine)', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-16', 'nom' => 'Noussy', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-17', 'nom' => 'Popodara', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-18', 'nom' => 'Sannoun', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-19', 'nom' => 'Tountouroun', 'prefecture_code' => '05'],
            ['code' => 'LBE-05-20', 'nom' => 'Tarambaly', 'prefecture_code' => '05'],

            // Préfecture de Koubia
            ['code' => 'KBA-05-01', 'nom' => 'Fafaya', 'prefecture_code' => '05'],
            ['code' => 'KBA-05-02', 'nom' => 'Gadha-Woundou', 'prefecture_code' => '05'],
            ['code' => 'KBA-05-03', 'nom' => 'Koubia-Centre (urbaine)', 'prefecture_code' => '05'],
            ['code' => 'KBA-05-04', 'nom' => 'Matakaou', 'prefecture_code' => '05'],
            ['code' => 'KBA-05-05', 'nom' => 'Missira', 'prefecture_code' => '05'],
            ['code' => 'KBA-05-06', 'nom' => 'Pilimini', 'prefecture_code' => '05'],

            //Préfecture de lélouma
            ['code' => 'LLM-05-01', 'nom' => 'Balaya', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-02', 'nom' => 'Djountou', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-03', 'nom' => 'Hérico', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-04', 'nom' => 'Korbè', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-05', 'nom' => 'Lafou', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-06', 'nom' => 'Lélouma-Centre (urbaine)', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-07', 'nom' => 'Linsan (labé)', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-08', 'nom' => 'Manda', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-09', 'nom' => 'Parawol', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-10', 'nom' => 'Sagalé', 'prefecture_code' => '05'],
            ['code' => 'LLM-05-11', 'nom' => 'Tyanguel-Bori', 'prefecture_code' => '05'],

            // Préfecture de mali
            ['code' => 'MLI-05-01', 'nom' => 'Balaki', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-02', 'nom' => 'Donghol Sigon', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-03', 'nom' => 'Dougountouny', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-04', 'nom' => 'Fougou', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-05', 'nom' => 'Gayah', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-06', 'nom' => 'Hidayatou', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-07', 'nom' => 'Lébékéré', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-08', 'nom' => 'Madina Wora', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-09', 'nom' => 'Mali-Centre (urbaine)', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-10', 'nom' => 'Madina-Salambandé', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-11', 'nom' => 'Téliré', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-12', 'nom' => 'Touba', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-13', 'nom' => 'Yembereng', 'prefecture_code' => '05'],
            ['code' => 'MLI-05-14', 'nom' => 'Badougoula', 'prefecture_code' => '05'],

            //// Préfecture de tougue
            ['code' => 'TGE-05-01', 'nom' => 'Fatako', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-02', 'nom' => 'Fello Koundoua', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-03', 'nom' => 'Kansangui', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-04', 'nom' => 'Kolangui', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-05', 'nom' => 'Kollet', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-06', 'nom' => 'Konah', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-07', 'nom' => 'Kouratongo', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-08', 'nom' => 'Koïn', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-09', 'nom' => 'Tangali', 'prefecture_code' => '05'],
            ['code' => 'TGE-05-10', 'nom' => 'Tougué-Centre (urbaine)', 'prefecture_code' => '05'],

            // Préfecture de Dalaba
            ['code' => 'DLB-04-01', 'nom' => 'Bodié', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-02', 'nom' => 'Dalaba-Centre (urbaine)', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-03', 'nom' => 'Ditinn', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-04', 'nom' => 'Kaala', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-05', 'nom' => 'Kankalabé', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-06', 'nom' => 'Kébali', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-07', 'nom' => 'Koba', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-08', 'nom' => 'Mafara', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-09', 'nom' => 'Mitty', 'prefecture_code' => '04'],
            ['code' => 'DLB-04-10', 'nom' => 'Mombéyah', 'prefecture_code' => '04'],

            // Préfecture de Mamou
            ['code' => 'MMU-04-01', 'nom' => 'Bouliwel', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-02', 'nom' => 'Dounet', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-03', 'nom' => 'Gongorèt', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-04', 'nom' => 'Kégnéko', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-05', 'nom' => 'Konkouré', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-06', 'nom' => 'Mamou-Centre (urbaine)', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-07', 'nom' => 'Nyagara', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-08', 'nom' => 'Ouré-Kaba', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-09', 'nom' => 'Porédaka', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-10', 'nom' => 'Saramoussayah', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-11', 'nom' => 'Soyah', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-12', 'nom' => 'Téguéréya', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-13', 'nom' => 'Timbo', 'prefecture_code' => '04'],
            ['code' => 'MMU-04-14', 'nom' => 'Tolo', 'prefecture_code' => '04'],
            ['code' => 'MMU-05-15', 'nom' => 'Updated Area', 'prefecture_code' => '05'],

            // Préfecture de Pita
            ['code' => 'PTA-04-01', 'nom' => 'Bantignel', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-02', 'nom' => 'Bourouwal-Tappé', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-03', 'nom' => 'Donghol-Touma', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-04', 'nom' => 'Gongorè', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-05', 'nom' => 'Ley-Miro', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-06', 'nom' => 'Maci', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-07', 'nom' => 'Ninguélandé', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-08', 'nom' => 'Pita-Centre (urbaine)', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-09', 'nom' => 'Sangaréyah', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-10', 'nom' => 'Sintali', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-11', 'nom' => 'Timbi Madina', 'prefecture_code' => '04'],
            ['code' => 'PTA-04-12', 'nom' => 'Timbi-Touny', 'prefecture_code' => '04'],

            // Commune de dixin

            // Commune de Dixinn
            ['code' => 'CKY-01-01', 'nom' => 'Belle-vue école', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-02', 'nom' => 'Belle-vue-marché', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-03', 'nom' => 'Camayenne', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-04', 'nom' => 'Cameroun', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-05', 'nom' => 'Dixinn-cité1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-06', 'nom' => 'Dixinn-cité 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-07', 'nom' => 'Dixinn-gare', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-08', 'nom' => 'Dixinn-gare-rails', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-09', 'nom' => 'Dixinn-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-10', 'nom' => 'Dixinn-port', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-11', 'nom' => 'Hafia 1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-12', 'nom' => 'Hafia 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-13', 'nom' => 'Hafia-minière', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-14', 'nom' => 'Hafia-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-15', 'nom' => 'Kénien', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-16', 'nom' => 'Landréah', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-17', 'nom' => 'Minière-cité', 'prefecture_code' => '01'],

            // Commune de Kaloum
            ['code' => 'CKY-01-18', 'nom' => 'Belle-vue école', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-19', 'nom' => 'Belle-vue-marché', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-20', 'nom' => 'Camayenne', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-21', 'nom' => 'Cameroun', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-22', 'nom' => 'Dixinn-cité1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-23', 'nom' => 'Dixinn-cité 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-24', 'nom' => 'Dixinn-gare', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-25', 'nom' => 'Dixinn-gare-rails', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-26', 'nom' => 'Dixinn-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-27', 'nom' => 'Dixinn-port', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-28', 'nom' => 'Hafia 1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-29', 'nom' => 'Hafia 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-30', 'nom' => 'Hafia-minière', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-31', 'nom' => 'Hafia-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-32', 'nom' => 'Kénien', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-33', 'nom' => 'Landréah', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-34', 'nom' => 'Minière-cité', 'prefecture_code' => '01'],

            // Commune de Matam
            ['code' => 'CKY-01-35', 'nom' => 'Belle-vue école', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-36', 'nom' => 'Belle-vue-marché', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-37', 'nom' => 'Camayenne', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-38', 'nom' => 'Cameroun', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-39', 'nom' => 'Dixinn-cité1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-40', 'nom' => 'Dixinn-cité 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-41', 'nom' => 'Dixinn-gare', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-42', 'nom' => 'Dixinn-gare-rails', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-43', 'nom' => 'Dixinn-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-44', 'nom' => 'Dixinn-port', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-45', 'nom' => 'Hafia 1', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-46', 'nom' => 'Hafia 2', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-47', 'nom' => 'Hafia-minière', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-48', 'nom' => 'Hafia-mosquée', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-49', 'nom' => 'Kénien', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-50', 'nom' => 'Landréah', 'prefecture_code' => '01'],
            ['code' => 'CKY-01-51', 'nom' => 'Minière-cité', 'prefecture_code' => '01'],

            // Commune de Ratoma
            ['code' => 'RTM-01-01', 'nom' => 'Taouyah (chef lieu)', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-02', 'nom' => 'Kipé', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-03', 'nom' => 'Kipé 2', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-04', 'nom' => 'Nongo', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-05', 'nom' => 'Dar-es-salam', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-06', 'nom' => 'Hamdalaye 1', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-07', 'nom' => 'Hamdalaye 2', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-08', 'nom' => 'Hamdalaye-mosquée', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-09', 'nom' => 'Kaporo-centre', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-10', 'nom' => 'Kaporo-rails', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-11', 'nom' => 'Koloma 1', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-12', 'nom' => 'Koloma 2 (Bambeto)', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-13', 'nom' => 'Ratoma-centre', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-14', 'nom' => 'Ratoma-dispensaire', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-15', 'nom' => 'Demoudoula', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-16', 'nom' => 'Bomboli', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-17', 'nom' => 'Simanbossia', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-18', 'nom' => 'Dadiya', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-19', 'nom' => 'Kakimbo', 'prefecture_code' => '01'],
            ['code' => 'RTM-01-20', 'nom' => 'Soloprimo', 'prefecture_code' => '01'],

            // Commune de Matoto
            ['code' => 'MTT-01-01', 'nom' => 'Béanzin', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-02', 'nom' => 'Camp Alpha Yaya Diallo', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-03', 'nom' => 'Dabompa', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-04', 'nom' => 'Dabondy 1', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-05', 'nom' => 'Dabondy 2', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-06', 'nom' => 'Dabondy 3', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-07', 'nom' => 'Dabondy école', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-08', 'nom' => 'Dabondy-rails', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-09', 'nom' => 'Dar-es-salam', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-10', 'nom' => 'Kissosso', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-11', 'nom' => 'Matoto-centre', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-12', 'nom' => 'Matoto-marché', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-13', 'nom' => 'Matoto-Khabitayah', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-14', 'nom' => 'Sangoya-mosquée', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-15', 'nom' => 'Simbaya 2', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-16', 'nom' => 'Tanéné-marché', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-17', 'nom' => 'Tanéné-mosquée', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-18', 'nom' => 'Yimbaya-école', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-19', 'nom' => 'Yimbaya-permanence', 'prefecture_code' => '01'],
            ['code' => 'MTT-01-20', 'nom' => 'Yimbaya-tannerie', 'prefecture_code' => '01'],

        ];
        // Récupère les préfectures par leur code complet

        // foreach ($sousPrefectures as $sp) {
        //     $prefecture = Prefecture::find(1);

        //     if (!$prefecture) {
        //         //$this->command->error("Préfecture {$sp['prefecture_code']} introuvable");
        //         $this->command->error("Préfecture {$prefecture} introuvable");
        //         continue;
        //     }

        //     SousPrefecture::firstOrCreate(
        //         ['code' => $sp['code']],
        //         [
        //             'name' => $sp['name'],
        //             'prefecture_code' => $sp['prefecture_code']
        //         ]
        //     );
        // }
        foreach ($sousPrefectures as $souspref) {
            // 1. Trouver la préfecture correspondante
            $prefecture = Prefecture::where('code', 'like', '%-' . $souspref['prefecture_code'] . '-%')
                ->first();

            // 2. Debug et vérification
            if (!$prefecture) {
                $existing = Prefecture::select('code', 'name')->get();
                $this->command->error("Préfecture pour code '{$souspref['prefecture_code']}' introuvable. Préfectures existantes:");
                foreach ($existing as $p) {
                    $this->command->line("- {$p->code} ({$p->name})");
                }
                continue;
            }

            // 3. Insertion
            try {
                DB::table('sous_prefectures')->insert([
                    'code' => $souspref['code'],
                    'nom' => $souspref['nom'],
                    'prefecture_id' => $prefecture->id,
                    'prefecture_code' => $souspref['prefecture_code'],
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                //$this->command->info("{$souspref['nom']} créée avec succès");
            } catch (\Exception $e) {
                $this->command->error("Erreur pour {$souspref['nom']}: " . $e->getMessage());
            }
        }
    }
}
