<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ListingExpirationNotification extends Notification
{
    use Queueable;

    protected string $listingTitle;
    protected int $daysRemaining;
    protected string $listingId;

    /**
     * Create a new notification instance.
     *
     * @param string $listingTitle
     * @param int $daysRemaining
     * @param string $listingId
     */
    public function __construct(string $listingTitle, int $daysRemaining, string $listingId)
    {
        $this->listingTitle = $listingTitle;
        $this->daysRemaining = $daysRemaining;
        $this->listingId = $listingId;
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
        $urgency = $this->daysRemaining <= 1 ? '🚨' : '⏰';
        $dayText = $this->daysRemaining === 1 ? 'jour' : 'jours';

        return WhatsAppMessage::create()
            ->bold("{$urgency} Rappel - Annonce bientôt expirée")
            ->emptyLine()
            ->line("Votre annonce \"{$this->listingTitle}\" expire dans {$this->daysRemaining} {$dayText}.")
            ->emptyLine()
            ->line("Renouvelez-la maintenant pour rester visible!")
            ->emptyLine()
            ->action("Renouveler", config('app.frontend_url') . '/mes-annonces/' . $this->listingId)
            ->type('listing_reminder')
            ->metadata([
                'listing_title' => $this->listingTitle,
                'listing_id' => $this->listingId,
                'days_remaining' => $this->daysRemaining,
            ]);
    }
}
