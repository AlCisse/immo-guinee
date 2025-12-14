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

class ContractSigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Contract $contract,
        public string $signerRole // 'locataire' or 'bailleur'
    ) {}

    /**
     * Get the channels the event should broadcast on.
     * FR-037: Notify both parties when contract is signed
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->contract->locataire_id),
            new PrivateChannel('user.' . $this->contract->bailleur_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'contract.signed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'contract_id' => $this->contract->id,
            'numero_contrat' => $this->contract->numero_contrat,
            'signer_role' => $this->signerRole,
            'fully_signed' => $this->contract->isSigned(),
        ];
    }
}
