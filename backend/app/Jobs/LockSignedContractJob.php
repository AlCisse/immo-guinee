<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\ContractService;
use App\Services\EncryptionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LockSignedContractJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Contract $contract;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(Contract $contract)
    {
        $this->contract = $contract;
    }

    /**
     * Execute the job.
     */
    public function handle(ContractService $contractService): void
    {
        Log::info('Processing LockSignedContractJob', [
            'contract_id' => $this->contract->id,
            'contract_reference' => $this->contract->reference,
        ]);

        try {
            // Refresh contract to get latest state
            $this->contract->refresh();

            // Verify contract is fully signed
            if (!$this->isFullySigned()) {
                Log::warning('Contract not fully signed, skipping lock', [
                    'contract_id' => $this->contract->id,
                ]);
                return;
            }

            // Add signature watermark to PDF
            $this->addSignatureWatermarkToPdf($contractService);

            // Generate final archived PDF with signatures
            $this->generateArchivedPdf($contractService);

            // Encrypt the archived PDF for secure storage (FR-034)
            $this->encryptArchivedPdf();

            // Create backup entry
            $this->createBackupEntry();

            // Update contract status
            $this->contract->update([
                'est_verrouille' => true,
                'archive_le' => now(),
            ]);

            Log::info('Contract successfully locked and archived', [
                'contract_id' => $this->contract->id,
                'archived_at' => now()->toIso8601String(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to lock signed contract', [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Check if contract is fully signed by both parties
     */
    protected function isFullySigned(): bool
    {
        return $this->contract->date_signature_proprietaire !== null
            && $this->contract->date_signature_locataire !== null;
    }

    /**
     * Add signature watermark to the PDF
     */
    protected function addSignatureWatermarkToPdf(ContractService $contractService): void
    {
        $signatures = $this->contract->signatures ?? [];

        foreach ($signatures as $signature) {
            $contractService->addSignatureWatermark($this->contract, $signature);
        }

        Log::info('Signature watermarks added to PDF', [
            'contract_id' => $this->contract->id,
            'signature_count' => count($signatures),
        ]);
    }

    /**
     * Generate the final archived PDF with all signatures
     */
    protected function generateArchivedPdf(ContractService $contractService): void
    {
        // Regenerate PDF with signatures
        $pdfUrl = $contractService->generatePdf($this->contract);

        // Store archived version
        $archivedPath = 'contracts/archived/' . $this->contract->id . '_' . time() . '_archived.pdf';

        // Copy to archived folder
        $originalPath = str_replace(Storage::disk('s3')->url(''), '', $this->contract->fichier_pdf_url);

        if (Storage::disk('s3')->exists($originalPath)) {
            $content = Storage::disk('s3')->get($originalPath);
            Storage::disk('s3')->put($archivedPath, $content);

            $this->contract->update([
                'fichier_pdf_archive_url' => Storage::disk('s3')->url($archivedPath),
            ]);
        }

        Log::info('Archived PDF generated', [
            'contract_id' => $this->contract->id,
            'archived_path' => $archivedPath,
        ]);
    }

    /**
     * Encrypt the archived PDF using AES-256 (FR-034)
     */
    protected function encryptArchivedPdf(): void
    {
        if (!$this->contract->fichier_pdf_archive_url) {
            return;
        }

        try {
            // Get the encrypted storage path
            $archivedPath = str_replace(
                Storage::disk('s3')->url(''),
                '',
                $this->contract->fichier_pdf_archive_url
            );

            if (!Storage::disk('s3')->exists($archivedPath)) {
                return;
            }

            $content = Storage::disk('s3')->get($archivedPath);

            // Encrypt using AES-256-GCM
            $key = config('app.key');
            $cipher = 'aes-256-gcm';
            $ivLength = openssl_cipher_iv_length($cipher);
            $iv = random_bytes($ivLength);
            $tag = '';

            $encrypted = openssl_encrypt($content, $cipher, $key, OPENSSL_RAW_DATA, $iv, $tag);

            // Store encrypted version with IV and tag prepended
            $encryptedContent = base64_encode($iv . $tag . $encrypted);
            $encryptedPath = str_replace('.pdf', '_encrypted.bin', $archivedPath);

            Storage::disk('s3')->put($encryptedPath, $encryptedContent);

            $this->contract->update([
                'fichier_pdf_encrypted_path' => $encryptedPath,
                'chiffrement_algorithme' => 'AES-256-GCM',
            ]);

            Log::info('Contract PDF encrypted', [
                'contract_id' => $this->contract->id,
                'encrypted_path' => $encryptedPath,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to encrypt contract PDF', [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage(),
            ]);
            // Don't throw - encryption failure shouldn't block the job
        }
    }

    /**
     * Create backup entry for disaster recovery
     */
    protected function createBackupEntry(): void
    {
        // Create backup metadata
        $backupData = [
            'contract_id' => $this->contract->id,
            'reference' => $this->contract->reference,
            'type' => $this->contract->type_contrat,
            'signed_at' => $this->contract->date_signature_complete,
            'proprietaire_id' => $this->contract->proprietaire_id,
            'locataire_id' => $this->contract->locataire_id,
            'listing_id' => $this->contract->listing_id,
            'pdf_url' => $this->contract->fichier_pdf_url,
            'pdf_hash' => $this->contract->hash_sha256,
            'signatures' => $this->contract->signatures,
            'backup_created_at' => now()->toIso8601String(),
        ];

        // Store backup metadata
        $backupPath = 'backups/contracts/' . date('Y/m/d') . '/' . $this->contract->id . '.json';
        Storage::disk('s3')->put($backupPath, json_encode($backupData, JSON_PRETTY_PRINT));

        Log::info('Contract backup entry created', [
            'contract_id' => $this->contract->id,
            'backup_path' => $backupPath,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('LockSignedContractJob failed permanently', [
            'contract_id' => $this->contract->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
