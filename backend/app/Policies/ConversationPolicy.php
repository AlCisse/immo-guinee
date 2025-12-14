<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ConversationPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the conversation.
     */
    public function viewConversation(User $user, Conversation $conversation): bool
    {
        // User must be one of the participants
        return $conversation->initiator_id === $user->id
            || $conversation->participant_id === $user->id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can send a message in the conversation.
     */
    public function send(User $user, Conversation $conversation): bool
    {
        // User must be one of the participants and conversation must be active
        return ($conversation->initiator_id === $user->id
                || $conversation->participant_id === $user->id)
            && $conversation->is_active;
    }

    /**
     * Determine whether the user can archive the conversation.
     */
    public function archive(User $user, Conversation $conversation): bool
    {
        return $conversation->initiator_id === $user->id
            || $conversation->participant_id === $user->id;
    }
}
