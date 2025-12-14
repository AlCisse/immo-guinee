<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
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
            'conversation_id' => ['required', 'exists:conversations,id'],
            'destinataire_id' => ['required', 'exists:users,id'],
            'contenu' => ['required', 'string', 'max:2000'],
            'type_message' => ['nullable', 'in:texte,image,document'],
            'media' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'conversation_id.required' => 'L\'identifiant de la conversation est obligatoire',
            'conversation_id.exists' => 'La conversation spécifiée n\'existe pas',
            'destinataire_id.required' => 'Le destinataire est obligatoire',
            'destinataire_id.exists' => 'Le destinataire spécifié n\'existe pas',
            'contenu.required' => 'Le contenu du message est obligatoire',
            'contenu.max' => 'Le message ne peut pas dépasser 2000 caractères',
            'type_message.in' => 'Le type de message n\'est pas valide',
            'media.mimes' => 'Le fichier doit être au format JPG, JPEG, PNG ou PDF',
            'media.max' => 'Le fichier ne peut pas dépasser 5 Mo',
        ];
    }
}
