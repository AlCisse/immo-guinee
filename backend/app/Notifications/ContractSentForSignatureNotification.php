<?php

namespace App\Notifications;

use App\Models\Contract;
use App\Channels\SmsChannel;
use App\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class ContractSentForSignatureNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Contract $contract;
    protected ?string $customMessage;
    protected array $channels;

    /**
     * Create a new notification instance.
     */
    public function __construct(Contract $contract, ?string $customMessage = null, array $channels = ['sms', 'email', 'push', 'whatsapp'])
    {
        $this->contract = $contract;
        $this->customMessage = $customMessage;
        $this->channels = $channels;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $availableChannels = [];

        // Map requested channels to Laravel notification channels
        foreach ($this->channels as $channel) {
            switch ($channel) {
                case 'email':
                    if ($notifiable->email && $notifiable->preferences['notifications']['email'] ?? true) {
                        $availableChannels[] = 'mail';
                    }
                    break;
                case 'sms':
                    if ($notifiable->telephone && $notifiable->preferences['notifications']['sms'] ?? true) {
                        $availableChannels[] = SmsChannel::class;
                    }
                    break;
                case 'push':
                    if ($notifiable->preferences['notifications']['push'] ?? true) {
                        $availableChannels[] = 'database'; // Store for in-app notifications
                        // WebPush for browser notifications if enabled
                        if (class_exists(WebPushChannel::class)) {
                            $availableChannels[] = WebPushChannel::class;
                        }
                    }
                    break;
                case 'whatsapp':
                    if ($notifiable->whatsapp_number && $notifiable->preferences['notifications']['whatsapp'] ?? false) {
                        $availableChannels[] = WhatsAppChannel::class;
                    }
                    break;
            }
        }

        // Always include database for tracking
        if (!in_array('database', $availableChannels)) {
            $availableChannels[] = 'database';
        }

        return array_unique($availableChannels);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $listing = $this->contract->listing;
        $proprietaire = $this->contract->proprietaire;

        $mail = (new MailMessage)
            ->subject('Contrat à signer - ' . $this->contract->reference)
            ->greeting("Bonjour {$notifiable->prenom} !")
            ->line("Vous avez reçu un contrat de location à signer de la part de {$proprietaire->nom_complet}.");

        if ($listing) {
            $mail->line("Bien concerné: {$listing->titre} - {$listing->quartier}");
        }

        $mail->line("Type de contrat: " . $this->getContractTypeLabel())
            ->line("Loyer mensuel: " . number_format($this->contract->loyer_mensuel, 0, ',', ' ') . ' GNF')
            ->line("Période: du " . $this->contract->date_debut->format('d/m/Y') . " au " . $this->contract->date_fin->format('d/m/Y'));

        if ($this->customMessage) {
            $mail->line('')
                ->line("Message du propriétaire:")
                ->line("\"{$this->customMessage}\"");
        }

        $mail->action('Consulter et signer le contrat', url('/contrats/' . $this->contract->id . '/signer'))
            ->line('')
            ->line('Vous avez 7 jours pour signer ce contrat avant expiration.')
            ->salutation("L'équipe ImmoGuinée");

        return $mail;
    }

    /**
     * Get the SMS representation of the notification.
     */
    public function toSms($notifiable): array
    {
        $message = "ImmoGuinée: Vous avez reçu un contrat de location à signer ({$this->contract->reference}). ";
        $message .= "Loyer: " . number_format($this->contract->loyer_mensuel, 0, ',', ' ') . " GNF/mois. ";
        $message .= "Consultez: " . url('/contrats/' . $this->contract->id);

        return [
            'to' => $notifiable->telephone,
            'message' => $message,
        ];
    }

    /**
     * Get the WhatsApp representation of the notification.
     */
    public function toWhatsApp($notifiable): array
    {
        $listing = $this->contract->listing;
        $proprietaire = $this->contract->proprietaire;

        $message = "*ImmoGuinée - Contrat à signer*\n\n";
        $message .= "Bonjour {$notifiable->prenom},\n\n";
        $message .= "Vous avez reçu un contrat de location à signer:\n\n";
        $message .= "*Référence:* {$this->contract->reference}\n";
        $message .= "*Type:* " . $this->getContractTypeLabel() . "\n";
        $message .= "*Propriétaire:* {$proprietaire->nom_complet}\n";

        if ($listing) {
            $message .= "*Bien:* {$listing->titre}\n";
            $message .= "*Adresse:* {$listing->quartier}\n";
        }

        $message .= "*Loyer:* " . number_format($this->contract->loyer_mensuel, 0, ',', ' ') . " GNF/mois\n";
        $message .= "*Période:* {$this->contract->date_debut->format('d/m/Y')} - {$this->contract->date_fin->format('d/m/Y')}\n\n";

        if ($this->customMessage) {
            $message .= "*Message:* \"{$this->customMessage}\"\n\n";
        }

        $message .= "Consultez et signez: " . url('/contrats/' . $this->contract->id);

        return [
            'to' => $notifiable->whatsapp_number ?? $notifiable->telephone,
            'message' => $message,
            'type' => 'text',
        ];
    }

    /**
     * Get the Web Push representation of the notification.
     */
    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Contrat à signer - ImmoGuinée')
            ->icon('/images/icons/icon-192x192.png')
            ->badge('/images/icons/badge-72x72.png')
            ->body("Vous avez reçu un contrat de location ({$this->contract->reference}) à signer.")
            ->action('Voir le contrat', 'view_contract')
            ->data(['contract_id' => $this->contract->id])
            ->tag('contract-' . $this->contract->id)
            ->requireInteraction();
    }

    /**
     * Get the array representation of the notification (for database storage).
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'contract_sent_for_signature',
            'contract_id' => $this->contract->id,
            'contract_reference' => $this->contract->reference,
            'contract_type' => $this->contract->type_contrat,
            'listing_id' => $this->contract->listing_id,
            'listing_title' => $this->contract->listing?->titre,
            'proprietaire_id' => $this->contract->proprietaire_id,
            'proprietaire_name' => $this->contract->proprietaire?->nom_complet,
            'loyer_mensuel' => $this->contract->loyer_mensuel,
            'date_debut' => $this->contract->date_debut->format('Y-m-d'),
            'date_fin' => $this->contract->date_fin->format('Y-m-d'),
            'custom_message' => $this->customMessage,
            'action_url' => '/contrats/' . $this->contract->id . '/signer',
            'channels_used' => $this->channels,
            'sent_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get human-readable contract type label.
     */
    protected function getContractTypeLabel(): string
    {
        return match ($this->contract->type_contrat) {
            'BAIL_LOCATION_RESIDENTIEL' => 'Bail de location résidentiel',
            'BAIL_LOCATION_COMMERCIAL' => 'Bail de location commercial',
            'PROMESSE_VENTE_TERRAIN' => 'Promesse de vente de terrain',
            'MANDAT_GESTION' => 'Mandat de gestion',
            'ATTESTATION_CAUTION' => 'Attestation de caution',
            default => str_replace('_', ' ', $this->contract->type_contrat),
        };
    }
}
