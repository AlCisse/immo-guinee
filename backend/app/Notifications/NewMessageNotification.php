<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    protected string $senderName;
    protected string $messagePreview;
    protected ?string $listingTitle;

    public function __construct(string $senderName, string $messagePreview, ?string $listingTitle = null)
    {
        $this->senderName = $senderName;
        $this->messagePreview = $this->truncate($messagePreview, 100);
        $this->listingTitle = $listingTitle;
    }

    public function via(object $notifiable): array
    {
        return [WahaChannel::class];
    }

    public function toWhatsApp($notifiable): WhatsAppMessage
    {
        $message = WhatsAppMessage::create()
            ->bold("Nouveau message sur ImmoGuinee")
            ->emptyLine()
            ->line("De: {$this->senderName}");

        if ($this->listingTitle) {
            $message->line("Annonce: {$this->listingTitle}");
        }

        $message->line("Message: {$this->messagePreview}")
            ->emptyLine()
            ->action("Repondre", config('app.frontend_url') . '/messages')
            ->type('new_message')
            ->metadata([
                'sender_name' => $this->senderName,
                'listing_title' => $this->listingTitle,
            ]);

        return $message;
    }

    protected function truncate(string $text, int $maxLength): string
    {
        if (strlen($text) <= $maxLength) {
            return $text;
        }
        return substr($text, 0, $maxLength - 3) . '...';
    }
}
