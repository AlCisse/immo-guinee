<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentNotification extends Notification
{
    use Queueable;

    protected string $amount;
    protected string $reference;
    protected string $status; // confirmed, failed, pending
    protected ?string $description;

    /**
     * Create a new notification instance.
     *
     * @param string $amount
     * @param string $reference
     * @param string $status
     * @param string|null $description
     */
    public function __construct(string $amount, string $reference, string $status = 'confirmed', ?string $description = null)
    {
        $this->amount = $amount;
        $this->reference = $reference;
        $this->status = $status;
        $this->description = $description;
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
        $emoji = match ($this->status) {
            'confirmed' => '✅',
            'failed' => '❌',
            'pending' => '⏳',
            default => '💳',
        };

        $title = match ($this->status) {
            'confirmed' => "Paiement confirmé",
            'failed' => "Paiement échoué",
            'pending' => "Paiement en cours",
            default => "Mise à jour paiement",
        };

        $statusText = match ($this->status) {
            'confirmed' => "Votre paiement a été traité avec succès.",
            'failed' => "Votre paiement n'a pas pu être traité.",
            'pending' => "Votre paiement est en cours de traitement.",
            default => "Le statut de votre paiement a été mis à jour.",
        };

        $message = WhatsAppMessage::create()
            ->bold("{$emoji} {$title}")
            ->emptyLine()
            ->line("Montant: {$this->amount} GNF")
            ->line("Référence: {$this->reference}");

        if ($this->description) {
            $message->line("Description: {$this->description}");
        }

        $message->emptyLine()
            ->line($statusText)
            ->emptyLine()
            ->line("Merci d'utiliser ImmoGuinée!")
            ->type('payment')
            ->metadata([
                'amount' => $this->amount,
                'reference' => $this->reference,
                'status' => $this->status,
            ]);

        return $message;
    }
}
