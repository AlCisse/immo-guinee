<?php

namespace App\Notifications;

use App\Models\Dispute;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;

class DisputeOpenedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Dispute $dispute
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', TwilioChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     * FR-072: Dispute notification to both parties
     */
    public function toMail(object $notifiable): MailMessage
    {
        $isDefendant = $notifiable->id === $this->dispute->defendeur_id;

        return (new MailMessage)
            ->subject('Litige ouvert - ImmoGuinée')
            ->greeting('Bonjour ' . $notifiable->nom_complet . ',')
            ->line($isDefendant
                ? 'Un litige a été ouvert contre vous.'
                : 'Votre litige a été enregistré.')
            ->line('Type: ' . $this->dispute->type_litige)
            ->line('Montant réclamé: ' . number_format($this->dispute->montant_reclame_gnf ?? 0, 0, ',', ' ') . ' GNF')
            ->line('Un médiateur sera assigné dans les 24 heures.')
            ->action('Voir le litige', url('/disputes/' . $this->dispute->id))
            ->salutation('Merci d\'utiliser ImmoGuinée!');
    }

    /**
     * Get the Twilio / SMS representation of the notification.
     */
    public function toTwilio(object $notifiable): TwilioSmsMessage
    {
        return (new TwilioSmsMessage())
            ->content("ImmoGuinée: Un litige a été ouvert. Consultez l'app pour plus de détails.");
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'dispute_id' => $this->dispute->id,
            'type_litige' => $this->dispute->type_litige,
            'montant_reclame_gnf' => $this->dispute->montant_reclame_gnf,
        ];
    }
}
