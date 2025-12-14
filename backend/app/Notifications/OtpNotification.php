<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OtpNotification extends Notification
{
    use Queueable;

    protected string $otp;
    protected int $expiresInMinutes;

    /**
     * Create a new notification instance.
     *
     * @param string $otp
     * @param int $expiresInMinutes
     */
    public function __construct(string $otp, int $expiresInMinutes = 5)
    {
        $this->otp = $otp;
        $this->expiresInMinutes = $expiresInMinutes;
    }

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
        return WhatsAppMessage::create()
            ->bold("Code de vérification ImmoGuinée")
            ->emptyLine()
            ->line("Votre code: *{$this->otp}*")
            ->line("Valide pendant {$this->expiresInMinutes} minutes.")
            ->emptyLine()
            ->line("Ne partagez ce code avec personne!")
            ->type('otp')
            ->metadata([
                'otp' => $this->otp,
                'expires_in_minutes' => $this->expiresInMinutes,
            ]);
    }

    /**
     * Should this notification be queued?
     */
    public function shouldQueueWaha(): bool
    {
        return false; // OTP should be sent immediately
    }
}
