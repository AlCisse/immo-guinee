<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Private conversation channel - verify user is participant
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);

    if (!$conversation) {
        return false;
    }

    // User must be initiator or participant
    $isParticipant = $conversation->initiator_id === $user->id ||
                     $conversation->participant_id === $user->id;

    if ($isParticipant) {
        return [
            'id' => $user->id,
            'name' => $user->nom_complet ?? $user->name,
        ];
    }

    return false;
});

// Private user notification channel
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return $user->id === $userId;
});

// Presence channel for online users
Broadcast::channel('presence-users', function ($user) {
    return [
        'id' => $user->id,
        'name' => $user->nom_complet ?? $user->name,
        'avatar' => $user->avatar_url ?? null,
    ];
});

// Listing updates channel (public)
Broadcast::channel('listing.{listingId}', function ($user, $listingId) {
    return true;
});
