<?php

namespace App\Notifications;

use App\Channels\WahaChannel;
use App\Channels\WhatsAppMessage;
use App\Models\Visit;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VisitRequestNotification extends Notification
{
    use Queueable;

    protected Visit $visit;
    protected string $responseUrl;

    public function __construct(Visit $visit, string $responseUrl)
    {
        $this->visit = $visit;
        $this->responseUrl = $responseUrl;
    }

    public function via(object $notifiable): array
    {
        return [WahaChannel::class];
    }

    public function toWhatsApp($notifiable): WhatsAppMessage
    {
        $visit = $this->visit;
        $listing = $visit->listing;
        $dateFormatted = $visit->date_visite->format('d/m/Y');
        $heureFormatted = $visit->heure_visite->format('H:i');

        $message = WhatsAppMessage::create()
            ->bold("📅 Nouvelle demande de visite - ImmoGuinée")
            ->emptyLine()
            ->line("Bonjour {$visit->client_nom},")
            ->emptyLine()
            ->line("Vous avez une demande de visite pour:")
            ->bold("🏠 {$listing->titre}")
            ->line("📍 {$listing->quartier}, {$listing->commune}")
            ->emptyLine()
            ->line("📆 Date proposée: {$dateFormatted}")
            ->line("🕐 Heure: {$heureFormatted}")
            ->emptyLine()
            ->line("Merci de répondre:")
            ->line("✅ Répondez 1 pour CONFIRMER")
            ->line("❌ Répondez 2 si INDISPONIBLE")
            ->line("📅 Répondez 3 pour PROPOSER UNE AUTRE DATE")
            ->emptyLine()
            ->line("Ou cliquez ici: {$this->responseUrl}")
            ->type('visit_request')
            ->metadata([
                'visit_id' => $visit->id,
                'listing_id' => $listing->id,
                'date_visite' => $dateFormatted,
                'heure_visite' => $heureFormatted,
            ]);

        return $message;
    }
}
