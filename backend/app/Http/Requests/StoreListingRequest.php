<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class StoreListingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Log incoming request for debugging
        Log::info('Listing creation request received', [
            'data' => $this->all(),
        ]);

        // Cast numeric strings to proper types
        $this->merge([
            'prix' => $this->prix ? (float) str_replace([' ', ','], ['', '.'], $this->prix) : null,
            'surface_m2' => $this->surface_m2 ? (float) $this->surface_m2 : null,
            'nombre_chambres' => $this->nombre_chambres ? (int) $this->nombre_chambres : null,
            'nombre_salles_bain' => $this->nombre_salles_bain ? (int) $this->nombre_salles_bain : null,
            'caution_mois' => $this->caution_mois ? (int) $this->caution_mois : null,
            'avance_mois' => $this->avance_mois ? (int) $this->avance_mois : null,
            'commission_mois' => $this->commission_mois ? (int) $this->commission_mois : 1,
            'duree_minimum_jours' => $this->duree_minimum_jours ? (int) $this->duree_minimum_jours : null,
            // Auto-set meuble to true for short-term rental
            'meuble' => $this->type_transaction === 'location_courte' ? true : ($this->meuble ?? false),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'titre' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:5000'],
            'type_propriete' => ['required', 'in:appartement,maison,villa,studio,terrain,bureau,magasin'],
            'type_transaction' => ['required', 'in:location,location_courte,vente'],
            'prix' => ['required', 'numeric', 'min:0', 'max:999999999999'],
            'caution_mois' => ['nullable', 'integer', 'min:0', 'max:12'],
            'avance_mois' => ['nullable', 'integer', 'min:1', 'max:12'],
            'commission_mois' => ['nullable', 'integer', 'min:0', 'max:1'],
            'duree_minimum_jours' => ['nullable', 'integer', 'min:1', 'max:365'],
            'type_locataire_prefere' => ['nullable', 'string', 'in:tous,couple,marie_absent,celibataire,etudiant'],
            'surface_m2' => ['nullable', 'numeric', 'min:0'],
            'nombre_chambres' => ['nullable', 'integer', 'min:0', 'max:50'],
            'nombre_salles_bain' => ['nullable', 'integer', 'min:0', 'max:20'],
            'meuble' => ['nullable', 'boolean'],
            'equipements' => ['nullable', 'array'],
            'equipements.*' => ['string', 'in:climatisation,chauffage,piscine,jardin,garage,balcon,terrasse,ascenseur,gardien,eau_courante,electricite,wifi,cuisine,forage,seg_uniquement'],
            'commune' => ['required', 'string', 'max:100'],
            'quartier' => ['required', 'string', 'max:100'],
            'adresse_complete' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'disponible_a_partir_de' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'titre.required' => 'Le titre de l\'annonce est obligatoire',
            'titre.max' => 'Le titre ne peut pas dépasser 200 caractères',
            'description.required' => 'La description est obligatoire',
            'description.max' => 'La description ne peut pas dépasser 5000 caractères',
            'type_propriete.required' => 'Le type de propriété est obligatoire',
            'type_propriete.in' => 'Le type de propriété n\'est pas valide',
            'type_transaction.required' => 'Le type de transaction est obligatoire',
            'type_transaction.in' => 'Le type de transaction doit être location, location_courte ou vente',
            'duree_minimum_jours.min' => 'La durée minimum doit être d\'au moins 1 jour',
            'duree_minimum_jours.max' => 'La durée minimum ne peut pas dépasser 365 jours',
            'prix.required' => 'Le prix est obligatoire',
            'prix.numeric' => 'Le prix doit être un nombre',
            'prix.min' => 'Le prix doit être supérieur ou égal à 0',
            'caution_mois.max' => 'La caution ne peut pas dépasser 12 mois',
            'avance_mois.min' => 'L\'avance doit être d\'au moins 1 mois',
            'avance_mois.max' => 'L\'avance ne peut pas dépasser 12 mois',
            'commune.required' => 'La commune est obligatoire',
            'commune.in' => 'La commune doit être Kaloum, Dixinn, Matam, Ratoma ou Matoto',
            'quartier.required' => 'Le quartier est obligatoire',
            'photos.max' => 'Vous ne pouvez pas télécharger plus de 10 photos',
            'photos.*.image' => 'Chaque fichier doit être une image',
            'photos.*.mimes' => 'Les images doivent être au format JPG, JPEG, PNG ou WebP',
            'photos.*.max' => 'Chaque image ne peut pas dépasser 5 Mo',
            'disponible_a_partir_de.after_or_equal' => 'La date de disponibilité doit être aujourd\'hui ou dans le futur',
        ];
    }
}
