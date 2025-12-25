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
            'photo_profil_url' => $this->photo_profil_url ?? null,
            'bio' => $this->bio ?? null,
            'type_compte' => $this->type_compte,
            'badge' => $this->badge,
            'statut_verification' => $this->statut_verification,
            'is_active' => $this->is_active,
            'is_suspended' => $this->is_suspended,
            'avg_rating' => round((float) $this->avg_rating, 2),
            'total_transactions' => $this->total_transactions,
            'total_disputes' => $this->total_disputes,
            'notification_preferences' => $this->notification_preferences,
            'last_login_at' => $this->last_login_at?->toIso8601String(),

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
