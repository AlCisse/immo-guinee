<?php

namespace App\Events;

use App\Models\Listing;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ListingUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $listing;
    public $updateType;

    /**
     * Create a new event instance.
     */
    public function __construct(Listing $listing, string $updateType = 'updated')
    {
        $this->listing = $listing;
        $this->updateType = $updateType;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->listing->proprietaire_id),
            new Channel('listings.' . $this->listing->commune),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'listing.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->listing->id,
            'titre' => $this->listing->titre,
            'type_propriete' => $this->listing->type_propriete,
            'type_transaction' => $this->listing->type_transaction,
            'prix' => $this->listing->prix,
            'statut' => $this->listing->statut,
            'commune' => $this->listing->commune,
            'quartier' => $this->listing->quartier,
            'update_type' => $this->updateType,
            'updated_at' => $this->listing->updated_at->toISOString(),
        ];
    }
}
