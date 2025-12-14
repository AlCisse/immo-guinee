<?php

namespace App\Events;

use App\Models\CertificationDocument;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentVerified implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public CertificationDocument $document
    ) {}

    /**
     * Get the channels the event should broadcast on.
     * FR-054: Notify user when document is verified
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->document->utilisateur_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'document.verified';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'document_id' => $this->document->id,
            'type_document' => $this->document->type_document,
            'statut_verification' => $this->document->statut_verification,
        ];
    }
}
