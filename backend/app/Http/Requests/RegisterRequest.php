<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'nom_complet' => ['required', 'string', 'max:255'],
            // Note: 'unique' removed - handled in controller to support re-registration flow
            // Accepte les numéros internationaux (Guinée + diaspora)
            // Format: indicatif pays + numéro local (ex: 224621000000, 33612345678, 1234567890)
            'telephone' => ['required', 'string', 'regex:/^[1-9][0-9]{6,14}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'mot_de_passe' => [
                'required',
                'string',
                Password::min(8)
                    ->mixedCase()      // Au moins une majuscule et une minuscule
                    ->numbers()        // Au moins un chiffre
                    ->symbols()        // Au moins un caractère spécial
                    ->uncompromised(), // Vérifie que le mot de passe n'est pas dans une base de données de fuites
            ],
            'mot_de_passe_confirmation' => ['nullable', 'string', 'same:mot_de_passe'],
            'type_compte' => ['required', 'in:PARTICULIER,PROPRIETAIRE,AGENT,AGENCE'],
            'commune' => ['nullable', 'string', 'in:Kaloum,Dixinn,Matam,Ratoma,Matoto'],
            'quartier' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'nom_complet.required' => 'Le nom complet est obligatoire',
            'nom_complet.max' => 'Le nom complet ne peut pas dépasser 255 caractères',
            'telephone.required' => 'Le numéro de téléphone est obligatoire',
            'telephone.regex' => 'Le numéro de téléphone doit être valide avec l\'indicatif pays (ex: 224621000000 pour la Guinée, 33612345678 pour la France)',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé',
            'email.email' => 'L\'adresse email doit être valide',
            'email.unique' => 'Cette adresse email est déjà utilisée',
            'mot_de_passe.required' => 'Le mot de passe est obligatoire',
            'mot_de_passe.min' => 'Le mot de passe doit contenir au moins 8 caractères',
            'mot_de_passe.mixed' => 'Le mot de passe doit contenir au moins une majuscule et une minuscule',
            'mot_de_passe.numbers' => 'Le mot de passe doit contenir au moins un chiffre',
            'mot_de_passe.symbols' => 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)',
            'mot_de_passe.uncompromised' => 'Ce mot de passe a été compromis dans une fuite de données. Veuillez en choisir un autre.',
            'mot_de_passe_confirmation.same' => 'Les mots de passe ne correspondent pas',
            'type_compte.required' => 'Le type de compte est obligatoire',
            'type_compte.in' => 'Le type de compte doit être PARTICULIER, PROPRIETAIRE, AGENT ou AGENCE',
            'commune.in' => 'La commune doit être Kaloum, Dixinn, Matam, Ratoma ou Matoto',
        ];
    }
}
