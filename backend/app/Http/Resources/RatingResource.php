<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RatingResource extends JsonResource
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
            'note_globale' => $this->note_globale,
            'critere_1_note' => $this->critere_1_note,
            'critere_2_note' => $this->critere_2_note,
            'critere_3_note' => $this->critere_3_note,
            'commentaire' => $this->commentaire,
            'statut_moderation' => $this->statut_moderation,
            'mots_cles_detectes' => $this->mots_cles_detectes ?? [],

            // Dates
            'date_creation' => $this->date_creation?->toIso8601String(),
            'date_publication' => $this->date_publication?->toIso8601String(),

            // Relationships
            'evaluator' => new UserResource($this->whenLoaded('evaluator')),
            'evaluated' => new UserResource($this->whenLoaded('evaluated')),
            'transaction' => new TransactionResource($this->whenLoaded('transaction')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
