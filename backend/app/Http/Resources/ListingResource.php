<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ListingResource extends JsonResource
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
            'type_transaction' => $this->type_transaction,
            'duree_minimum_jours' => $this->duree_minimum_jours,
            'type_bien' => $this->type_bien,
            'titre' => $this->titre,
            'description' => $this->description,
            'prix_gnf' => $this->prix_gnf,
            'quartier' => $this->quartier,
            'adresse_complete' => $this->adresse_complete,
            'superficie_m2' => $this->superficie_m2,
            'nombre_chambres' => $this->nombre_chambres,
            'nombre_salons' => $this->nombre_salons,
            'caution_mois' => $this->caution_mois,
            'equipements' => $this->equipements ?? [],
            'photos' => $this->photos ?? [],
            'statut' => $this->statut,
            'nombre_vues' => $this->nombre_vues,
            'options_premium' => $this->options_premium ?? [],

            // Dates
            'date_publication' => $this->date_publication?->toIso8601String(),
            'date_derniere_maj' => $this->date_derniere_maj?->toIso8601String(),
            'date_expiration' => $this->date_expiration?->toIso8601String(),

            // Computed properties
            'is_expired' => $this->is_expired ?? ($this->date_expiration && $this->date_expiration < now()),
            'has_premium' => $this->has_premium ?? false,

            // Relationships
            'creator' => new UserResource($this->whenLoaded('creator')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
