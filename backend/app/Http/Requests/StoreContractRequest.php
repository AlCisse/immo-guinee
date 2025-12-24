<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContractRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'listing_id' => ['required', 'exists:listings,id'],
            'locataire_id' => ['nullable', 'exists:users,id'], // Optional: ID of the tenant
            'type_contrat' => ['required', 'in:location,vente'],
            // Allow dates from yesterday to handle timezone differences
            'date_debut' => ['required', 'date', 'after_or_equal:' . now()->subDay()->format('Y-m-d')],
            // Durée: soit date_fin, soit duree_mois, soit duree_indeterminee (validation custom dans withValidator)
            'date_fin' => ['nullable', 'date', 'after:date_debut'],
            'duree_mois' => ['nullable', 'integer', 'min:1', 'max:120'],
            'duree_indeterminee' => ['nullable', 'boolean'],
            // Montants pour location
            'montant_loyer' => ['required_if:type_contrat,location', 'nullable', 'numeric', 'min:0'],
            'montant_caution' => ['nullable', 'numeric', 'min:0'],
            // Prix pour vente
            'prix_vente' => ['required_if:type_contrat,vente', 'nullable', 'numeric', 'min:0'],
            // Clauses et documents
            'clauses_speciales' => ['nullable', 'array'],
            'clauses_speciales.*' => ['string', 'max:1000'],
            'documents' => ['nullable', 'array'],
            'documents.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Pour un contrat de location, il faut au moins une indication de durée
            if ($this->type_contrat === 'location') {
                $hasDateFin = !empty($this->date_fin);
                $hasDureeMois = !empty($this->duree_mois);
                $isDureeIndeterminee = filter_var($this->duree_indeterminee, FILTER_VALIDATE_BOOLEAN);

                if (!$hasDateFin && !$hasDureeMois && !$isDureeIndeterminee) {
                    $validator->errors()->add('duree', 'Veuillez spécifier une date de fin, une durée en mois, ou sélectionner durée indéterminée');
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'listing_id.required' => 'L\'annonce est obligatoire',
            'listing_id.exists' => 'L\'annonce spécifiée n\'existe pas',
            'type_contrat.required' => 'Le type de contrat est obligatoire',
            'type_contrat.in' => 'Le type de contrat doit être location ou vente',
            'date_debut.required' => 'La date de début est obligatoire',
            'date_debut.after_or_equal' => 'La date de début doit être aujourd\'hui ou dans le futur',
            'date_fin.after' => 'La date de fin doit être après la date de début',
            'duree_mois.min' => 'La durée doit être d\'au moins 1 mois',
            'duree_mois.max' => 'La durée ne peut pas dépasser 120 mois (10 ans)',
            'duree_mois.integer' => 'La durée doit être un nombre entier',
            'montant_loyer.required_if' => 'Le montant du loyer est obligatoire pour un contrat de location',
            'montant_loyer.numeric' => 'Le montant du loyer doit être un nombre',
            'montant_loyer.min' => 'Le montant du loyer doit être positif',
            'montant_caution.numeric' => 'Le montant de la caution doit être un nombre',
            'prix_vente.required_if' => 'Le prix de vente est obligatoire pour un contrat de vente',
            'prix_vente.numeric' => 'Le prix de vente doit être un nombre',
            'documents.*.mimes' => 'Les documents doivent être au format PDF, JPG, JPEG ou PNG',
            'documents.*.max' => 'Chaque document ne peut pas dépasser 10 Mo',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        // S'assurer que duree_indeterminee est un boolean
        if ($this->has('duree_indeterminee')) {
            $this->merge([
                'duree_indeterminee' => filter_var($this->duree_indeterminee, FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }
}
