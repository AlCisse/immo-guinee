<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentConfirmed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Payment $payment
    ) {}

    /**
     * Get the channels the event should broadcast on.
     * FR-053: Real-time notification via broadcasting
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->payment->payeur_id),
            new PrivateChannel('user.' . $this->payment->beneficiaire_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'payment.confirmed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'payment_id' => $this->payment->id,
            'montant_gnf' => $this->payment->montant_total_gnf,
            'numero_transaction' => $this->payment->numero_transaction,
            'statut' => $this->payment->statut,
        ];
    }
}
