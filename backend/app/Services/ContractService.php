<?php

namespace App\Services;

use App\Models\Contract;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ContractService
{
    protected EncryptionService $encryptionService;

    public function __construct(EncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

    /**
     * Generate contract PDF with AES-256-GCM encryption
     */
    public function generatePdf(Contract $contract): string
    {
        // Select template based on contract type (default to residential lease if null)
        $template = $this->getTemplate($contract->type_contrat ?? 'BAIL_LOCATION_RESIDENTIEL');

        // Prepare data for template
        $data = $this->prepareTemplateData($contract);

        // Generate PDF
        $pdf = Pdf::loadView($template, $data)
            ->setPaper('a4', 'portrait')
            ->setOption('margin-top', 20)
            ->setOption('margin-bottom', 20)
            ->setOption('margin-left', 15)
            ->setOption('margin-right', 15);

        // Generate filename with .enc extension for encrypted files
        // Note: spaces-contracts disk already has root='contracts', so no prefix needed
        $filename = $contract->id . '_' . time() . '.enc';

        // Use DigitalOcean Spaces for contract PDFs (MinIO has version compatibility issues)
        $disk = 'spaces-contracts';

        // Get raw PDF output
        $pdfOutput = $pdf->output();

        // Generate SHA-256 hash BEFORE encryption (for document integrity)
        $hash = hash('sha256', $pdfOutput);

        // Encrypt the PDF with AES-256-GCM
        $encryptedData = $this->encryptionService->encrypt($pdfOutput);

        try {
            Storage::disk($disk)->put($filename, $encryptedData);
            Log::info('Contract PDF encrypted and stored', [
                'contract_id' => $contract->id,
                'filename' => $filename,
                'original_size' => strlen($pdfOutput),
                'encrypted_size' => strlen($encryptedData),
            ]);
        } catch (\Exception $e) {
            // Fallback to local public disk if MinIO is not available
            $disk = 'public';
            Storage::disk($disk)->put($filename, $encryptedData);
            Log::warning('Contract PDF stored in fallback disk', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Build PDF URL - store the path
        $pdfUrl = $filename;

        $contract->update([
            'pdf_url' => $pdfUrl,
            'pdf_hash' => $hash,
            'pdf_storage_disk' => $disk,
            'pdf_encrypted' => true,
        ]);

        return $pdfUrl;
    }

    /**
     * Get decrypted PDF content for download
     */
    public function getDecryptedPdf(Contract $contract): string
    {
        $disk = $contract->pdf_storage_disk ?? 'spaces-contracts';
        $encryptedContent = Storage::disk($disk)->get($contract->pdf_url);

        // Decrypt the PDF
        return $this->encryptionService->decrypt($encryptedContent);
    }

    /**
     * Get template path based on contract type
     */
    private function getTemplate(string $type): string
    {
        return match($type) {
            'BAIL_LOCATION_RESIDENTIEL' => 'contracts.bail-location-residentiel',
            'BAIL_LOCATION_COMMERCIAL' => 'contracts.bail-location-commercial',
            'PROMESSE_VENTE_TERRAIN' => 'contracts.promesse-vente-terrain',
            'MANDAT_GESTION' => 'contracts.mandat-gestion',
            'ATTESTATION_CAUTION' => 'contracts.attestation-caution',
            default => 'contracts.bail-location-residentiel',
        };
    }

    /**
     * Prepare data for template
     */
    private function prepareTemplateData(Contract $contract): array
    {
        $contract->load(['bailleur', 'locataire', 'listing.user']);

        // Get property owner from listing
        $proprietaire = $contract->listing?->user;

        return [
            'contract' => $contract,
            'landlord' => $contract->bailleur,
            'tenant' => $contract->locataire,
            'bailleur' => $contract->bailleur,
            'locataire' => $contract->locataire,
            'listing' => $contract->listing,
            'proprietaire' => $proprietaire, // Property owner who created the listing
            'data' => $contract->donnees_personnalisees ?? [],
            'generated_at' => now()->format('d/m/Y à H:i'),
            'reference' => $contract->numero_contrat ?? ('IMMOG-' . strtoupper(Str::random(8))),
        ];
    }

    /**
     * Add signature watermark to PDF
     */
    public function addSignatureWatermark(Contract $contract, array $signature): void
    {
        // Update signatures array
        $signatures = $contract->signatures ?? [];
        $signatures[] = $signature;

        $contract->update(['signatures' => $signatures]);

        // Check if fully signed
        if (count($signatures) >= 2) {
            $this->lockContract($contract);
        }
    }

    /**
     * Lock contract after full signature (make immutable)
     */
    private function lockContract(Contract $contract): void
    {
        $contract->update([
            'statut' => 'SIGNE_ARCHIVE',
            'date_signature_complete' => now(),
            'delai_retractation_expire' => now()->addHours(48), // 48h retraction period
        ]);
    }

    /**
     * Verify PDF integrity using SHA-256 hash
     */
    public function verifyIntegrity(Contract $contract): bool
    {
        if (!$contract->pdf_url || !$contract->pdf_hash) {
            return false;
        }

        try {
            // Get decrypted PDF content
            $pdfContent = $this->getDecryptedPdf($contract);

            // Compute hash of original (decrypted) content
            $computedHash = hash('sha256', $pdfContent);

            return hash_equals($contract->pdf_hash, $computedHash);
        } catch (\Exception $e) {
            Log::error('PDF integrity verification failed', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
