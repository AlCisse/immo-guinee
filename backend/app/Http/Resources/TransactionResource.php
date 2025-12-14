<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
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
            'annonce_id' => $this->annonce_id,
            'type_transaction' => $this->type_transaction,
            'montant_total_gnf' => $this->montant_total_gnf,
            'commission_plateforme_gnf' => $this->commission_plateforme_gnf,
            'paiements_ids' => $this->paiements_ids ?? [],
            'statut' => $this->statut,

            // Dates
            'date_debut' => $this->date_debut?->toIso8601String(),
            'date_completion' => $this->date_completion?->toIso8601String(),

            // Relationships
            'landlord' => new UserResource($this->whenLoaded('landlord')),
            'tenant' => new UserResource($this->whenLoaded('tenant')),
            'listing' => new ListingResource($this->whenLoaded('listing')),
            'contract' => new ContractResource($this->whenLoaded('contract')),
            'rating' => new RatingResource($this->whenLoaded('rating')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
