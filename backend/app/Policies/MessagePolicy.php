<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class MessagePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view messages in a conversation.
     */
    public function viewConversation(User $user, Conversation $conversation): bool
    {
        // User must be one of the participants
        return $conversation->initiator_id === $user->id
            || $conversation->participant_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can send a message.
     */
    public function send(User $user, Conversation $conversation): bool
    {
        // User must be one of the participants and conversation must be active
        return ($conversation->initiator_id === $user->id
                || $conversation->participant_id === $user->id)
            && $conversation->is_active;
    }

    /**
     * Determine whether the user can report a message.
     */
    public function report(User $user, Message $message): bool
    {
        // User must be in the conversation (not the sender)
        $conversation = $message->conversation;

        return ($conversation->initiator_id === $user->id
                || $conversation->participant_id === $user->id)
            && $message->sender_id !== $user->id;
    }

    /**
     * Determine whether the user can delete a message.
     */
    public function delete(User $user, Message $message): bool
    {
        // User can delete their own message within 5 minutes
        if ($message->sender_id === $user->id
            && $message->created_at->diffInMinutes(now()) <= 5) {
            return true;
        }

        // Admin can always delete
        return $user->hasRole('admin');
    }
}
