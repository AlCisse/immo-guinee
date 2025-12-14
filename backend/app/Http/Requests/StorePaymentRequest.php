<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
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
            'contrat_id' => ['required', 'exists:contracts,id'],
            'montant_loyer' => ['required', 'numeric', 'min:0'],
            'montant_caution' => ['nullable', 'numeric', 'min:0'],
            'montant_frais_service' => ['nullable', 'numeric', 'min:0'],
            'methode_paiement' => ['required', 'in:orange_money,mtn_momo,virement,especes,cheque'],
            'numero_telephone' => ['required_if:methode_paiement,orange_money,mtn_momo', 'nullable', 'string', 'regex:/^(\+224|00224|224)?[6-7][0-9]{8}$/'],
            'reference_externe' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'contrat_id.required' => 'L\'identifiant du contrat est obligatoire',
            'contrat_id.exists' => 'Le contrat spécifié n\'existe pas',
            'montant_loyer.required' => 'Le montant du loyer est obligatoire',
            'montant_loyer.numeric' => 'Le montant du loyer doit être un nombre',
            'montant_loyer.min' => 'Le montant du loyer doit être supérieur ou égal à 0',
            'methode_paiement.required' => 'La méthode de paiement est obligatoire',
            'methode_paiement.in' => 'La méthode de paiement n\'est pas valide',
            'numero_telephone.required_if' => 'Le numéro de téléphone est obligatoire pour les paiements mobile money',
            'numero_telephone.regex' => 'Le numéro de téléphone doit être un numéro guinéen valide',
        ];
    }
}
