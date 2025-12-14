<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserVerificationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $verificationType;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, string $verificationType)
    {
        $this->user = $user;
        $this->verificationType = $verificationType;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->user->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'user.verification.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'verification_type' => $this->verificationType,
            'telephone_verifie' => $this->user->telephone_verifie,
            'email_verifie' => $this->user->email_verifie,
            'identite_verifiee' => $this->user->identite_verifiee,
            'badge' => $this->user->badge,
            'updated_at' => $this->user->updated_at->toISOString(),
        ];
    }
}
