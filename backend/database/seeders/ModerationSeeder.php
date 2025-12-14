<?php

namespace Database\Seeders;

use App\Models\Listing;
use Illuminate\Database\Seeder;

class ModerationSeeder extends Seeder
{
    public function run(): void
    {
        // Get some active listings to put in moderation queue
        $listings = Listing::where('statut', 'ACTIVE')->limit(6)->get();

        if ($listings->count() < 6) {
            $this->command->warn('Not enough active listings found');
            return;
        }

        // Put 3 listings in EN_ATTENTE (pending review)
        $listings[0]->update(['statut' => 'EN_ATTENTE']);
        $this->command->info("Listing '{$listings[0]->titre}' set to EN_ATTENTE");

        $listings[1]->update(['statut' => 'EN_ATTENTE']);
        $this->command->info("Listing '{$listings[1]->titre}' set to EN_ATTENTE");

        $listings[2]->update(['statut' => 'EN_ATTENTE']);
        $this->command->info("Listing '{$listings[2]->titre}' set to EN_ATTENTE");

        // Put 3 listings in SUSPENDUE (suspended for review)
        $listings[3]->update(['statut' => 'SUSPENDUE']);
        $this->command->info("Listing '{$listings[3]->titre}' set to SUSPENDUE");

        $listings[4]->update(['statut' => 'SUSPENDUE']);
        $this->command->info("Listing '{$listings[4]->titre}' set to SUSPENDUE");

        $listings[5]->update(['statut' => 'SUSPENDUE']);
        $this->command->info("Listing '{$listings[5]->titre}' set to SUSPENDUE");

        $this->command->info('Moderation queue seeded with 6 listings (3 EN_ATTENTE, 3 SUSPENDUE)');
    }
}
