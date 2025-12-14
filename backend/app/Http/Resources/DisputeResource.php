<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DisputeResource extends JsonResource
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
            'reference' => $this->reference,
            'type_litige' => $this->type_litige,
            'description' => $this->description,
            'preuves_urls' => $this->preuves_urls ?? [],
            'statut' => $this->statut,
            'resolution' => $this->resolution,

            // Dates
            'date_ouverture' => $this->date_ouverture?->toIso8601String(),
            'date_assignation_mediateur' => $this->date_assignation_mediateur?->toIso8601String(),
            'date_resolution' => $this->date_resolution?->toIso8601String(),

            // Relationships
            'demandeur' => new UserResource($this->whenLoaded('demandeur')),
            'defendeur' => new UserResource($this->whenLoaded('defendeur')),
            'mediateur' => new UserResource($this->whenLoaded('mediateur')),
            'transaction' => new TransactionResource($this->whenLoaded('transaction')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
