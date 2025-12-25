<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMessageEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    /**
     * Encryption key for E2E encrypted media (never stored, only transmitted)
     */
    protected ?string $encryptionKey;

    /**
     * Create a new event instance.
     *
     * @param Message $message
     * @param string|null $encryptionKey Base64-encoded AES-256 key for E2E media
     */
    public function __construct(Message $message, ?string $encryptionKey = null)
    {
        $this->message = $message;
        $this->encryptionKey = $encryptionKey;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'NewMessageEvent';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        $data = [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id' => $this->message->sender_id,
            'sender' => [
                'id' => $this->message->sender->id,
                'nom_complet' => $this->message->sender->nom_complet,
                'badge' => $this->message->sender->badge,
            ],
            'type_message' => $this->message->type_message,
            'contenu' => $this->message->contenu,
            'media_url' => $this->message->media_url,
            'created_at' => $this->message->created_at->toIso8601String(),
            'is_e2e_encrypted' => (bool) $this->message->is_e2e_encrypted,
        ];

        // Include E2E encrypted media data if present
        if ($this->message->is_e2e_encrypted && $this->message->encryptedMedia) {
            $encryptedMedia = $this->message->encryptedMedia;
            $data['encrypted_media'] = [
                'id' => $encryptedMedia->id,
                'media_type' => $encryptedMedia->media_type,
                'original_size' => $encryptedMedia->original_size,
                'duration_seconds' => $encryptedMedia->duration_seconds,
                'mime_type' => $encryptedMedia->mime_type,
            ];

            // Include encryption key (ONLY transmitted via WebSocket, never stored)
            if ($this->encryptionKey) {
                $data['encryption_key'] = $this->encryptionKey;
            }
        }

        return $data;
    }
}
