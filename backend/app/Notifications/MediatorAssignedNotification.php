<?php

namespace App\Notifications;

use App\Models\Dispute;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MediatorAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Dispute $dispute,
        public User $mediator,
        public string $recipientRole // 'plaignant', 'defendeur', 'mediator'
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $subject = match ($this->recipientRole) {
            'mediator' => "Nouveau litige à médier: {$this->dispute->reference_litige}",
            default => "Un médiateur a été assigné à votre litige",
        };

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting("Bonjour {$notifiable->nom_complet},");

        if ($this->recipientRole === 'mediator') {
            $message->line("Un nouveau litige vous a été assigné pour médiation.")
                ->line("**Référence:** {$this->dispute->reference_litige}")
                ->line("**Catégorie:** {$this->dispute->categorie}")
                ->line("**Plaignant:** {$this->dispute->plaignant->nom_complet}")
                ->line("**Défendeur:** {$this->dispute->defendeur->nom_complet}")
                ->action('Voir le litige', url("/admin/disputes/{$this->dispute->id}"));
        } else {
            $message->line("Un médiateur a été assigné à votre litige.")
                ->line("**Référence:** {$this->dispute->reference_litige}")
                ->line("**Médiateur:** {$this->mediator->nom_complet}")
                ->line("Le médiateur vous contactera prochainement pour commencer la médiation.")
                ->action('Voir le litige', url("/dashboard/disputes/{$this->dispute->id}"));
        }

        return $message->line('Merci de votre confiance.')
            ->salutation('L\'équipe ImmoGuinée');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'mediator_assigned',
            'dispute_id' => $this->dispute->id,
            'dispute_reference' => $this->dispute->reference_litige,
            'mediator_id' => $this->mediator->id,
            'mediator_name' => $this->mediator->nom_complet,
            'recipient_role' => $this->recipientRole,
            'message' => $this->recipientRole === 'mediator'
                ? "Nouveau litige assigné: {$this->dispute->reference_litige}"
                : "Médiateur {$this->mediator->nom_complet} assigné à votre litige",
        ];
    }
}
