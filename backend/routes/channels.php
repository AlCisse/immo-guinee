<?php

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

// Private conversation channel
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    // TODO: T189-T195 - Verify user is participant in conversation
    return true; // Implement proper authorization
});

// Private user notification channel
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Listing updates channel (for real-time availability)
Broadcast::channel('listing.{listingId}', function ($user, $listingId) {
    return true; // Public channel
});
