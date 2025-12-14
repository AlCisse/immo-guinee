<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RetractionPeriodExpiredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Contract $contract;

    /**
     * Create a new notification instance.
     */
    public function __construct(Contract $contract)
    {
        $this->contract = $contract;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $listing = $this->contract->listing;

        return (new MailMessage)
            ->subject('Contrat activé - ' . $this->contract->reference)
            ->greeting("Bonjour {$notifiable->prenom} !")
            ->line("La période de rétractation de 48 heures pour votre contrat est terminée.")
            ->line('')
            ->line("**Référence:** {$this->contract->reference}")
            ->line("**Type:** " . $this->getContractTypeLabel())
            ->line("**Bien:** " . ($listing?->titre ?? 'N/A'))
            ->line('')
            ->line('Votre contrat est maintenant officiellement actif et ne peut plus être annulé.')
            ->line('')
            ->line("**Période du contrat:**")
            ->line("Du " . $this->contract->date_debut?->format('d/m/Y') . " au " . $this->contract->date_fin?->format('d/m/Y'))
            ->line('')
            ->action('Télécharger le contrat', url('/contrats/' . $this->contract->id . '/download'))
            ->line('')
            ->line('Conservez précieusement ce contrat. Il est archivé de manière sécurisée sur notre plateforme pendant 10 ans.')
            ->salutation("L'équipe ImmoGuinée");
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'retraction_period_expired',
            'contract_id' => $this->contract->id,
            'contract_reference' => $this->contract->reference,
            'contract_type' => $this->contract->type_contrat,
            'listing_id' => $this->contract->listing_id,
            'listing_title' => $this->contract->listing?->titre,
            'date_debut' => $this->contract->date_debut?->format('Y-m-d'),
            'date_fin' => $this->contract->date_fin?->format('Y-m-d'),
            'activated_at' => now()->toIso8601String(),
            'message' => 'Votre contrat est maintenant actif',
        ];
    }

    /**
     * Get human-readable contract type label.
     */
    protected function getContractTypeLabel(): string
    {
        return match ($this->contract->type_contrat) {
            'BAIL_LOCATION_RESIDENTIEL' => 'Bail de location résidentiel',
            'BAIL_LOCATION_COMMERCIAL' => 'Bail de location commercial',
            'PROMESSE_VENTE_TERRAIN' => 'Promesse de vente de terrain',
            'MANDAT_GESTION' => 'Mandat de gestion',
            'ATTESTATION_CAUTION' => 'Attestation de caution',
            default => str_replace('_', ' ', $this->contract->type_contrat),
        };
    }
}
