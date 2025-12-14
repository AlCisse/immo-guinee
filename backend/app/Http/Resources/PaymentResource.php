<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
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
            'type_paiement' => $this->type_paiement,
            'montant_gnf' => $this->montant_gnf,
            'commission_plateforme_gnf' => $this->commission_plateforme_gnf,
            'montant_total_gnf' => $this->montant_total_gnf,
            'methode_paiement' => $this->methode_paiement,
            'statut' => $this->statut,
            'numero_transaction_externe' => $this->numero_transaction_externe,
            'quittance_pdf_url' => $this->quittance_pdf_url,
            'tentatives_paiement' => $this->tentatives_paiement,

            // Dates
            'date_creation' => $this->date_creation?->toIso8601String(),
            'date_confirmation' => $this->date_confirmation?->toIso8601String(),
            'date_validation_beneficiaire' => $this->date_validation_beneficiaire?->toIso8601String(),
            'date_deblocage_escrow' => $this->date_deblocage_escrow?->toIso8601String(),

            // Relationships
            'payer' => new UserResource($this->whenLoaded('payer')),
            'beneficiary' => new UserResource($this->whenLoaded('beneficiary')),
            'contract' => new ContractResource($this->whenLoaded('contract')),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
