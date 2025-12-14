<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractResource extends JsonResource
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
            'type_contrat' => $this->type_contrat,
            'donnees_personnalisees' => $this->donnees_personnalisees ?? [],
            'statut' => $this->statut,
            'fichier_pdf_url' => $this->fichier_pdf_url,
            'hash_sha256' => $this->hash_sha256,
            'signatures' => $this->signatures ?? [],

            // Dates
            'date_creation' => $this->date_creation?->toIso8601String(),
            'date_signature_complete' => $this->date_signature_complete?->toIso8601String(),
            'delai_retractation_expire' => $this->delai_retractation_expire?->toIso8601String(),

            // Computed properties
            'is_fully_signed' => $this->is_fully_signed ?? (count($this->signatures ?? []) >= 2),
            'can_retract' => $this->can_retract ?? ($this->delai_retractation_expire && now() < $this->delai_retractation_expire),

            // Relationships
            'listing' => new ListingResource($this->whenLoaded('listing')),
            'landlord' => new UserResource($this->whenLoaded('landlord')),
            'tenant' => new UserResource($this->whenLoaded('tenant')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
