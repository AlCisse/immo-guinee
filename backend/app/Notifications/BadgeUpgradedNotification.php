<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;

class BadgeUpgradedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $oldBadge,
        public string $newBadge
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
     * FR-057: Badge upgrade notification
     */
    public function toMail(object $notifiable): MailMessage
    {
        $benefits = $this->getBenefits($this->newBadge);

        return (new MailMessage)
            ->subject('Félicitations! Badge amélioré - ImmoGuinée')
            ->greeting('Félicitations ' . $notifiable->nom_complet . '!')
            ->line('Votre badge a été amélioré de ' . $this->oldBadge . ' à ' . $this->newBadge . '!')
            ->line('Nouveaux avantages:')
            ->line($benefits)
            ->action('Voir mon profil', url('/profile'))
            ->salutation('Merci d\'utiliser ImmoGuinée!');
    }

    /**
     * Get the Twilio / SMS representation of the notification.
     */
    public function toTwilio(object $notifiable): TwilioSmsMessage
    {
        return (new TwilioSmsMessage())
            ->content("ImmoGuinée: Félicitations! Votre badge a été amélioré à {$this->newBadge}!");
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'old_badge' => $this->oldBadge,
            'new_badge' => $this->newBadge,
        ];
    }

    /**
     * Get benefits description for badge level
     */
    private function getBenefits(string $badge): string
    {
        return match ($badge) {
            'ARGENT' => '- Visibilité améliorée dans les recherches',
            'OR' => '- Visibilité premium + Badge affiché sur vos annonces',
            'DIAMANT' => '- Visibilité maximale + Badge + Support prioritaire',
            default => '',
        };
    }
}
