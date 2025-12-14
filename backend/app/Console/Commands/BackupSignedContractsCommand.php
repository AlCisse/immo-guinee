<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Services\EncryptionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BackupSignedContractsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contracts:backup
                            {--dry-run : Run without making changes}
                            {--force : Force backup even if already backed up today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backup signed contracts to secure storage (FR-038: daily at 2h GMT)';

    protected EncryptionService $encryptionService;

    public function __construct(EncryptionService $encryptionService)
    {
        parent::__construct();
        $this->encryptionService = $encryptionService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting signed contracts backup...');
        $this->info('Backup time: ' . now()->toIso8601String());

        $dryRun = $this->option('dry-run');
        $force = $this->option('force');

        // Get contracts that need backup (signed but not backed up today)
        $contracts = $this->getContractsForBackup($force);

        $count = $contracts->count();
        $this->info("Found {$count} contract(s) to backup.");

        if ($count === 0) {
            $this->info('No contracts to backup.');
            return Command::SUCCESS;
        }

        $backed = 0;
        $failed = 0;
        $skipped = 0;

        $progressBar = $this->output->createProgressBar($count);
        $progressBar->start();

        foreach ($contracts as $contract) {
            try {
                $result = $this->backupContract($contract, $dryRun);

                if ($result === 'success') {
                    $backed++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $failed++;
                Log::error('Failed to backup contract', [
                    'contract_id' => $contract->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("\nError backing up contract {$contract->reference}: {$e->getMessage()}");
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("Backup completed:");
        $this->info("  - Backed up: {$backed}");
        $this->info("  - Skipped: {$skipped}");
        $this->info("  - Failed: {$failed}");

        // Log summary
        Log::info('Contract backup completed', [
            'backed_up' => $backed,
            'skipped' => $skipped,
            'failed' => $failed,
            'total' => $count,
        ]);

        // Create backup manifest
        if (!$dryRun && $backed > 0) {
            $this->createBackupManifest($backed);
        }

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * Get contracts that need backup
     */
    protected function getContractsForBackup(bool $force): \Illuminate\Database\Eloquent\Collection
    {
        $query = Contract::query()
            ->where('statut', 'SIGNE_ARCHIVE')
            ->whereNotNull('fichier_pdf_url')
            ->where('est_verrouille', true);

        if (!$force) {
            // Only backup contracts not backed up today
            $query->where(function ($q) {
                $q->whereNull('derniere_sauvegarde')
                    ->orWhere('derniere_sauvegarde', '<', now()->startOfDay());
            });
        }

        return $query->get();
    }

    /**
     * Backup a single contract
     */
    protected function backupContract(Contract $contract, bool $dryRun): string
    {
        // Check if PDF exists
        if (!$contract->fichier_pdf_url) {
            $this->warn("Contract {$contract->reference}: No PDF URL, skipping.");
            return 'skipped';
        }

        $pdfPath = str_replace(Storage::disk('s3')->url(''), '', $contract->fichier_pdf_url);

        if (!Storage::disk('s3')->exists($pdfPath)) {
            $this->warn("Contract {$contract->reference}: PDF not found, skipping.");
            return 'skipped';
        }

        if ($dryRun) {
            $this->line("[DRY RUN] Would backup: {$contract->reference}");
            return 'success';
        }

        // Generate backup path with date-based structure
        $date = now();
        $backupPath = sprintf(
            'backups/contracts/%d/%02d/%02d/%s_%s.pdf',
            $date->year,
            $date->month,
            $date->day,
            $contract->id,
            $contract->reference
        );

        // Copy PDF to backup location
        $content = Storage::disk('s3')->get($pdfPath);
        Storage::disk('s3')->put($backupPath, $content);

        // Create encrypted backup
        $encryptedPath = str_replace('.pdf', '.enc', $backupPath);
        $this->encryptionService->encryptFile($pdfPath, $encryptedPath);

        // Generate checksum
        $checksum = hash('sha256', $content);

        // Create backup metadata
        $metadata = [
            'contract_id' => $contract->id,
            'reference' => $contract->reference,
            'type' => $contract->type_contrat,
            'original_path' => $pdfPath,
            'backup_path' => $backupPath,
            'encrypted_path' => $encryptedPath,
            'checksum_sha256' => $checksum,
            'original_hash' => $contract->hash_sha256,
            'signatures' => $contract->signatures,
            'proprietaire_id' => $contract->proprietaire_id,
            'locataire_id' => $contract->locataire_id,
            'signed_at' => $contract->date_signature_complete,
            'backed_up_at' => now()->toIso8601String(),
            'retention_until' => now()->addYears(10)->toIso8601String(), // FR-038: 10 year retention
        ];

        // Save metadata
        $metadataPath = str_replace('.pdf', '_metadata.json', $backupPath);
        Storage::disk('s3')->put($metadataPath, json_encode($metadata, JSON_PRETTY_PRINT));

        // Update contract
        $contract->update([
            'derniere_sauvegarde' => now(),
            'chemin_sauvegarde' => $backupPath,
        ]);

        Log::info('Contract backed up', [
            'contract_id' => $contract->id,
            'reference' => $contract->reference,
            'backup_path' => $backupPath,
        ]);

        return 'success';
    }

    /**
     * Create daily backup manifest
     */
    protected function createBackupManifest(int $count): void
    {
        $date = now();
        $manifestPath = sprintf(
            'backups/contracts/%d/%02d/%02d/manifest.json',
            $date->year,
            $date->month,
            $date->day
        );

        $manifest = [
            'date' => $date->toIso8601String(),
            'contracts_backed_up' => $count,
            'backup_type' => 'daily',
            'server' => gethostname(),
            'version' => config('app.version', '1.0.0'),
        ];

        Storage::disk('s3')->put($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT));

        $this->info("Backup manifest created: {$manifestPath}");
    }
}
