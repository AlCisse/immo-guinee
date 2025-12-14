<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContractNotification extends Notification
{
    use Queueable;

    protected string $contractType;
    protected string $reference;
    protected string $action; // created, signed, cancelled, etc.

    /**
     * Create a new notification instance.
     *
     * @param string $contractType
     * @param string $reference
     * @param string $action
     */
    public function __construct(string $contractType, string $reference, string $action = 'created')
    {
        $this->contractType = $contractType;
        $this->reference = $reference;
        $this->action = $action;
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
        $title = match ($this->action) {
            'created' => "Nouveau contrat - ImmoGuinée",
            'signed' => "Contrat signé - ImmoGuinée",
            'cancelled' => "Contrat annulé - ImmoGuinée",
            'pending_signature' => "Signature requise - ImmoGuinée",
            default => "Mise à jour contrat - ImmoGuinée",
        };

        $description = match ($this->action) {
            'created' => "Un nouveau contrat a été créé.",
            'signed' => "Le contrat a été signé avec succès.",
            'cancelled' => "Le contrat a été annulé.",
            'pending_signature' => "Votre signature est requise sur ce contrat.",
            default => "Le statut du contrat a été mis à jour.",
        };

        return WhatsAppMessage::create()
            ->bold($title)
            ->emptyLine()
            ->line("Type: {$this->contractType}")
            ->line("Référence: {$this->reference}")
            ->emptyLine()
            ->line($description)
            ->emptyLine()
            ->action("Voir le contrat", config('app.frontend_url') . '/contrats')
            ->type('contract')
            ->metadata([
                'contract_type' => $this->contractType,
                'reference' => $this->reference,
                'action' => $this->action,
            ]);
    }
}
