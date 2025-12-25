<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Events\NewMessageEvent;
use App\Helpers\FileSecurityHelper;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessagingController extends Controller
{
    protected ExpoPushService $pushService;

    public function __construct(ExpoPushService $pushService)
    {
        $this->pushService = $pushService;
    }
    /**
     * Get user's conversations
     * FR-063
     */
    public function conversations(Request $request)
    {
        $userId = auth()->id();

        $conversations = Conversation::where(function ($query) use ($userId) {
            $query->where('initiator_id', $userId)
                ->orWhere('participant_id', $userId);
        })
            ->where('is_active', true)
            ->with(['initiator', 'participant', 'listing', 'lastMessage'])
            ->withCount(['messages as unread_count' => function ($query) use ($userId) {
                $query->where('sender_id', '!=', $userId)
                    ->where('is_read', false);
            }])
            ->orderBy('last_message_at', 'desc')
            ->get();

        return ConversationResource::collection($conversations);
    }

    /**
     * Get messages in a conversation
     * FR-063
     */
    public function messages(Request $request, Conversation $conversation)
    {
        $this->authorize('viewConversation', $conversation);

        $messages = $conversation->messages()
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        // Mark messages as read
        $this->markAsRead($conversation, auth()->id());

        return MessageResource::collection($messages);
    }

    /**
     * Send message
     * FR-059
     */
    public function sendMessage(Request $request, Conversation $conversation)
    {
        $this->authorize('send', $conversation);

        $validated = $request->validate([
            'type_message' => 'required|in:TEXT,VOCAL,PHOTO,VIDEO,SYSTEM',
            'contenu' => 'required_if:type_message,TEXT|nullable|string|max:2000',
            'fichier' => 'nullable|file|mimes:jpeg,jpg,png,webp,mp3,mp4,m4a,ogg,wav,webm,aac|max:10240', // 10MB
            'reply_to_message_id' => 'nullable|uuid|exists:messages,id',
            // E2E encrypted media fields
            'encrypted_media_id' => 'nullable|uuid|exists:encrypted_media,id',
            'encryption_key' => 'nullable|string|max:100', // Base64 encoded AES-256 key
        ]);

        DB::beginTransaction();
        try {
            // Handle E2E encrypted media
            $isE2EEncrypted = !empty($validated['encrypted_media_id']);
            $encryptedMedia = null;

            if ($isE2EEncrypted) {
                $encryptedMedia = \App\Models\EncryptedMedia::find($validated['encrypted_media_id']);
                if (!$encryptedMedia || $encryptedMedia->uploader_id !== auth()->id()) {
                    DB::rollBack();
                    return response()->json(['error' => 'Invalid encrypted media'], 422);
                }
            }

            $messageData = [
                'conversation_id' => $conversation->id,
                'sender_id' => auth()->id(),
                'type_message' => $validated['type_message'],
                'contenu' => $validated['contenu'] ?? null,
                'reply_to_message_id' => $validated['reply_to_message_id'] ?? null,
                'is_read' => false,
                'is_delivered' => false,
                'status' => 'sent',
                // E2E encrypted media
                'encrypted_media_id' => $validated['encrypted_media_id'] ?? null,
                'is_e2e_encrypted' => $isE2EEncrypted,
            ];

            // Handle file upload - store with security validation
            if ($request->hasFile('fichier')) {
                $file = $request->file('fichier');

                // Security validation with magic bytes check
                $category = $validated['type_message'] === 'PHOTO' ? 'image' : 'audio';
                $securityCheck = FileSecurityHelper::validateFile($file, $category === 'image' ? 'image' : 'media', 10240);

                if (!$securityCheck['valid']) {
                    DB::rollBack();
                    return response()->json(['error' => $securityCheck['error']], 422);
                }

                // Generate secure filename with UUID - always use MP3 for compatibility
                $baseFilename = Str::uuid()->toString();
                $mp3Filename = $baseFilename . '.mp3';

                // Determine storage disk based on strategy
                $storageStrategy = env('STORAGE_STRATEGY', 'minio');
                $disk = $storageStrategy === 'spaces' ? 'spaces-messages' : 'messages';

                // Save original file temporarily
                $tempPath = sys_get_temp_dir() . '/' . $baseFilename . '_original.' . $file->getClientOriginalExtension();
                $mp3TempPath = sys_get_temp_dir() . '/' . $mp3Filename;
                file_put_contents($tempPath, file_get_contents($file->getRealPath()));

                // Convert to MP3 using FFmpeg for iOS/Safari compatibility
                $ffmpegPath = '/usr/bin/ffmpeg';

                // Security: Verify ffmpeg binary exists and is executable
                if (!is_executable($ffmpegPath)) {
                    \Log::error('FFmpeg not found or not executable', ['path' => $ffmpegPath]);
                    // Fallback to original file without conversion
                    $mp3TempPath = $tempPath;
                    $mp3Filename = $baseFilename . '.' . $file->getClientOriginalExtension();
                    $returnCode = 1;
                    $output = ['FFmpeg not available'];
                } else {
                    // Security: Use timeout to prevent DoS via slow conversion
                    $convertCommand = sprintf(
                        'timeout 30 %s -i %s -vn -acodec libmp3lame -ab 128k -ar 44100 -y %s 2>&1',
                        escapeshellarg($ffmpegPath),
                        escapeshellarg($tempPath),
                        escapeshellarg($mp3TempPath)
                    );

                    exec($convertCommand, $output, $returnCode);
                }

                if ($returnCode !== 0 || !file_exists($mp3TempPath)) {
                    \Log::warning('FFmpeg conversion failed, using original file', [
                        'return_code' => $returnCode,
                        'output' => implode("\n", $output),
                    ]);
                    // Fallback: use original file
                    $mp3TempPath = $tempPath;
                    $mp3Filename = $baseFilename . '.' . $file->getClientOriginalExtension();
                }

                // Get file size before cleanup
                $fileSize = file_exists($mp3TempPath) ? filesize($mp3TempPath) : $file->getSize();

                // Upload converted file
                $fileContent = file_get_contents($mp3TempPath);
                if ($fileContent === false) {
                    throw new \Exception('Failed to read converted file: ' . $mp3TempPath);
                }

                \Log::info('Uploading voice message to storage', [
                    'disk' => $disk,
                    'filename' => $mp3Filename,
                    'size' => strlen($fileContent),
                ]);

                $path = Storage::disk($disk)->put($mp3Filename, $fileContent);

                // Clean up temp files
                @unlink($tempPath);
                if ($mp3TempPath !== $tempPath) {
                    @unlink($mp3TempPath);
                }

                // Build public URL based on storage strategy
                if ($storageStrategy === 'spaces') {
                    $messageData['media_url'] = env('DO_SPACES_CDN_URL', 'https://immoguinee-images.fra1.digitaloceanspaces.com') . '/messages/' . $mp3Filename;
                } else {
                    $messageData['media_url'] = env('MINIO_URL') . '/' . env('MINIO_MESSAGES_BUCKET', 'immog-messages') . '/' . $mp3Filename;
                }
                $messageData['media_mime_type'] = 'audio/mpeg';
                $messageData['media_size'] = $fileSize;

                \Log::info('Voice message uploaded', [
                    'disk' => $disk,
                    'path' => $path,
                    'filename' => $mp3Filename,
                    'url' => $messageData['media_url'],
                    'converted' => $returnCode === 0,
                ]);
            } else {
                \Log::warning('No file received for vocal message', [
                    'type' => $validated['type_message'],
                    'hasFile' => $request->hasFile('fichier'),
                    'files' => $request->allFiles(),
                    'all' => $request->all(),
                ]);
            }

            $message = Message::create($messageData);

            // Update conversation last message timestamp
            $conversation->update(['last_message_at' => now()]);

            // Link encrypted media to message
            if ($encryptedMedia) {
                $encryptedMedia->update(['message_id' => $message->id]);
            }

            // Broadcast to other participant (include encryption_key for E2E media)
            $encryptionKey = $validated['encryption_key'] ?? null;
            // Eager load relations needed for broadcast
            $message->load(['sender', 'encryptedMedia']);

            \Log::info('[WebSocket] Broadcasting NewMessageEvent', [
                'conversation_id' => $message->conversation_id,
                'message_id' => $message->id,
                'type' => $message->type_message,
                'is_e2e' => $message->is_e2e_encrypted,
                'has_encrypted_media' => $message->encryptedMedia !== null,
                'has_encryption_key' => $encryptionKey !== null,
                'channel' => 'private-conversation.' . $message->conversation_id,
            ]);

            try {
                broadcast(new NewMessageEvent($message, $encryptionKey))->toOthers();
                \Log::info('[WebSocket] Broadcast successful');
            } catch (\Exception $broadcastError) {
                \Log::error('[WebSocket] Broadcast failed', [
                    'error' => $broadcastError->getMessage(),
                    'trace' => $broadcastError->getTraceAsString(),
                ]);
            }

            DB::commit();

            // Create notification for the recipient (non-blocking)
            try {
                $senderId = auth()->id();
                $recipientId = $conversation->initiator_id === $senderId
                    ? $conversation->participant_id
                    : $conversation->initiator_id;

                if ($recipientId) {
                    $sender = auth()->user();
                    $messagePreview = $validated['type_message'] === 'VOCAL'
                        ? 'Message vocal'
                        : Str::limit($validated['contenu'] ?? '', 50);

                    // Create in-app notification
                    Notification::create([
                        'user_id' => $recipientId,
                        'type' => Notification::TYPE_MESSAGE_RECEIVED,
                        'titre' => 'Nouveau message',
                        'message' => $sender->nom_complet . ': ' . $messagePreview,
                        'data' => [
                            'conversation_id' => $conversation->id,
                            'message_id' => $message->id,
                            'sender_id' => $senderId,
                            'sender_name' => $sender->nom_complet,
                        ],
                        'action_url' => '/messages',
                        'priority' => Notification::PRIORITY_NORMAL,
                    ]);

                    // Send push notification
                    $recipient = User::find($recipientId);
                    if ($recipient) {
                        $this->pushService->sendNewMessageNotification(
                            $recipient,
                            $sender->nom_complet,
                            $messagePreview,
                            (string) $conversation->id,
                            (string) $message->id
                        );
                    }
                }
            } catch (\Exception $notifError) {
                \Log::warning('Failed to create message notification', [
                    'error' => $notifError->getMessage(),
                    'conversation_id' => $conversation->id,
                ]);
            }

            return new MessageResource($message->load('sender'));
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to send message', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'conversation_id' => $conversation->id,
            ]);
            return response()->json(['error' => 'Failed to send message: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Report message
     * FR-064
     */
    public function report(Request $request, Message $message)
    {
        $this->authorize('report', $message);

        $validated = $request->validate([
            'raison' => 'required|string|max:255',
        ]);

        $message->update([
            'is_reported' => true,
            'reported_at' => now(),
            'reported_by' => auth()->id(),
            'report_reason' => $validated['raison'],
        ]);

        return response()->json(['message' => 'Message reported successfully']);
    }

    /**
     * Mark messages as read
     */
    private function markAsRead(Conversation $conversation, string $userId): void
    {
        $conversation->messages()
            ->where('sender_id', '!=', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
    }

    /**
     * Start or get existing conversation about a listing
     * FR-059
     */
    public function startConversation(Request $request)
    {
        $validated = $request->validate([
            'listing_id' => 'required|uuid|exists:listings,id',
            'message' => 'nullable|string|max:2000',
        ]);

        $userId = auth()->id();
        $listing = \App\Models\Listing::findOrFail($validated['listing_id']);

        // Cannot message yourself
        if ($listing->user_id === $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas vous envoyer un message',
            ], 400);
        }

        // Find existing conversation or create new one
        $conversation = Conversation::where('listing_id', $listing->id)
            ->where(function ($query) use ($userId, $listing) {
                $query->where(function ($q) use ($userId, $listing) {
                    $q->where('initiator_id', $userId)
                      ->where('participant_id', $listing->user_id);
                })->orWhere(function ($q) use ($userId, $listing) {
                    $q->where('initiator_id', $listing->user_id)
                      ->where('participant_id', $userId);
                });
            })
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'listing_id' => $listing->id,
                'initiator_id' => $userId,
                'participant_id' => $listing->user_id,
                'subject' => $listing->titre,
                'last_message_at' => now(),
                'is_active' => true,
            ]);
        }

        // Send initial message if provided
        if (!empty($validated['message'])) {
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $userId,
                'type_message' => 'TEXT',
                'contenu' => $validated['message'],
                'is_read' => false,
                'is_delivered' => false,
            ]);

            $conversation->update(['last_message_at' => now()]);

            // Broadcast to other participant
            broadcast(new NewMessageEvent($message))->toOthers();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => new ConversationResource($conversation->load(['initiator', 'participant', 'listing'])),
            ],
        ]);
    }

    /**
     * Archive conversation
     */
    public function archive(Conversation $conversation)
    {
        $this->authorize('viewConversation', $conversation);

        $userId = auth()->id();

        if ($conversation->initiator_id === $userId) {
            $conversation->update(['is_archived_by_initiator' => true]);
        } else {
            $conversation->update(['is_archived_by_participant' => true]);
        }

        return response()->json(['message' => 'Conversation archived']);
    }

    /**
     * Send typing indicator
     */
    public function sendTyping(Request $request, Conversation $conversation)
    {
        $this->authorize('viewConversation', $conversation);

        $validated = $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        // Broadcast typing event to other participants
        broadcast(new \App\Events\TypingEvent(
            $conversation->id,
            auth()->id(),
            auth()->user()->nom_complet,
            $validated['is_typing']
        ))->toOthers();

        return response()->json(['success' => true]);
    }

    /**
     * Mark message as delivered
     */
    public function markDelivered(Message $message)
    {
        // Verify user is the recipient
        $userId = auth()->id();
        $conversation = $message->conversation;

        if (!$conversation || ($conversation->initiator_id !== $userId && $conversation->participant_id !== $userId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Only recipient can mark as delivered (not the sender)
        if ($message->sender_id === $userId) {
            return response()->json(['error' => 'Cannot mark own message as delivered'], 400);
        }

        if (!$message->is_delivered) {
            $message->update([
                'is_delivered' => true,
                'delivered_at' => now(),
            ]);

            // Broadcast delivery status to sender
            broadcast(new \App\Events\MessageStatusEvent(
                $message->id,
                $conversation->id,
                'delivered'
            ))->toOthers();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Mark message as read
     */
    public function markRead(Message $message)
    {
        $userId = auth()->id();
        $conversation = $message->conversation;

        if (!$conversation || ($conversation->initiator_id !== $userId && $conversation->participant_id !== $userId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Only recipient can mark as read
        if ($message->sender_id === $userId) {
            return response()->json(['error' => 'Cannot mark own message as read'], 400);
        }

        if (!$message->is_read) {
            $message->update([
                'is_read' => true,
                'read_at' => now(),
                'is_delivered' => true,
                'delivered_at' => $message->delivered_at ?? now(),
            ]);

            // Broadcast read status to sender
            broadcast(new \App\Events\MessageStatusEvent(
                $message->id,
                $conversation->id,
                'read'
            ))->toOthers();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Delete a message
     */
    public function deleteMessage(Request $request, Message $message)
    {
        $userId = auth()->id();
        $conversation = $message->conversation;

        if (!$conversation || ($conversation->initiator_id !== $userId && $conversation->participant_id !== $userId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $forEveryone = $request->boolean('for_everyone', false);

        // Only sender can delete for everyone (within 1 hour)
        if ($forEveryone) {
            if ($message->sender_id !== $userId) {
                return response()->json(['error' => 'Only sender can delete for everyone'], 403);
            }

            // Check if within 1 hour window
            if ($message->created_at->diffInMinutes(now()) > 60) {
                return response()->json(['error' => 'Cannot delete for everyone after 1 hour'], 400);
            }

            $message->update([
                'deleted_for_everyone' => true,
                'deleted_at' => now(),
                'contenu' => null,
                'media_url' => null,
            ]);

            // Broadcast deletion to all participants
            broadcast(new \App\Events\MessageDeletedEvent(
                $message->id,
                $conversation->id,
                true
            ))->toOthers();
        } else {
            // Delete for self only
            if ($message->sender_id === $userId) {
                $message->update(['deleted_for_sender' => true]);
            } else {
                $message->update(['deleted_for_recipient' => true]);
            }
        }

        return response()->json(['success' => true]);
    }

    /**
     * Search messages in a conversation
     */
    public function searchMessages(Request $request, Conversation $conversation)
    {
        $this->authorize('viewConversation', $conversation);

        $validated = $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        $userId = auth()->id();
        $query = $validated['q'];

        $messages = $conversation->messages()
            ->where('type_message', 'TEXT')
            ->where('contenu', 'ILIKE', '%' . $query . '%')
            ->where(function ($q) use ($userId) {
                // Exclude deleted messages for this user
                $q->where(function ($subq) use ($userId) {
                    $subq->where('sender_id', $userId)
                        ->where('deleted_for_sender', false);
                })->orWhere(function ($subq) use ($userId) {
                    $subq->where('sender_id', '!=', $userId)
                        ->where('deleted_for_recipient', false);
                });
            })
            ->where('deleted_for_everyone', false)
            ->with('sender')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return MessageResource::collection($messages);
    }
}
