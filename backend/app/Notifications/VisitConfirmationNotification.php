<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VisitConfirmationNotification extends Notification
{
    use Queueable;

    protected string $listingTitle;
    protected string $visitDate;
    protected string $visitTime;
    protected string $address;
    protected bool $isOwner;

    /**
     * Create a new notification instance.
     *
     * @param string $listingTitle
     * @param string $visitDate
     * @param string $visitTime
     * @param string $address
     * @param bool $isOwner
     */
    public function __construct(
        string $listingTitle,
        string $visitDate,
        string $visitTime,
        string $address,
        bool $isOwner = false
    ) {
        $this->listingTitle = $listingTitle;
        $this->visitDate = $visitDate;
        $this->visitTime = $visitTime;
        $this->address = $address;
        $this->isOwner = $isOwner;
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
        $title = $this->isOwner
            ? "Visite programmée pour votre bien"
            : "Visite confirmée";

        $message = WhatsAppMessage::create()
            ->bold("📅 {$title} - ImmoGuinée")
            ->emptyLine()
            ->line("Bien: {$this->listingTitle}")
            ->line("Date: {$this->visitDate}")
            ->line("Heure: {$this->visitTime}")
            ->line("Adresse: {$this->address}");

        if ($this->isOwner) {
            $message->emptyLine()
                ->line("Un visiteur est intéressé par votre bien.");
        }

        $message->emptyLine()
            ->line("À bientôt!")
            ->type('visit_confirmation')
            ->metadata([
                'listing_title' => $this->listingTitle,
                'visit_date' => $this->visitDate,
                'visit_time' => $this->visitTime,
                'address' => $this->address,
                'is_owner' => $this->isOwner,
            ]);

        return $message;
    }
}
