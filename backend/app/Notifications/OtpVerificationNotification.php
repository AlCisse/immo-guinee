<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;

class OtpVerificationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $otp
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', TwilioChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     * FR-002: Send OTP via email
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre code de vérification ImmoGuinée')
            ->greeting('Bonjour ' . $notifiable->nom_complet . ',')
            ->line('Votre code de vérification est:')
            ->line('**' . $this->otp . '**')
            ->line('Ce code expire dans 10 minutes.')
            ->line('Si vous n\'avez pas demandé ce code, ignorez cet email.')
            ->salutation('Merci d\'utiliser ImmoGuinée!');
    }

    /**
     * Get the Twilio / SMS representation of the notification.
     * FR-002: Send OTP via SMS (Twilio)
     */
    public function toTwilio(object $notifiable): TwilioSmsMessage
    {
        return (new TwilioSmsMessage())
            ->content("ImmoGuinée: Votre code de vérification est {$this->otp}. Valide 10 minutes.");
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'otp' => $this->otp,
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
        ];
    }
}
