<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * File Security Helper
 *
 * Provides comprehensive file upload security including:
 * - Real MIME type validation (finfo)
 * - Magic bytes verification
 * - Extension whitelist
 * - File size limits
 * - UUID filename generation (never use user-provided names)
 * - ClamAV antivirus scanning (via network)
 * - PDF threat scanning
 *
 * @see https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload
 */
class FileSecurityHelper
{
    /**
     * Maximum file sizes per category (in KB)
     */
    private static array $maxSizes = [
        'image' => 10240,      // 10MB
        'document' => 20480,   // 20MB
        'audio' => 51200,      // 50MB
        'avatar' => 2048,      // 2MB
        'certificate' => 5120, // 5MB
    ];

    /**
     * Magic bytes signatures for common file types
     */
    private static array $magicBytes = [
        // Images
        'jpeg' => ["\xFF\xD8\xFF"],
        'jpg'  => ["\xFF\xD8\xFF"],
        'png'  => ["\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"],
        'gif'  => ["\x47\x49\x46\x38"],
        'webp' => ["\x52\x49\x46\x46"], // RIFF (needs additional check for WEBP)
        'bmp'  => ["\x42\x4D"],
        'heic' => ["\x00\x00\x00"], // ftyp heic/mif1

        // Documents
        'pdf'  => ["\x25\x50\x44\x46"], // %PDF

        // Audio
        'mp3'  => ["\xFF\xFB", "\xFF\xFA", "\xFF\xF3", "\x49\x44\x33"], // ID3 tag or sync
        'mp4'  => ["\x00\x00\x00"], // ftyp at offset 4
        'm4a'  => ["\x00\x00\x00"],
        'ogg'  => ["\x4F\x67\x67\x53"], // OggS
        'wav'  => ["\x52\x49\x46\x46"], // RIFF
        'webm' => ["\x1A\x45\xDF\xA3"], // EBML
        'aac'  => ["\xFF\xF1", "\xFF\xF9"],
        'flac' => ["\x66\x4C\x61\x43"], // fLaC
    ];

    /**
     * Allowed MIME types per category
     */
    private static array $allowedMimes = [
        'image' => [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/heic',
            'image/heif',
        ],
        'document' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ],
        'audio' => [
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/m4a',
            'audio/x-m4a',
            'audio/ogg',
            'audio/wav',
            'audio/x-wav',
            'audio/webm',
            'audio/aac',
            'audio/flac',
            'video/mp4', // m4a sometimes detected as video/mp4
        ],
        'avatar' => [
            'image/jpeg',
            'image/png',
            'image/webp',
        ],
        'certificate' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ],
        'media' => [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'audio/mpeg',
            'audio/mp4',
            'audio/m4a',
            'audio/x-m4a',
            'audio/ogg',
            'audio/wav',
            'audio/webm',
            'video/mp4',
            'video/webm',
        ],
    ];

    /**
     * Allowed extensions per category
     */
    private static array $allowedExtensions = [
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'],
        'document' => ['pdf', 'jpg', 'jpeg', 'png'],
        'audio' => ['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'webm', 'aac', 'flac'],
        'avatar' => ['jpg', 'jpeg', 'png', 'webp'],
        'certificate' => ['pdf', 'jpg', 'jpeg', 'png'],
        'media' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'mp4', 'm4a', 'ogg', 'wav', 'webm', 'aac'],
    ];

    /**
     * Dangerous file extensions to ALWAYS block (executable code)
     */
    private static array $dangerousExtensions = [
        // PHP
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phar', 'inc',
        // Executables
        'exe', 'dll', 'bat', 'cmd', 'sh', 'bash', 'zsh', 'ksh', 'csh',
        // Scripts
        'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
        'py', 'pyc', 'pyo', 'pyd', 'pyw',
        'pl', 'pm', 'cgi', 'fcgi',
        'rb', 'erb', 'rhtml',
        'lua',
        // .NET / Java
        'asp', 'aspx', 'ascx', 'ashx', 'asmx', 'axd',
        'jsp', 'jspx', 'jsf', 'jspa',
        'jar', 'war', 'ear', 'class',
        // Config
        'htaccess', 'htpasswd', 'config', 'ini', 'env',
        // Web
        'svg', // Can contain XSS
        'html', 'htm', 'xhtml', 'shtml', 'shtm',
        'xml', 'xsl', 'xslt', 'xsd',
        'swf', 'fla',
        // Windows
        'vbs', 'vbe', 'wsf', 'wsh', 'ws',
        'ps1', 'psm1', 'psd1', 'ps1xml',
        'scr', 'com', 'msi', 'msp', 'msu',
        'hta', 'cpl', 'msc', 'inf',
        'reg', 'scf', 'lnk', 'pif',
        // macOS
        'app', 'command', 'workflow',
        // Linux
        'so', 'run', 'bin', 'elf',
        // Archives (can contain exploits)
        'iso', 'dmg', 'vhd', 'vmdk',
    ];

    /**
     * Full validation pipeline for file upload
     *
     * @param UploadedFile $file The uploaded file
     * @param string $category Category: 'image', 'document', 'audio', 'avatar', 'certificate', 'media'
     * @param bool $scanVirus Whether to scan with ClamAV
     * @return array ['valid' => bool, 'error' => string|null, 'secure_name' => string|null]
     */
    public static function validateUpload(
        UploadedFile $file,
        string $category = 'image',
        bool $scanVirus = true
    ): array {
        $context = [
            'original_name' => $file->getClientOriginalName(),
            'category' => $category,
            'size' => $file->getSize(),
        ];

        // 1. Check if file is valid upload
        if (!$file->isValid()) {
            Log::warning('[SECURITY] Invalid file upload', $context);
            return self::error('Erreur lors du téléchargement du fichier');
        }

        // 2. Check file size
        $maxSizeKb = self::$maxSizes[$category] ?? 10240;
        $sizeKb = $file->getSize() / 1024;
        if ($sizeKb > $maxSizeKb) {
            Log::warning('[SECURITY] File too large', array_merge($context, [
                'size_kb' => $sizeKb,
                'max_kb' => $maxSizeKb,
            ]));
            return self::error("Le fichier dépasse la taille maximale de " . round($maxSizeKb / 1024, 1) . "MB");
        }

        // 3. Check extension is allowed (and not dangerous)
        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, self::$dangerousExtensions)) {
            Log::warning('[SECURITY] Dangerous extension blocked', array_merge($context, [
                'extension' => $extension,
            ]));
            return self::error('Ce type de fichier n\'est pas autorisé pour des raisons de sécurité');
        }

        $allowedExtensions = self::$allowedExtensions[$category] ?? [];
        if (!empty($allowedExtensions) && !in_array($extension, $allowedExtensions)) {
            Log::warning('[SECURITY] Extension not in whitelist', array_merge($context, [
                'extension' => $extension,
                'allowed' => $allowedExtensions,
            ]));
            return self::error('Extension de fichier non autorisée. Extensions acceptées: ' . implode(', ', $allowedExtensions));
        }

        // 4. Validate REAL MIME type using finfo (not client-provided)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMimeType = $finfo->file($file->getPathname());
        $context['real_mime'] = $realMimeType;
        $context['client_mime'] = $file->getMimeType();

        $allowedMimes = self::$allowedMimes[$category] ?? [];
        if (!empty($allowedMimes) && !in_array($realMimeType, $allowedMimes)) {
            Log::warning('[SECURITY] MIME type not allowed', array_merge($context, [
                'allowed_mimes' => $allowedMimes,
            ]));
            return self::error('Type de fichier non autorisé pour cette catégorie');
        }

        // 5. Validate magic bytes match file type
        if (!self::validateMagicBytes($file, $extension)) {
            Log::warning('[SECURITY] Magic bytes mismatch', $context);
            return self::error('Le contenu du fichier ne correspond pas à son extension');
        }

        // 6. For PDFs, scan for embedded threats
        if ($extension === 'pdf' || $realMimeType === 'application/pdf') {
            $pdfCheck = self::scanPdfForThreats($file);
            if (!$pdfCheck['safe']) {
                Log::warning('[SECURITY] PDF threat detected', array_merge($context, [
                    'threat' => $pdfCheck['threat'],
                ]));
                return self::error('Ce PDF contient du contenu potentiellement dangereux: ' . $pdfCheck['threat']);
            }
        }

        // 7. ClamAV virus scan (if enabled)
        if ($scanVirus) {
            $virusCheck = self::scanWithClamAV($file);
            if (!$virusCheck['clean']) {
                Log::critical('[SECURITY] VIRUS DETECTED', array_merge($context, [
                    'virus' => $virusCheck['virus'],
                ]));
                return self::error('Fichier infecté détecté et bloqué');
            }
            if (!($virusCheck['skipped'] ?? false)) {
                $context['virus_scanned'] = true;
            }
        }

        // Generate secure filename
        $secureName = self::generateSecureFilename($extension);

        Log::info('[SECURITY] File upload validated', array_merge($context, [
            'secure_name' => $secureName,
        ]));

        return [
            'valid' => true,
            'error' => null,
            'secure_name' => $secureName,
            'mime_type' => $realMimeType,
            'extension' => $extension,
        ];
    }

    /**
     * Legacy method for backwards compatibility
     */
    public static function validateFile(UploadedFile $file, string $category = 'image', int $maxSizeKb = 5120): array
    {
        $result = self::validateUpload($file, $category, true);
        return [
            'valid' => $result['valid'],
            'error' => $result['error'],
        ];
    }

    /**
     * Validate magic bytes match the expected file type
     */
    public static function validateMagicBytes(UploadedFile $file, string $extension): bool
    {
        $extension = strtolower($extension);

        // If we don't have magic bytes for this type, allow it (can't verify)
        if (!isset(self::$magicBytes[$extension])) {
            return true;
        }

        $handle = fopen($file->getPathname(), 'rb');
        if (!$handle) {
            return false;
        }

        // Read first 16 bytes (enough for most signatures)
        $bytes = fread($handle, 16);
        fclose($handle);

        if ($bytes === false || strlen($bytes) < 4) {
            return false;
        }

        $signatures = self::$magicBytes[$extension];

        // Special handling for WEBP (RIFF....WEBP)
        if ($extension === 'webp') {
            return str_starts_with($bytes, "\x52\x49\x46\x46") &&
                   substr($bytes, 8, 4) === "WEBP";
        }

        // Special handling for MP4/M4A (ftyp box at offset 4)
        if (in_array($extension, ['mp4', 'm4a'])) {
            return substr($bytes, 4, 4) === 'ftyp';
        }

        // Special handling for HEIC/HEIF (ftyp heic/mif1/msf1)
        if (in_array($extension, ['heic', 'heif'])) {
            $ftyp = substr($bytes, 4, 4);
            $brand = substr($bytes, 8, 4);
            return $ftyp === 'ftyp' && in_array($brand, ['heic', 'mif1', 'msf1', 'heif']);
        }

        // Check each signature
        foreach ($signatures as $signature) {
            if (str_starts_with($bytes, $signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Scan PDF for potential threats (JavaScript, embedded files, etc.)
     */
    public static function scanPdfForThreats(UploadedFile $file): array
    {
        $content = file_get_contents($file->getPathname());
        if ($content === false) {
            return ['safe' => false, 'threat' => 'Impossible de lire le fichier'];
        }

        // Critical threats that should always block
        $criticalPatterns = [
            '/JavaScript' => 'JavaScript intégré',
            '/JS' => 'JavaScript intégré',
            '/Launch' => 'Action de lancement externe',
            '/EmbeddedFile' => 'Fichier intégré',
            '/OpenAction' => 'Action automatique au démarrage',
            '/AA' => 'Actions additionnelles automatiques',
            '/RichMedia' => 'Média Flash/enrichi',
            '/XFA' => 'Formulaire XFA (Adobe)',
            '/AcroForm' => 'Formulaire interactif',
        ];

        foreach ($criticalPatterns as $pattern => $description) {
            if (stripos($content, $pattern) !== false) {
                return ['safe' => false, 'threat' => $description];
            }
        }

        return ['safe' => true, 'threat' => null];
    }

    /**
     * Scan file with ClamAV antivirus via network (TCP)
     *
     * ClamAV runs in a separate Docker container accessible via hostname 'clamav'
     */
    public static function scanWithClamAV(UploadedFile $file): array
    {
        $host = env('CLAMAV_HOST', 'clamav');
        $port = (int) env('CLAMAV_PORT', 3310);

        try {
            // Connect to ClamAV daemon via TCP
            $socket = @fsockopen($host, $port, $errno, $errstr, 5);

            if (!$socket) {
                Log::debug('[CLAMAV] Connection failed, skipping scan', [
                    'host' => $host,
                    'port' => $port,
                    'error' => $errstr,
                ]);
                return ['clean' => true, 'virus' => null, 'skipped' => true];
            }

            // Use INSTREAM command to send file content
            $fileContent = file_get_contents($file->getPathname());
            $fileSize = strlen($fileContent);

            // Send zINSTREAM command (z = null-terminated)
            fwrite($socket, "zINSTREAM\0");

            // Send file in chunks with size prefix (4 bytes, network byte order)
            $chunkSize = 8192;
            $offset = 0;

            while ($offset < $fileSize) {
                $chunk = substr($fileContent, $offset, $chunkSize);
                $chunkLen = strlen($chunk);

                // Write chunk length as 4-byte big-endian
                fwrite($socket, pack('N', $chunkLen));
                fwrite($socket, $chunk);

                $offset += $chunkLen;
            }

            // Send zero-length chunk to indicate end
            fwrite($socket, pack('N', 0));

            // Read response
            $response = '';
            while (!feof($socket)) {
                $response .= fread($socket, 4096);
            }
            fclose($socket);

            // Remove null terminator
            $response = trim($response, "\0\n\r ");

            // Parse response
            if (str_contains($response, 'OK')) {
                Log::debug('[CLAMAV] File clean', [
                    'file' => $file->getClientOriginalName(),
                ]);
                return ['clean' => true, 'virus' => null];
            }

            // Check for FOUND (virus detected)
            if (preg_match('/stream: (.+) FOUND/', $response, $matches)) {
                $virusName = trim($matches[1]);
                Log::critical('[CLAMAV] VIRUS DETECTED', [
                    'virus' => $virusName,
                    'file' => $file->getClientOriginalName(),
                    'size' => $fileSize,
                ]);
                return ['clean' => false, 'virus' => $virusName];
            }

            // Unknown response
            Log::warning('[CLAMAV] Unexpected response', ['response' => $response]);
            return ['clean' => true, 'virus' => null, 'skipped' => true];

        } catch (\Exception $e) {
            Log::error('[CLAMAV] Scan failed', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
            ]);
            return ['clean' => true, 'virus' => null, 'skipped' => true];
        }
    }

    /**
     * Generate a secure filename using UUID (never use user-provided names)
     */
    public static function generateSecureFilename(string $extension): string
    {
        // Sanitize extension (only alphanumeric)
        $extension = preg_replace('/[^a-z0-9]/', '', strtolower($extension));
        if (empty($extension)) {
            $extension = 'bin';
        }

        // Use UUID v4 for filename
        return Str::uuid()->toString() . '.' . $extension;
    }

    /**
     * Get allowed extensions for a category
     */
    public static function getAllowedExtensions(string $category): array
    {
        return self::$allowedExtensions[$category] ?? [];
    }

    /**
     * Get allowed MIME types for a category
     */
    public static function getAllowedMimes(string $category): array
    {
        return self::$allowedMimes[$category] ?? [];
    }

    /**
     * Get max file size for a category (in bytes)
     */
    public static function getMaxSize(string $category): int
    {
        $sizeKb = self::$maxSizes[$category] ?? 10240;
        return $sizeKb * 1024;
    }

    /**
     * Helper to create error response
     */
    private static function error(string $message): array
    {
        return [
            'valid' => false,
            'error' => $message,
            'secure_name' => null,
        ];
    }
}
