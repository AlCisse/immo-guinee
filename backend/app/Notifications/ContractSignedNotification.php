<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContractSignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $contract;

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
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Contrat signé avec succès')
            ->greeting("Bonjour " . explode(' ', $notifiable->nom_complet ?? 'Utilisateur')[0] . " !")
            ->line("Votre contrat {$this->contract->reference} a été signé par toutes les parties.")
            ->line("Type de contrat: {$this->contract->type_contrat}")
            ->line("Période de rétractation: 48 heures")
            ->action('Voir le contrat', url('/dashboard/mes-contrats/' . $this->contract->id))
            ->line('Le contrat sera automatiquement activé après la période de rétractation.')
            ->line('Merci d\'utiliser ImmoGuinée !');
    }
}
