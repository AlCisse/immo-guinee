<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class FileSecurityHelper
{
    /**
     * Magic bytes signatures for common file types
     */
    private static array $magicBytes = [
        // Images
        'jpeg' => ["\xFF\xD8\xFF"],
        'jpg'  => ["\xFF\xD8\xFF"],
        'png'  => ["\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"],
        'gif'  => ["\x47\x49\x46\x38"],
        'webp' => ["\x52\x49\x46\x46", "\x57\x45\x42\x50"], // RIFF...WEBP
        'bmp'  => ["\x42\x4D"],

        // Documents
        'pdf'  => ["\x25\x50\x44\x46"], // %PDF

        // Audio
        'mp3'  => ["\xFF\xFB", "\xFF\xFA", "\xFF\xF3", "\x49\x44\x33"], // ID3 tag or sync
        'mp4'  => ["\x00\x00\x00", "\x66\x74\x79\x70"], // ftyp
        'm4a'  => ["\x00\x00\x00", "\x66\x74\x79\x70"],
        'ogg'  => ["\x4F\x67\x67\x53"], // OggS
        'wav'  => ["\x52\x49\x46\x46"], // RIFF
        'webm' => ["\x1A\x45\xDF\xA3"], // EBML
        'aac'  => ["\xFF\xF1", "\xFF\xF9"],
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
            'audio/webm',
            'audio/aac',
            'video/mp4', // m4a sometimes detected as video/mp4
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
        ],
    ];

    /**
     * Dangerous file extensions to always block
     */
    private static array $dangerousExtensions = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phar',
        'exe', 'dll', 'bat', 'cmd', 'sh', 'bash',
        'js', 'jsx', 'ts', 'tsx', 'mjs',
        'py', 'pyc', 'pyo', 'pyd',
        'pl', 'pm', 'cgi',
        'asp', 'aspx', 'ascx',
        'jsp', 'jspx',
        'htaccess', 'htpasswd',
        'svg', // Can contain XSS
        'html', 'htm', 'xhtml',
        'xml', 'xsl', 'xslt',
        'swf', 'jar', 'war',
        'vbs', 'vbe', 'wsf', 'wsh',
        'ps1', 'psm1', 'psd1',
        'scr', 'com', 'msi', 'msp',
        'hta', 'cpl', 'msc',
    ];

    /**
     * Validate file security
     *
     * @param UploadedFile $file
     * @param string $category 'image', 'document', 'audio', 'media'
     * @param int $maxSizeKb Maximum size in KB
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public static function validateFile(UploadedFile $file, string $category = 'image', int $maxSizeKb = 5120): array
    {
        // 1. Check file size
        $sizeKb = $file->getSize() / 1024;
        if ($sizeKb > $maxSizeKb) {
            return [
                'valid' => false,
                'error' => "Le fichier dépasse la taille maximale de {$maxSizeKb}KB"
            ];
        }

        // 2. Check extension is not dangerous
        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, self::$dangerousExtensions)) {
            Log::warning('Blocked dangerous file upload', [
                'extension' => $extension,
                'original_name' => $file->getClientOriginalName(),
            ]);
            return [
                'valid' => false,
                'error' => 'Ce type de fichier n\'est pas autorisé'
            ];
        }

        // 3. Check MIME type matches category
        $mimeType = $file->getMimeType();
        $allowedMimes = self::$allowedMimes[$category] ?? [];

        if (!empty($allowedMimes) && !in_array($mimeType, $allowedMimes)) {
            Log::warning('Invalid MIME type for upload', [
                'mime' => $mimeType,
                'expected_category' => $category,
                'original_name' => $file->getClientOriginalName(),
            ]);
            return [
                'valid' => false,
                'error' => 'Type de fichier non autorisé pour cette catégorie'
            ];
        }

        // 4. Validate magic bytes
        if (!self::validateMagicBytes($file, $extension)) {
            Log::warning('Magic bytes validation failed', [
                'extension' => $extension,
                'mime' => $mimeType,
                'original_name' => $file->getClientOriginalName(),
            ]);
            return [
                'valid' => false,
                'error' => 'Le contenu du fichier ne correspond pas à son extension'
            ];
        }

        // 5. For PDFs, check for malicious content
        if ($extension === 'pdf' || $mimeType === 'application/pdf') {
            $pdfCheck = self::scanPdfForThreats($file);
            if (!$pdfCheck['safe']) {
                Log::warning('PDF security threat detected', [
                    'threat' => $pdfCheck['threat'],
                    'original_name' => $file->getClientOriginalName(),
                ]);
                return [
                    'valid' => false,
                    'error' => 'Ce PDF contient du contenu potentiellement dangereux'
                ];
            }
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Validate magic bytes match the expected file type
     */
    public static function validateMagicBytes(UploadedFile $file, string $extension): bool
    {
        $extension = strtolower($extension);

        // If we don't have magic bytes for this type, allow it (but log)
        if (!isset(self::$magicBytes[$extension])) {
            return true;
        }

        $handle = fopen($file->getPathname(), 'rb');
        if (!$handle) {
            return false;
        }

        // Read first 12 bytes (enough for most signatures)
        $bytes = fread($handle, 12);
        fclose($handle);

        if ($bytes === false || strlen($bytes) < 2) {
            return false;
        }

        $signatures = self::$magicBytes[$extension];

        // Special handling for WEBP (RIFF....WEBP)
        if ($extension === 'webp') {
            return str_starts_with($bytes, "\x52\x49\x46\x46") &&
                   substr($bytes, 8, 4) === "\x57\x45\x42\x50";
        }

        // Special handling for MP4/M4A (ftyp box at offset 4)
        if (in_array($extension, ['mp4', 'm4a'])) {
            // Check for ftyp at offset 4
            return substr($bytes, 4, 4) === 'ftyp';
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

        // Dangerous PDF keywords
        $threats = [
            '/JavaScript' => 'JavaScript intégré',
            '/JS' => 'JavaScript intégré',
            '/Launch' => 'Action de lancement externe',
            '/EmbeddedFile' => 'Fichier intégré',
            '/OpenAction' => 'Action automatique',
            '/AA' => 'Actions additionnelles',
            '/RichMedia' => 'Media enrichi',
            '/XFA' => 'Formulaire XFA',
            '/ObjStm' => 'Flux d\'objets (peut masquer du contenu)',
            '/URI' => 'Liens externes (vérifier)',
        ];

        // Critical threats that should always block
        $criticalPatterns = [
            '/JavaScript',
            '/JS',
            '/Launch',
            '/EmbeddedFile',
        ];

        foreach ($criticalPatterns as $pattern) {
            if (stripos($content, $pattern) !== false) {
                return ['safe' => false, 'threat' => $threats[$pattern] ?? 'Contenu suspect'];
            }
        }

        return ['safe' => true, 'threat' => null];
    }

    /**
     * Scan file with ClamAV if available
     *
     * @param UploadedFile $file
     * @return array ['clean' => bool, 'virus' => string|null]
     */
    public static function scanWithClamAV(UploadedFile $file): array
    {
        // Check if ClamAV socket exists
        $socket = '/var/run/clamav/clamd.sock';
        if (!file_exists($socket)) {
            // ClamAV not available, skip
            return ['clean' => true, 'virus' => null, 'skipped' => true];
        }

        try {
            $socket = socket_create(AF_UNIX, SOCK_STREAM, 0);
            if (!socket_connect($socket, '/var/run/clamav/clamd.sock')) {
                return ['clean' => true, 'virus' => null, 'skipped' => true];
            }

            // Send SCAN command
            $cmd = "SCAN " . $file->getPathname() . "\n";
            socket_write($socket, $cmd, strlen($cmd));

            $response = socket_read($socket, 4096);
            socket_close($socket);

            // Parse response
            if (strpos($response, 'OK') !== false) {
                return ['clean' => true, 'virus' => null];
            }

            // Extract virus name
            if (preg_match('/: (.+) FOUND/', $response, $matches)) {
                Log::critical('Virus detected in upload', [
                    'virus' => $matches[1],
                    'file' => $file->getClientOriginalName(),
                ]);
                return ['clean' => false, 'virus' => $matches[1]];
            }

            return ['clean' => true, 'virus' => null];
        } catch (\Exception $e) {
            Log::error('ClamAV scan failed', ['error' => $e->getMessage()]);
            return ['clean' => true, 'virus' => null, 'skipped' => true];
        }
    }

    /**
     * Generate a secure filename
     */
    public static function generateSecureFilename(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        // Sanitize extension
        $extension = preg_replace('/[^a-z0-9]/', '', $extension);
        if (empty($extension)) {
            $extension = 'bin';
        }

        // Use UUID for filename
        return \Illuminate\Support\Str::uuid() . '.' . $extension;
    }

    /**
     * Get allowed extensions for a category
     */
    public static function getAllowedExtensions(string $category): array
    {
        return match($category) {
            'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'document' => ['pdf', 'jpg', 'jpeg', 'png'],
            'audio' => ['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'webm', 'aac'],
            'media' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'mp4', 'm4a', 'ogg', 'wav'],
            default => [],
        };
    }
}
