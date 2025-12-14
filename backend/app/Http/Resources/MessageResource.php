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
        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'type_message' => $this->type_message,
            'contenu' => $this->contenu,
            'media_url' => $this->media_url,
            'media_mime_type' => $this->media_mime_type,
            'is_read' => $this->is_read,
            'is_delivered' => $this->is_delivered,
            'read_at' => $this->read_at?->toIso8601String(),
            'is_reported' => $this->is_reported,

            // Relationships
            'sender' => new UserResource($this->whenLoaded('sender')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
