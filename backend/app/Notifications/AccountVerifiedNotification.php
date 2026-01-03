<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AccountVerifiedNotification extends Notification
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WahaChannel::class];
    }

    /**
     * Get the WhatsApp representation of the notification.
     *
     * @param mixed $notifiable
     * @return WhatsAppMessage
     */
    public function toWhatsApp($notifiable): WhatsAppMessage
    {
        $name = explode(' ', $notifiable->nom_complet ?? 'Utilisateur')[0];

        return WhatsAppMessage::create()
            ->bold("Compte vérifié - ImmoGuinée")
            ->emptyLine()
            ->greeting($name)
            ->emptyLine()
            ->line("Votre compte a été vérifié avec succès!")
            ->line("Vous pouvez maintenant publier des annonces.")
            ->emptyLine()
            ->line("Bienvenue sur ImmoGuinée!")
            ->type('account_verification');
    }
}
