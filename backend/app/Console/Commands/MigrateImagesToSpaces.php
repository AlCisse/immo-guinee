<?php

namespace App\Console\Commands;

use App\Models\ListingPhoto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MigrateImagesToSpaces extends Command
{
    protected $signature = 'images:migrate-to-spaces
                            {--dry-run : Show what would be migrated without actually doing it}
                            {--limit=0 : Limit number of photos to migrate (0 = all)}';

    protected $description = 'Migrate listing photos from local storage to DigitalOcean Spaces';

    protected int $migrated = 0;
    protected int $failed = 0;
    protected int $skipped = 0;

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $limit = (int) $this->option('limit');

        $this->info('=== Migration des images vers DigitalOcean Spaces ===');

        if ($dryRun) {
            $this->warn('Mode DRY-RUN: Aucune modification ne sera effectuée');
        }

        // Check if Spaces is configured
        $strategy = config('filesystems.strategy');
        if ($strategy !== 'spaces') {
            $this->error("STORAGE_STRATEGY doit être 'spaces' (actuel: {$strategy})");
            return Command::FAILURE;
        }

        // Get photos with local disk
        $query = ListingPhoto::whereIn('disk', ['listings', 'local', 'listings-minio']);

        if ($limit > 0) {
            $query->limit($limit);
        }

        $photos = $query->get();
        $total = $photos->count();

        $this->info("Photos à migrer: {$total}");

        if ($total === 0) {
            $this->info('Aucune photo à migrer.');
            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $localDisk = Storage::disk('public');
        $spacesDisk = Storage::disk('spaces-listings');

        foreach ($photos as $photo) {
            $bar->advance();

            try {
                // Check all paths
                $paths = array_filter([
                    'original' => $photo->path,
                    'thumbnail' => $photo->thumbnail_path,
                    'medium' => $photo->medium_path,
                    'large' => $photo->large_path,
                ]);

                $allMigrated = true;

                foreach ($paths as $type => $path) {
                    // Remove 'listings/' prefix if present for local path
                    $localPath = 'listings/' . ltrim($path, 'listings/');

                    // Check if file exists locally
                    if (!$localDisk->exists($localPath)) {
                        $this->newLine();
                        $this->warn("  Fichier local non trouvé: {$localPath}");
                        $allMigrated = false;
                        continue;
                    }

                    // Check if already exists on Spaces
                    if ($spacesDisk->exists($path)) {
                        continue; // Already migrated
                    }

                    if (!$dryRun) {
                        // Copy to Spaces
                        $content = $localDisk->get($localPath);
                        $spacesDisk->put($path, $content, 'public');
                    }
                }

                if ($allMigrated && !$dryRun) {
                    // Update database to use spaces-listings disk
                    $photo->update(['disk' => 'spaces-listings']);
                    $this->migrated++;
                } elseif ($allMigrated) {
                    $this->migrated++;
                } else {
                    $this->failed++;
                }

            } catch (\Exception $e) {
                $this->failed++;
                Log::error('Image migration failed', [
                    'photo_id' => $photo->id,
                    'error' => $e->getMessage(),
                ]);
                $this->newLine();
                $this->error("  Erreur photo {$photo->id}: {$e->getMessage()}");
            }
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("=== Résumé ===");
        $this->info("Migrées: {$this->migrated}");
        $this->info("Échouées: {$this->failed}");
        $this->info("Ignorées: {$this->skipped}");

        if ($dryRun) {
            $this->warn("Mode DRY-RUN terminé. Relancez sans --dry-run pour effectuer la migration.");
        }

        return $this->failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
