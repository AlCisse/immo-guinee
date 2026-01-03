<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return [WahaChannel::class];
    }

    public function toWhatsApp($notifiable): WhatsAppMessage
    {
        $name = explode(' ', $notifiable->nom_complet ?? 'Utilisateur')[0];

        return WhatsAppMessage::create()
            ->bold("Bienvenue sur ImmoGuinee!")
            ->emptyLine()
            ->greeting($name)
            ->emptyLine()
            ->line("Merci de rejoindre la plateforme immobiliere #1 en Guinee!")
            ->emptyLine()
            ->line("Avec ImmoGuinee, vous pouvez:")
            ->line("- Chercher des logements a louer")
            ->line("- Publier vos annonces")
            ->line("- Contacter directement les proprietaires")
            ->line("- Signer des contrats en ligne")
            ->emptyLine()
            ->action("Commencer", config('app.frontend_url'))
            ->type('welcome')
            ->metadata(['user_name' => $name]);
    }
}
