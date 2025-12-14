<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
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
            'listing_id' => $this->listing_id,
            'subject' => $this->subject,
            'is_active' => $this->is_active,
            'last_message_at' => $this->last_message_at?->toIso8601String(),

            // Relationships - using initiator/participant from the model
            'initiator' => new UserResource($this->whenLoaded('initiator')),
            'participant' => new UserResource($this->whenLoaded('participant')),
            'listing' => $this->whenLoaded('listing', function () {
                return [
                    'id' => $this->listing->id,
                    'titre' => $this->listing->titre,
                    'loyer_mensuel' => $this->listing->loyer_mensuel,
                    'photo_principale' => $this->listing->photo_principale,
                ];
            }),
            'messages' => MessageResource::collection($this->whenLoaded('messages')),

            // Last message preview
            'last_message' => $this->whenLoaded('lastMessage', function () {
                return [
                    'contenu' => $this->lastMessage->contenu,
                    'type_message' => $this->lastMessage->type_message,
                    'created_at' => $this->lastMessage->created_at?->toIso8601String(),
                ];
            }),

            // Computed
            'unread_count' => $this->unread_count ?? 0,

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
