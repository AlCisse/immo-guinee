<?php

namespace App\Notifications;

use App\Models\Listing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ListingExpiredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $listing;

    /**
     * Create a new notification instance.
     */
    public function __construct(Listing $listing)
    {
        $this->listing = $listing;
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
            ->subject('Votre annonce a expiré')
            ->greeting("Bonjour " . explode(' ', $notifiable->nom_complet ?? 'Utilisateur')[0] . " !")
            ->line("Votre annonce \"{$this->listing->titre}\" a expiré après 90 jours de publication.")
            ->line("Vous pouvez la renouveler pour qu'elle redevienne visible dans les résultats de recherche.")
            ->action('Renouveler l\'annonce', url('/dashboard/mes-annonces/' . $this->listing->id . '/renew'))
            ->line('Merci d\'utiliser ImmoGuinée !');
    }
}
