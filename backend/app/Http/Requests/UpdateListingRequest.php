<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateListingRequest extends FormRequest
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
            'titre' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'string', 'max:5000'],
            'prix' => ['sometimes', 'numeric', 'min:0', 'max:999999999999'],
            'photos' => ['sometimes', 'array', 'max:10'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'disponible_a_partir_de' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'titre.max' => 'Le titre ne peut pas dépasser 200 caractères',
            'description.max' => 'La description ne peut pas dépasser 5000 caractères',
            'prix.numeric' => 'Le prix doit être un nombre',
            'prix.min' => 'Le prix doit être supérieur ou égal à 0',
            'photos.max' => 'Vous ne pouvez pas télécharger plus de 10 photos',
            'photos.*.image' => 'Chaque fichier doit être une image',
            'photos.*.mimes' => 'Les images doivent être au format JPG, JPEG, PNG ou WebP',
            'photos.*.max' => 'Chaque image ne peut pas dépasser 5 Mo',
            'disponible_a_partir_de.after_or_equal' => 'La date de disponibilité doit être aujourd\'hui ou dans le futur',
        ];
    }
}
