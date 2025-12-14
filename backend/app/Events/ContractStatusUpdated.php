<?php

namespace App\Events;

use App\Models\Contract;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContractStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $contract;

    /**
     * Create a new event instance.
     */
    public function __construct(Contract $contract)
    {
        $this->contract = $contract;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('contract.' . $this->contract->id),
        ];

        // Notify both parties
        if ($this->contract->locataire_id) {
            $channels[] = new PrivateChannel('user.' . $this->contract->locataire_id);
        }
        if ($this->contract->proprietaire_id) {
            $channels[] = new PrivateChannel('user.' . $this->contract->proprietaire_id);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'contract.status.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->contract->id,
            'reference' => $this->contract->reference,
            'statut' => $this->contract->statut,
            'type_contrat' => $this->contract->type_contrat,
            'date_debut' => $this->contract->date_debut?->toDateString(),
            'date_fin' => $this->contract->date_fin?->toDateString(),
            'updated_at' => $this->contract->updated_at->toISOString(),
        ];
    }
}
