<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SignatureService
{
    protected OtpService $otpService;
    protected ?IntegrityService $integrityService = null;

    public function __construct(OtpService $otpService, ?IntegrityService $integrityService = null)
    {
        $this->otpService = $otpService;
        $this->integrityService = $integrityService;
    }

    /**
     * Request OTP for signature verification
     */
    public function requestSignatureOtp(User $user, Contract $contract): array
    {
        // Generate signature-specific OTP
        $result = $this->otpService->generate($user->telephone);

        Log::info('Signature OTP requested', [
            'user_id' => $user->id,
            'contract_id' => $contract->id,
            'contract_reference' => $contract->reference,
        ]);

        return $result;
    }

    /**
     * Verify OTP and sign contract
     */
    public function verifyAndSign(
        Contract $contract,
        User $user,
        string $otp,
        string $ipAddress,
        string $userAgent
    ): array {
        // Verify OTP
        if (!$this->otpService->verify($user->telephone, $otp)) {
            return [
                'success' => false,
                'message' => 'Code OTP invalide',
            ];
        }

        // Determine user role in contract (support both field names)
        $isProprietaire = ($contract->proprietaire_id === $user->id) || ($contract->bailleur_id === $user->id);
        $isLocataire = $contract->locataire_id === $user->id;

        if (!$isProprietaire && !$isLocataire) {
            return [
                'success' => false,
                'message' => 'Vous n\'êtes pas partie prenante de ce contrat',
            ];
        }

        // Check if user already signed
        $hasProprietaireSigned = $contract->bailleur_signed_at !== null;
        $hasLocataireSigned = $contract->locataire_signed_at !== null;

        if ($isProprietaire && $hasProprietaireSigned) {
            return [
                'success' => false,
                'message' => 'Vous avez déjà signé ce contrat',
            ];
        }

        if ($isLocataire && $hasLocataireSigned) {
            return [
                'success' => false,
                'message' => 'Vous avez déjà signé ce contrat',
            ];
        }

        // Generate signature data
        $signatureData = $this->generateSignatureData($user, $contract, $ipAddress, $userAgent);

        // Update contract with signature - use existing DB column names
        $now = now();
        $updateData = [];

        if ($isProprietaire) {
            $updateData['bailleur_signed_at'] = $now;
            $updateData['bailleur_signature_ip'] = $ipAddress;
            $updateData['bailleur_signature_data'] = json_encode($signatureData);
        } else {
            $updateData['locataire_signed_at'] = $now;
            $updateData['locataire_signature_ip'] = $ipAddress;
            $updateData['locataire_signature_data'] = json_encode($signatureData);
        }

        $contract->update($updateData);

        // Update contract status based on who signed
        $freshContract = $contract->fresh();
        $bothSigned = $this->checkIfFullySigned($freshContract);

        if (!$bothSigned) {
            // Only one party has signed - update status to indicate who needs to sign next
            if ($isLocataire && !$hasProprietaireSigned) {
                // Locataire signed first, waiting for proprietaire
                $freshContract->update(['statut' => 'EN_ATTENTE_SIGNATURE_BAILLEUR']);
            } elseif ($isProprietaire && !$hasLocataireSigned) {
                // Proprietaire signed first, waiting for locataire
                $freshContract->update(['statut' => 'EN_ATTENTE_SIGNATURE_LOCATAIRE']);
            }
        }

        Log::info('Contract signed', [
            'contract_id' => $contract->id,
            'user_id' => $user->id,
            'role' => $isProprietaire ? 'proprietaire' : 'locataire',
            'signature_hash' => $signatureData['hash'],
            'new_status' => $freshContract->statut,
        ]);

        return [
            'success' => true,
            'message' => 'Contrat signé avec succès',
            'signature' => $signatureData,
            'both_signed' => $bothSigned,
        ];
    }

    /**
     * Generate signature data with SHA-256 hash
     */
    protected function generateSignatureData(
        User $user,
        Contract $contract,
        string $ipAddress,
        string $userAgent
    ): array {
        $timestamp = now();

        // Create data string for hashing
        $dataToHash = implode('|', [
            $contract->id,
            $contract->numero_contrat ?? '',
            $user->id,
            $user->nom_complet ?? $user->telephone,
            $timestamp->toIso8601String(),
            $ipAddress,
            $contract->pdf_url ?? '',
            $contract->pdf_hash ?? '',
        ]);

        // Generate SHA-256 hash
        $hash = hash('sha256', $dataToHash);

        // Generate signature ID
        $signatureId = 'SIG-' . strtoupper(Str::random(12));

        return [
            'signature_id' => $signatureId,
            'user_id' => $user->id,
            'user_name' => $user->nom_complet ?? $user->telephone,
            'user_type' => $contract->bailleur_id === $user->id ? 'proprietaire' : 'locataire',
            'timestamp' => $timestamp->toIso8601String(),
            'ip_address' => $ipAddress,
            'user_agent' => substr($userAgent, 0, 255),
            'hash' => $hash,
            'hash_algorithm' => 'SHA-256',
            'verification_method' => 'OTP_SMS',
            'legal_reference' => 'Loi L/2016/037/AN Article 15',
        ];
    }

    /**
     * Check if both parties have signed
     */
    public function checkIfFullySigned(Contract $contract): bool
    {
        return $contract->bailleur_signed_at !== null && $contract->locataire_signed_at !== null;
    }

    /**
     * Verify signature integrity using SHA-256 hash
     */
    public function verifySignatureIntegrity(Contract $contract, array $signature): bool
    {
        // Recreate the data string
        $dataToHash = implode('|', [
            $contract->id,
            $contract->numero_contrat ?? '',
            $signature['user_id'],
            $signature['user_name'],
            $signature['timestamp'],
            $signature['ip_address'],
            $contract->pdf_url ?? '',
            $contract->pdf_hash ?? '',
        ]);

        // Verify hash matches
        $computedHash = hash('sha256', $dataToHash);

        return hash_equals($signature['hash'], $computedHash);
    }

    /**
     * Get signature certificate data for display
     */
    public function getSignatureCertificate(Contract $contract): array
    {
        // Get signatures from stored JSON data
        $signatures = [];

        if ($contract->bailleur_signature_data) {
            $bailSig = json_decode($contract->bailleur_signature_data, true);
            if ($bailSig) $signatures[] = $bailSig;
        }

        if ($contract->locataire_signature_data) {
            $locSig = json_decode($contract->locataire_signature_data, true);
            if ($locSig) $signatures[] = $locSig;
        }

        return [
            'contract_reference' => $contract->numero_contrat,
            'document_hash' => $contract->pdf_hash,
            'signatures' => array_map(function ($sig) {
                return [
                    'signature_id' => $sig['signature_id'] ?? 'N/A',
                    'signer' => $sig['user_name'] ?? 'N/A',
                    'role' => $sig['user_type'] ?? 'N/A',
                    'date' => $sig['timestamp'] ?? 'N/A',
                    'hash' => isset($sig['hash']) ? substr($sig['hash'], 0, 16) . '...' : 'N/A',
                    'verified' => true,
                ];
            }, $signatures),
            'fully_signed' => $this->checkIfFullySigned($contract),
            'legal_validity' => 'Conforme à la Loi L/2016/037/AN',
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Lock contract after both signatures (make immutable)
     */
    public function lockContract(Contract $contract): void
    {
        if (!$this->checkIfFullySigned($contract)) {
            throw new \Exception('Cannot lock contract: not fully signed');
        }

        // Calculate final document hash including all signatures
        $finalHash = $this->calculateFinalDocumentHash($contract);

        // Use existing DB columns - statut already updated to 'SIGNE' by controller
        $contract->update([
            'cachet_electronique' => $finalHash,
            'cachet_applied_at' => now(),
            'is_locked' => true,
            'locked_at' => now(),
            'scheduled_deletion_at' => now()->addYears(10),
        ]);

        // Archive the listing when contract is fully signed
        $this->archiveListing($contract);

        // Archive contract to WORM storage for tamper protection
        $this->archiveToSecureStorage($contract);

        Log::info('Contract locked after full signature', [
            'contract_id' => $contract->id,
            'final_hash' => $finalHash,
        ]);
    }

    /**
     * Archive contract to WORM storage (Object Lock - cannot be deleted for 10 years)
     */
    protected function archiveToSecureStorage(Contract $contract): void
    {
        if (!$this->integrityService) {
            $this->integrityService = app(IntegrityService::class);
        }

        try {
            $result = $this->integrityService->archiveSignedContract($contract);
            Log::info('Contract archived to WORM storage', [
                'contract_id' => $contract->id,
                'secure_path' => $result['secure_path'],
                'audit_id' => $result['audit_id'],
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the signature process
            Log::error('Failed to archive contract to WORM storage', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Archive the listing associated with a fully signed contract
     */
    protected function archiveListing(Contract $contract): void
    {
        if (!$contract->listing_id) {
            return;
        }

        $listing = $contract->listing;
        if (!$listing) {
            Log::warning('Listing not found for archiving', [
                'contract_id' => $contract->id,
                'listing_id' => $contract->listing_id,
            ]);
            return;
        }

        // Only archive if listing is currently active
        if ($listing->statut === 'ACTIVE') {
            $listing->update([
                'statut' => 'ARCHIVEE',
                'disponible' => false,
            ]);

            Log::info('Listing archived after contract signature', [
                'listing_id' => $listing->id,
                'contract_id' => $contract->id,
                'previous_status' => 'ACTIVE',
            ]);
        }
    }

    /**
     * Calculate final document hash including all signatures
     */
    protected function calculateFinalDocumentHash(Contract $contract): string
    {
        $dataToHash = implode('|', [
            $contract->id,
            $contract->numero_contrat ?? '',
            $contract->pdf_hash ?? '',
            $contract->bailleur_signature_data ?? '',
            $contract->locataire_signature_data ?? '',
            $contract->bailleur_signed_at?->toIso8601String() ?? '',
            $contract->locataire_signed_at?->toIso8601String() ?? '',
        ]);

        return hash('sha256', $dataToHash);
    }

    /**
     * Check if contract is within retraction period
     */
    public function isWithinRetractionPeriod(Contract $contract): bool
    {
        // Check if both signatures exist
        if (!$this->checkIfFullySigned($contract)) {
            return false;
        }

        // Use the later signature date as the complete date
        $completeDate = max(
            $contract->bailleur_signed_at,
            $contract->locataire_signed_at
        );

        // Retraction period is 48 hours from complete signature
        $retractionExpires = $completeDate->addHours(48);

        return now()->lessThan($retractionExpires);
    }

    /**
     * Get remaining retraction time in seconds
     */
    public function getRemainingRetractionTime(Contract $contract): ?int
    {
        if (!$this->checkIfFullySigned($contract)) {
            return null;
        }

        // Use the later signature date as the complete date
        $completeDate = max(
            $contract->bailleur_signed_at,
            $contract->locataire_signed_at
        );

        // Retraction period is 48 hours from complete signature
        $retractionExpires = $completeDate->copy()->addHours(48);

        if (now()->greaterThanOrEqualTo($retractionExpires)) {
            return 0;
        }

        return now()->diffInSeconds($retractionExpires, false);
    }
}
