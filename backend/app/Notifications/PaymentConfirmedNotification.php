<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentConfirmedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $payment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Payment $payment)
    {
        $this->payment = $payment;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $montantTotal = number_format($this->payment->montant_total, 0, ',', ' ');

        return (new MailMessage)
            ->subject('Paiement confirmé')
            ->greeting("Bonjour {$notifiable->prenom} !")
            ->line("Votre paiement a été confirmé avec succès.")
            ->line("Référence: {$this->payment->reference_paiement}")
            ->line("Montant: {$montantTotal} GNF")
            ->line("Méthode: {$this->payment->methode_paiement}")
            ->action('Voir les détails', url('/dashboard/mes-paiements/' . $this->payment->id))
            ->line('Merci d\'utiliser ImmoGuinée !');
    }
}
