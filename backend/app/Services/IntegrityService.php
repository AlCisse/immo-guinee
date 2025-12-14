<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\IntegrityAudit;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

/**
 * Service de vérification d'intégrité et d'archivage sécurisé
 *
 * Protections contre les attaques:
 * - WORM Storage (Object Lock) - Impossible de supprimer/modifier
 * - Hash SHA-256 stocké séparément dans table d'audit
 * - Vérification périodique automatique
 * - Alertes en cas de corruption/modification
 */
class IntegrityService
{
    protected EncryptionService $encryptionService;

    public function __construct(EncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

    /**
     * Archive un contrat signé dans le stockage WORM sécurisé
     * Cette méthode est appelée après signature complète du contrat
     */
    public function archiveSignedContract(Contract $contract): array
    {
        if (!$contract->pdf_url || !$contract->pdf_hash) {
            throw new Exception('Contract PDF not generated');
        }

        // Get original encrypted content from documents disk
        $sourceDisk = $contract->pdf_storage_disk ?? 'documents';
        $encryptedContent = Storage::disk($sourceDisk)->get($contract->pdf_url);

        // Generate secure filename
        $secureFilename = sprintf(
            'signed/%s/%s_%s.enc',
            date('Y/m'),
            $contract->numero_contrat,
            $contract->id
        );

        try {
            // Store in WORM bucket (Object Lock enabled - cannot be deleted for 10 years)
            Storage::disk('contracts-secure')->put($secureFilename, $encryptedContent);

            // Create audit record with hash for independent verification
            $auditRecord = IntegrityAudit::create([
                'entity_type' => 'contract',
                'entity_id' => $contract->id,
                'reference_number' => $contract->numero_contrat,
                'file_path' => $secureFilename,
                'storage_disk' => 'contracts-secure',
                'original_hash' => $contract->pdf_hash, // Hash of decrypted content
                'encrypted_hash' => hash('sha256', $encryptedContent), // Hash of encrypted file
                'file_size' => strlen($encryptedContent),
                'archived_at' => now(),
                'retention_until' => now()->addYears(10),
                'bailleur_id' => $contract->bailleur_id,
                'locataire_id' => $contract->locataire_id,
                'metadata' => json_encode([
                    'bailleur_signed_at' => $contract->bailleur_signed_at?->toIso8601String(),
                    'locataire_signed_at' => $contract->locataire_signed_at?->toIso8601String(),
                    'cachet_electronique' => $contract->cachet_electronique,
                    'encryption_method' => 'AES-256-GCM',
                ]),
            ]);

            // Update contract with secure archive path
            $contract->update([
                'secure_archive_path' => $secureFilename,
                'secure_archive_disk' => 'contracts-secure',
                'archived_at' => now(),
                'is_archived' => true,
            ]);

            Log::info('Contract archived to WORM storage', [
                'contract_id' => $contract->id,
                'secure_path' => $secureFilename,
                'audit_id' => $auditRecord->id,
            ]);

            return [
                'success' => true,
                'secure_path' => $secureFilename,
                'audit_id' => $auditRecord->id,
            ];
        } catch (Exception $e) {
            Log::error('Failed to archive contract to WORM storage', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Vérifie l'intégrité d'un contrat archivé
     */
    public function verifyContractIntegrity(Contract $contract): array
    {
        $audit = IntegrityAudit::where('entity_type', 'contract')
            ->where('entity_id', $contract->id)
            ->latest()
            ->first();

        if (!$audit) {
            return [
                'verified' => false,
                'error' => 'No audit record found',
                'status' => 'MISSING_AUDIT',
            ];
        }

        try {
            // Get file from secure storage
            $disk = $audit->storage_disk;
            $encryptedContent = Storage::disk($disk)->get($audit->file_path);

            // Verify encrypted file hash
            $currentEncryptedHash = hash('sha256', $encryptedContent);
            $encryptedHashValid = hash_equals($audit->encrypted_hash, $currentEncryptedHash);

            if (!$encryptedHashValid) {
                $this->logIntegrityViolation($contract, $audit, 'ENCRYPTED_HASH_MISMATCH');
                return [
                    'verified' => false,
                    'error' => 'Encrypted file has been modified',
                    'status' => 'TAMPERED',
                    'expected_hash' => substr($audit->encrypted_hash, 0, 16) . '...',
                    'actual_hash' => substr($currentEncryptedHash, 0, 16) . '...',
                ];
            }

            // Decrypt and verify original content hash
            $decryptedContent = $this->encryptionService->decrypt($encryptedContent);
            $currentOriginalHash = hash('sha256', $decryptedContent);
            $originalHashValid = hash_equals($audit->original_hash, $currentOriginalHash);

            if (!$originalHashValid) {
                $this->logIntegrityViolation($contract, $audit, 'DECRYPTED_HASH_MISMATCH');
                return [
                    'verified' => false,
                    'error' => 'Decrypted content hash mismatch',
                    'status' => 'CORRUPTED',
                ];
            }

            // Update last verification timestamp
            $audit->update([
                'last_verified_at' => now(),
                'verification_count' => $audit->verification_count + 1,
            ]);

            return [
                'verified' => true,
                'status' => 'VALID',
                'file_size' => strlen($encryptedContent),
                'last_verified' => now()->toIso8601String(),
                'retention_until' => $audit->retention_until->toIso8601String(),
            ];
        } catch (Exception $e) {
            $this->logIntegrityViolation($contract, $audit, 'VERIFICATION_ERROR', $e->getMessage());
            return [
                'verified' => false,
                'error' => $e->getMessage(),
                'status' => 'ERROR',
            ];
        }
    }

    /**
     * Vérifie l'intégrité de tous les contrats archivés
     * À exécuter périodiquement via scheduler
     */
    public function verifyAllContracts(): array
    {
        $results = [
            'total' => 0,
            'valid' => 0,
            'invalid' => 0,
            'errors' => 0,
            'violations' => [],
        ];

        $audits = IntegrityAudit::where('entity_type', 'contract')
            ->where('retention_until', '>', now())
            ->cursor();

        foreach ($audits as $audit) {
            $results['total']++;

            $contract = Contract::find($audit->entity_id);
            if (!$contract) {
                $results['errors']++;
                $results['violations'][] = [
                    'audit_id' => $audit->id,
                    'error' => 'Contract not found in database',
                ];
                continue;
            }

            $verification = $this->verifyContractIntegrity($contract);

            if ($verification['verified']) {
                $results['valid']++;
            } else {
                $results['invalid']++;
                $results['violations'][] = [
                    'contract_id' => $contract->id,
                    'reference' => $contract->numero_contrat,
                    'status' => $verification['status'],
                    'error' => $verification['error'] ?? 'Unknown',
                ];
            }
        }

        // Log summary
        Log::info('Integrity verification completed', $results);

        // Alert if violations found
        if ($results['invalid'] > 0 || $results['errors'] > 0) {
            $this->sendIntegrityAlert($results);
        }

        return $results;
    }

    /**
     * Génère un rapport d'intégrité pour un contrat
     */
    public function generateIntegrityReport(Contract $contract): array
    {
        $audit = IntegrityAudit::where('entity_type', 'contract')
            ->where('entity_id', $contract->id)
            ->latest()
            ->first();

        if (!$audit) {
            return [
                'status' => 'NOT_ARCHIVED',
                'message' => 'Contract not yet archived in secure storage',
            ];
        }

        $verification = $this->verifyContractIntegrity($contract);
        $metadata = json_decode($audit->metadata, true) ?? [];

        return [
            'contract_reference' => $contract->numero_contrat,
            'contract_id' => $contract->id,
            'integrity_status' => $verification['status'],
            'is_valid' => $verification['verified'],
            'archive_info' => [
                'archived_at' => $audit->archived_at->toIso8601String(),
                'retention_until' => $audit->retention_until->toIso8601String(),
                'storage_location' => 'WORM (Object Lock)',
                'file_size_bytes' => $audit->file_size,
            ],
            'security_info' => [
                'encryption' => 'AES-256-GCM',
                'hash_algorithm' => 'SHA-256',
                'original_hash' => substr($audit->original_hash, 0, 32) . '...',
                'encrypted_hash' => substr($audit->encrypted_hash, 0, 32) . '...',
            ],
            'signatures' => [
                'bailleur_signed_at' => $metadata['bailleur_signed_at'] ?? null,
                'locataire_signed_at' => $metadata['locataire_signed_at'] ?? null,
                'cachet_electronique' => $metadata['cachet_electronique'] ?
                    substr($metadata['cachet_electronique'], 0, 16) . '...' : null,
            ],
            'verification_history' => [
                'total_verifications' => $audit->verification_count,
                'last_verified_at' => $audit->last_verified_at?->toIso8601String(),
            ],
            'legal_compliance' => [
                'standard' => 'FR-032 (10 years retention)',
                'law_reference' => 'Loi L/2016/037/AN',
                'worm_protected' => true,
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Log une violation d'intégrité
     */
    protected function logIntegrityViolation(
        Contract $contract,
        IntegrityAudit $audit,
        string $type,
        ?string $details = null
    ): void {
        Log::critical('INTEGRITY VIOLATION DETECTED', [
            'type' => $type,
            'contract_id' => $contract->id,
            'contract_reference' => $contract->numero_contrat,
            'audit_id' => $audit->id,
            'details' => $details,
            'detected_at' => now()->toIso8601String(),
        ]);

        // Record violation in audit
        $audit->update([
            'integrity_violations' => $audit->integrity_violations + 1,
            'last_violation_at' => now(),
            'last_violation_type' => $type,
        ]);
    }

    /**
     * Envoie une alerte en cas de problème d'intégrité
     */
    protected function sendIntegrityAlert(array $results): void
    {
        // TODO: Implement email/SMS/notification alert
        Log::alert('INTEGRITY CHECK FAILED - Immediate attention required', [
            'invalid_contracts' => $results['invalid'],
            'errors' => $results['errors'],
            'violations' => $results['violations'],
        ]);
    }

    /**
     * Récupère un contrat archivé pour téléchargement
     * Avec vérification d'intégrité préalable
     */
    public function getArchivedContract(Contract $contract): string
    {
        // Verify integrity before serving
        $verification = $this->verifyContractIntegrity($contract);

        if (!$verification['verified']) {
            throw new Exception('Contract integrity verification failed: ' . $verification['status']);
        }

        $audit = IntegrityAudit::where('entity_type', 'contract')
            ->where('entity_id', $contract->id)
            ->latest()
            ->firstOrFail();

        $encryptedContent = Storage::disk($audit->storage_disk)->get($audit->file_path);

        return $this->encryptionService->decrypt($encryptedContent);
    }
}
