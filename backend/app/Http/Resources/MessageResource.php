<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $userId = $request->user()?->id;
        $isSender = $this->sender_id === $userId;

        // Compute status: sent -> delivered -> read
        $status = 'sent';
        if ($this->is_read) {
            $status = 'read';
        } elseif ($this->is_delivered) {
            $status = 'delivered';
        }

        // Check if message is deleted for this user
        $isDeleted = $this->deleted_for_everyone ||
            ($isSender && $this->deleted_for_sender) ||
            (!$isSender && $this->deleted_for_recipient);

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'type_message' => $this->type_message,
            'contenu' => $isDeleted ? null : $this->contenu,
            'media_url' => $isDeleted ? null : $this->media_url,
            'media_mime_type' => $this->media_mime_type,
            'media_size' => $this->media_size,

            // Status indicators
            'status' => $status,
            'is_read' => $this->is_read,
            'is_delivered' => $this->is_delivered,
            'read_at' => $this->read_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),

            // Deletion status
            'is_deleted' => $isDeleted,
            'deleted_for_everyone' => $this->deleted_for_everyone ?? false,

            // Reply feature
            'reply_to_message_id' => $this->reply_to_message_id,
            'reply_to' => $this->when($this->reply_to_message_id, function () {
                $replyTo = $this->replyTo;
                if (!$replyTo) return null;
                return [
                    'id' => $replyTo->id,
                    'sender_id' => $replyTo->sender_id,
                    'sender_name' => $replyTo->sender?->nom_complet,
                    'type_message' => $replyTo->type_message,
                    'contenu' => $replyTo->deleted_for_everyone ? null : \Illuminate\Support\Str::limit($replyTo->contenu, 100),
                ];
            }),

            'is_reported' => $this->is_reported,

            // Relationships
            'sender' => new UserResource($this->whenLoaded('sender')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
