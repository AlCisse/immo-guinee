<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Events\NewMessageEvent;
use App\Helpers\FileSecurityHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessagingController extends Controller
{
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
            'type_message' => 'required|in:TEXT,VOCAL,PHOTO,SYSTEM',
            'contenu' => 'required_if:type_message,TEXT|nullable|string|max:2000',
            'fichier' => 'required_if:type_message,VOCAL,PHOTO|nullable|file|mimes:jpeg,jpg,png,webp,mp3,mp4,m4a,ogg,wav,webm,aac|max:10240', // 10MB
        ]);

        DB::beginTransaction();
        try {
            $messageData = [
                'conversation_id' => $conversation->id,
                'sender_id' => auth()->id(),
                'type_message' => $validated['type_message'],
                'contenu' => $validated['contenu'] ?? null,
                'is_read' => false,
                'is_delivered' => false,
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

                // Generate secure filename with UUID
                $filename = FileSecurityHelper::generateSecureFilename($file->getClientOriginalExtension());

                // Determine storage disk based on strategy
                $storageStrategy = env('STORAGE_STRATEGY', 'minio');
                $disk = $storageStrategy === 'spaces' ? 'spaces-messages' : 'messages';

                // Store file
                $path = $file->storeAs('', $filename, $disk);

                // Build public URL based on storage strategy
                if ($storageStrategy === 'spaces') {
                    $messageData['media_url'] = env('DO_SPACES_CDN_URL', 'https://immoguinee-images.fra1.digitaloceanspaces.com') . '/messages/' . $filename;
                } else {
                    $messageData['media_url'] = env('MINIO_URL') . '/' . env('MINIO_MESSAGES_BUCKET', 'immog-messages') . '/' . $filename;
                }
                $messageData['media_mime_type'] = $file->getMimeType();
                $messageData['media_size'] = $file->getSize();

                \Log::info('Voice message uploaded', [
                    'disk' => $disk,
                    'path' => $path,
                    'filename' => $filename,
                    'url' => $messageData['media_url'],
                    'size' => $messageData['media_size']
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

            // Broadcast to other participant
            broadcast(new NewMessageEvent($message))->toOthers();

            DB::commit();

            return new MessageResource($message->load('sender'));
        } catch (\Exception $e) {
            DB::rollBack();
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
}
