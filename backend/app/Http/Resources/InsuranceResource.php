<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsuranceResource extends JsonResource
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
            'type_assurance' => $this->type_assurance,
            'numero_police' => $this->numero_police,
            'prime_mensuelle_gnf' => $this->prime_mensuelle_gnf,
            'couvertures' => $this->couvertures ?? [],
            'plafonds' => $this->plafonds ?? [],
            'statut' => $this->statut,

            // Dates
            'date_souscription' => $this->date_souscription?->toIso8601String(),
            'date_expiration' => $this->date_expiration?->toIso8601String(),

            // Computed
            'is_active' => $this->statut === 'ACTIVE' && now() <= $this->date_expiration,
            'days_remaining' => $this->when(
                $this->date_expiration,
                $this->date_expiration?->diffInDays(now())
            ),

            // Relationships
            'user' => new UserResource($this->whenLoaded('user')),
            'contract' => new ContractResource($this->whenLoaded('contract')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
