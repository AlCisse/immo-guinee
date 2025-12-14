<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'telephone' => $this->telephone,
            'email' => $this->email,
            'nom_complet' => $this->nom_complet,
            'photo_profil_url' => $this->photo_profil_url,
            'bio' => $this->bio,
            'type_compte' => $this->type_compte,
            'badge_certification' => $this->badge_certification,
            'statut_verification' => $this->statut_verification,
            'statut_compte' => $this->statut_compte,
            'note_moyenne' => round($this->note_moyenne, 2),
            'nombre_transactions' => $this->nombre_transactions,
            'nombre_litiges' => $this->nombre_litiges,
            'preferences_notification' => $this->preferences_notification,
            'date_inscription' => $this->date_inscription?->toIso8601String(),
            'derniere_connexion' => $this->derniere_connexion?->toIso8601String(),

            // Computed properties
            'is_certified' => $this->is_certified ?? in_array($this->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE']),

            // Include roles if using Spatie Permission
            'roles' => $this->whenLoaded('roles', function () {
                return $this->roles->pluck('name');
            }),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
