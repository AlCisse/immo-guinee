<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EncryptedMedia;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * EncryptedMediaController
 *
 * Handles E2E encrypted media upload, download, and confirmation.
 * The server stores only encrypted blobs - decryption keys are NEVER stored.
 * Keys are transmitted via WebSocket and stored only on client devices.
 */
class EncryptedMediaController extends Controller
{
    /**
     * Upload an encrypted media blob
     *
     * POST /messaging/{conversation}/encrypted-media
     *
     * The client encrypts the media before uploading.
     * Server stores the encrypted blob without ability to decrypt.
     */
    public function upload(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();

        // Verify user is participant in conversation
        if ($conversation->initiator_id !== $user->id &&
            $conversation->participant_id !== $user->id) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'blob' => 'required|file|max:51200', // 50MB max
            'media_type' => 'required|in:VOCAL,PHOTO,VIDEO',
            'iv' => 'required|string|min:16|max:32', // Base64 encoded 12-byte IV
            'auth_tag' => 'required|string|min:16|max:32', // Base64 encoded auth tag
            'original_size' => 'required|integer|min:1|max:52428800',
            'mime_type' => 'required|string|max:100',
            'duration_seconds' => 'nullable|integer|min:1|max:7200', // Max 2 hours
        ]);

        $file = $request->file('blob');

        // Validate file size against type limits
        $maxSize = EncryptedMedia::getMaxSizeForType($validated['media_type']);
        if ($validated['original_size'] > $maxSize) {
            return response()->json([
                'error' => 'Fichier trop volumineux',
                'max_size' => $maxSize,
                'max_size_formatted' => $this->formatBytes($maxSize),
            ], 422);
        }

        // Verify IV and auth_tag are valid base64
        if (!$this->isValidBase64($validated['iv']) ||
            !$this->isValidBase64($validated['auth_tag'])) {
            return response()->json(['error' => 'Paramètres de chiffrement invalides'], 422);
        }

        try {
            // Generate unique storage path
            $mediaId = Str::uuid()->toString();
            $storagePath = date('Y/m/d') . '/' . $mediaId . '.enc';

            // Store to temporary encrypted storage
            $disk = Storage::disk('encrypted-temp');
            $disk->put($storagePath, file_get_contents($file->path()));

            // Create database record
            $encryptedMedia = EncryptedMedia::create([
                'uploader_id' => $user->id,
                'conversation_id' => $conversation->id,
                'media_type' => $validated['media_type'],
                'storage_path' => $storagePath,
                'storage_disk' => 'encrypted-temp',
                'encrypted_size' => $file->getSize(),
                'original_size' => $validated['original_size'],
                'iv' => $validated['iv'],
                'auth_tag' => $validated['auth_tag'],
                'mime_type' => $validated['mime_type'],
                'duration_seconds' => $validated['duration_seconds'] ?? null,
                'expires_at' => Carbon::now()->addDays(EncryptedMedia::TTL_DAYS),
            ]);

            Log::info('[ENCRYPTED_MEDIA] Uploaded', [
                'media_id' => $encryptedMedia->id,
                'conversation_id' => $conversation->id,
                'uploader_id' => $user->id,
                'media_type' => $validated['media_type'],
                'encrypted_size' => $file->getSize(),
                'original_size' => $validated['original_size'],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $encryptedMedia->id,
                    'media_type' => $encryptedMedia->media_type,
                    'encrypted_size' => $encryptedMedia->encrypted_size,
                    'original_size' => $encryptedMedia->original_size,
                    'expires_at' => $encryptedMedia->expires_at->toIso8601String(),
                    'duration_seconds' => $encryptedMedia->duration_seconds,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('[ENCRYPTED_MEDIA] Upload failed', [
                'conversation_id' => $conversation->id,
                'uploader_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Échec de l\'upload du média',
            ], 500);
        }
    }

    /**
     * Download an encrypted media blob
     *
     * GET /messaging/encrypted-media/{encryptedMedia}/download
     *
     * Returns the encrypted blob. Client must decrypt using key from WebSocket.
     */
    public function download(Request $request, EncryptedMedia $encryptedMedia): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        $conversation = $encryptedMedia->conversation;

        // Verify user is participant
        if ($conversation->initiator_id !== $user->id &&
            $conversation->participant_id !== $user->id) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        // Check if expired
        if ($encryptedMedia->isExpired()) {
            return response()->json(['error' => 'Média expiré'], 410);
        }

        // Check if deleted
        if ($encryptedMedia->is_deleted) {
            return response()->json(['error' => 'Média non disponible'], 410);
        }

        // Get file from storage
        $disk = Storage::disk($encryptedMedia->storage_disk);
        if (!$disk->exists($encryptedMedia->storage_path)) {
            Log::error('[ENCRYPTED_MEDIA] File not found in storage', [
                'media_id' => $encryptedMedia->id,
                'storage_path' => $encryptedMedia->storage_path,
            ]);
            return response()->json(['error' => 'Média non trouvé'], 404);
        }

        // Track download (only for recipient, not uploader)
        if ($encryptedMedia->uploader_id !== $user->id) {
            $encryptedMedia->markAsDownloaded($user->id);

            Log::info('[ENCRYPTED_MEDIA] Downloaded by recipient', [
                'media_id' => $encryptedMedia->id,
                'downloaded_by' => $user->id,
            ]);
        }

        // Return encrypted blob with metadata headers
        return response()->stream(
            function () use ($disk, $encryptedMedia) {
                echo $disk->get($encryptedMedia->storage_path);
            },
            200,
            [
                'Content-Type' => 'application/octet-stream',
                'Content-Length' => $encryptedMedia->encrypted_size,
                'Content-Disposition' => 'attachment; filename="encrypted.enc"',
                'X-Media-ID' => $encryptedMedia->id,
                'X-Media-IV' => $encryptedMedia->iv,
                'X-Media-AuthTag' => $encryptedMedia->auth_tag,
                'X-Media-Type' => $encryptedMedia->media_type,
                'X-Original-Size' => $encryptedMedia->original_size,
                'X-Original-MimeType' => $encryptedMedia->mime_type ?? '',
                'X-Duration-Seconds' => $encryptedMedia->duration_seconds ?? '',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
            ]
        );
    }

    /**
     * Confirm download completed and delete from server
     *
     * POST /messaging/encrypted-media/{encryptedMedia}/confirm-download
     *
     * Called by client after successfully downloading and storing locally.
     * This deletes the encrypted file from server storage immediately.
     * Both sender and receiver keep their local copies.
     */
    public function confirmDownload(Request $request, EncryptedMedia $encryptedMedia): JsonResponse
    {
        $user = $request->user();
        $conversation = $encryptedMedia->conversation;

        // Verify user is participant
        if ($conversation->initiator_id !== $user->id &&
            $conversation->participant_id !== $user->id) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        // Only recipient (non-uploader) should confirm
        if ($encryptedMedia->uploader_id !== $user->id) {
            $encryptedMedia->markAsDownloaded($user->id);

            // Delete the encrypted file from storage immediately
            try {
                $disk = Storage::disk($encryptedMedia->storage_disk);
                if ($disk->exists($encryptedMedia->storage_path)) {
                    $disk->delete($encryptedMedia->storage_path);

                    // Mark as deleted in database
                    $encryptedMedia->markAsDeleted(EncryptedMedia::DELETION_REASON_DOWNLOADED);

                    Log::info('[ENCRYPTED_MEDIA] Deleted after download confirmation', [
                        'media_id' => $encryptedMedia->id,
                        'confirmed_by' => $user->id,
                        'storage_path' => $encryptedMedia->storage_path,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('[ENCRYPTED_MEDIA] Failed to delete after confirmation', [
                    'media_id' => $encryptedMedia->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('[ENCRYPTED_MEDIA] Download confirmed', [
                'media_id' => $encryptedMedia->id,
                'confirmed_by' => $user->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $encryptedMedia->id,
                'is_downloaded_by_recipient' => $encryptedMedia->is_downloaded_by_recipient,
                'is_deleted' => $encryptedMedia->is_deleted,
            ],
        ]);
    }

    /**
     * Get encrypted media metadata
     *
     * GET /messaging/encrypted-media/{encryptedMedia}
     */
    public function show(Request $request, EncryptedMedia $encryptedMedia): JsonResponse
    {
        $user = $request->user();
        $conversation = $encryptedMedia->conversation;

        // Verify user is participant
        if ($conversation->initiator_id !== $user->id &&
            $conversation->participant_id !== $user->id) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $encryptedMedia->id,
                'media_type' => $encryptedMedia->media_type,
                'encrypted_size' => $encryptedMedia->encrypted_size,
                'original_size' => $encryptedMedia->original_size,
                'mime_type' => $encryptedMedia->mime_type,
                'duration_seconds' => $encryptedMedia->duration_seconds,
                'expires_at' => $encryptedMedia->expires_at->toIso8601String(),
                'is_expired' => $encryptedMedia->isExpired(),
                'is_available' => $encryptedMedia->isAvailable(),
                'is_downloaded_by_recipient' => $encryptedMedia->is_downloaded_by_recipient,
                'created_at' => $encryptedMedia->created_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Validate base64 string
     */
    private function isValidBase64(string $string): bool
    {
        $decoded = base64_decode($string, true);
        return $decoded !== false && base64_encode($decoded) === $string;
    }

    /**
     * Format bytes to human readable
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }
}
