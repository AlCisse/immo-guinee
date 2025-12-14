<?php

namespace App\Events;

use App\Models\Dispute;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DisputeOpened implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Dispute $dispute
    ) {}

    /**
     * Get the channels the event should broadcast on.
     * FR-072: Notify both parties of dispute opening
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->dispute->demandeur_id),
            new PrivateChannel('user.' . $this->dispute->defendeur_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'dispute.opened';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'dispute_id' => $this->dispute->id,
            'type_litige' => $this->dispute->type_litige,
            'montant_reclame_gnf' => $this->dispute->montant_reclame_gnf,
            'statut' => $this->dispute->statut,
        ];
    }
}
