<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Service de chiffrement AES-256-GCM pour les documents sensibles
 *
 * AES-256-GCM est choisi car:
 * - Très performant (accélération matérielle AES-NI)
 * - Authentifié (détecte les modifications)
 * - ~10x plus rapide que CBC pour gros fichiers
 */
class EncryptionService
{
    private const CIPHER = 'aes-256-gcm';
    private const TAG_LENGTH = 16;
    private const IV_LENGTH = 12;

    private string $key;

    public function __construct()
    {
        $key = config('app.document_encryption_key', env('DOCUMENT_ENCRYPTION_KEY'));

        if (empty($key)) {
            // Use APP_KEY as fallback (dérivé pour documents)
            $key = config('app.key');
        }

        // Derive a 256-bit key using SHA-256
        $this->key = hash('sha256', $key, true);
    }

    /**
     * Chiffre les données binaires avec AES-256-GCM
     * Format: IV (12 bytes) + Tag (16 bytes) + Encrypted Data
     */
    public function encrypt(string $data): string
    {
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';

        $encrypted = openssl_encrypt(
            $data,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH
        );

        if ($encrypted === false) {
            throw new Exception('Encryption failed: ' . openssl_error_string());
        }

        return $iv . $tag . $encrypted;
    }

    /**
     * Déchiffre les données avec vérification d'intégrité
     */
    public function decrypt(string $encryptedData): string
    {
        $minLength = self::IV_LENGTH + self::TAG_LENGTH + 1;
        if (strlen($encryptedData) < $minLength) {
            throw new Exception('Invalid encrypted data: too short');
        }

        $iv = substr($encryptedData, 0, self::IV_LENGTH);
        $tag = substr($encryptedData, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($encryptedData, self::IV_LENGTH + self::TAG_LENGTH);

        $decrypted = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($decrypted === false) {
            throw new Exception('Decryption failed: data may be corrupted or tampered');
        }

        return $decrypted;
    }

    /**
     * Vérifie si des données sont chiffrées (heuristique)
     */
    public function isEncrypted(string $data): bool
    {
        // PDF files start with %PDF, encrypted data won't
        return strlen($data) >= 29 && substr($data, 0, 4) !== '%PDF';
    }

    /**
     * Encrypt file on disk (legacy method for compatibility)
     */
    public function encryptFile(string $filePath, string $disk = 'documents'): string
    {
        $content = Storage::disk($disk)->get($filePath);
        $encrypted = $this->encrypt($content);

        // Generate encrypted filename
        $encryptedPath = preg_replace('/\.pdf$/i', '.enc', $filePath);

        Storage::disk($disk)->put($encryptedPath, $encrypted);
        Storage::disk($disk)->delete($filePath);

        return $encryptedPath;
    }

    /**
     * Decrypt file from disk (legacy method)
     */
    public function decryptFile(string $encryptedPath, string $disk = 'documents'): string
    {
        $encrypted = Storage::disk($disk)->get($encryptedPath);
        return $this->decrypt($encrypted);
    }

    /**
     * Encrypt and store signed contract (FR-034: 10 year retention)
     */
    public function encryptSignedContract(string $contractId, string $pdfPath): array
    {
        // Encrypt the PDF
        $encryptedPath = $this->encryptFile($pdfPath);

        // Generate SHA-256 hash of encrypted file for integrity
        $encryptedContent = Storage::disk('s3')->get($encryptedPath);
        $hash = hash('sha256', $encryptedContent);

        // Store metadata in database (already done in ContractService)
        return [
            'encrypted_path' => $encryptedPath,
            'hash' => $hash,
            'encrypted_at' => now()->toIso8601String(),
            'expires_at' => now()->addYears(10)->toIso8601String(), // 10 year retention
        ];
    }

    /**
     * Decrypt and serve contract with watermark
     */
    public function decryptAndWatermark(string $encryptedPath, string $userName, \DateTime $downloadDate): string
    {
        // Decrypt the PDF
        $pdfContent = $this->decryptFile($encryptedPath);

        // Add watermark "Téléchargé par [Nom] le [Date]" (FR-036)
        // This would require PDF manipulation library (e.g., TCPDF, FPDF)
        // For now, just return decrypted content
        // TODO: Implement watermark overlay

        $watermarkText = "Téléchargé par {$userName} le " . $downloadDate->format('d/m/Y à H:i');

        // Save temporarily for download
        $tempPath = 'temp/' . uniqid() . '.pdf';
        Storage::disk('local')->put($tempPath, $pdfContent);

        return storage_path('app/' . $tempPath);
    }

    /**
     * Verify encrypted file integrity
     */
    public function verifyIntegrity(string $encryptedPath, string $expectedHash): bool
    {
        $content = Storage::disk('s3')->get($encryptedPath);
        $actualHash = hash('sha256', $content);

        return hash_equals($expectedHash, $actualHash);
    }

    /**
     * Encrypt sensitive user data (e.g., CNI, passport)
     */
    public function encryptSensitiveData(string $data): string
    {
        return Crypt::encryptString($data);
    }

    /**
     * Decrypt sensitive user data
     */
    public function decryptSensitiveData(string $encrypted): string
    {
        return Crypt::decryptString($encrypted);
    }
}
