<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Twilio\TwilioChannel;
use NotificationChannels\Twilio\TwilioSmsMessage;

class EscrowReleasedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Payment $payment,
        public bool $isRefund = false
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
     * FR-045: Escrow release notification
     */
    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format($this->payment->montant_total_gnf, 0, ',', ' ');

        $message = (new MailMessage)
            ->subject('Paiement séquestre libéré - ImmoGuinée')
            ->greeting('Bonjour ' . $notifiable->nom_complet . ',');

        if ($this->isRefund) {
            $message->line('Le paiement en séquestre a été remboursé suite à une annulation.')
                ->line('Montant remboursé: ' . $amount . ' GNF')
                ->line('Le montant sera crédité sur votre compte dans 2-5 jours ouvrables.');
        } else {
            $message->line('Le paiement en séquestre a été libéré.')
                ->line('Montant: ' . $amount . ' GNF')
                ->line('Le montant a été transféré au bailleur.');
        }

        return $message
            ->action('Voir la transaction', url('/payments/' . $this->payment->id))
            ->salutation('Merci d\'utiliser ImmoGuinée!');
    }

    /**
     * Get the Twilio / SMS representation of the notification.
     */
    public function toTwilio(object $notifiable): TwilioSmsMessage
    {
        $amount = number_format($this->payment->montant_total_gnf, 0, ',', ' ');
        $text = $this->isRefund
            ? "ImmoGuinée: Remboursement de {$amount} GNF en cours."
            : "ImmoGuinée: Paiement de {$amount} GNF libéré.";

        return (new TwilioSmsMessage())
            ->content($text);
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'payment_id' => $this->payment->id,
            'montant_gnf' => $this->payment->montant_total_gnf,
            'is_refund' => $this->isRefund,
            'numero_transaction' => $this->payment->numero_transaction,
        ];
    }
}
