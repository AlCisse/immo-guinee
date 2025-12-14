<?php

namespace App\Repositories;

use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class MessageRepository
{
    /**
     * Find message by ID
     *
     * @param string $id
     * @return Message|null
     */
    public function findById(string $id): ?Message
    {
        return Message::with(['sender', 'conversation'])->find($id);
    }

    /**
     * Create a new message
     *
     * @param array $data
     * @return Message
     */
    public function create(array $data): Message
    {
        return Message::create($data);
    }

    /**
     * Get messages by conversation
     *
     * @param Conversation $conversation
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByConversation(Conversation $conversation, int $perPage = 50): LengthAwarePaginator
    {
        return Message::where('conversation_id', $conversation->id)
            ->with(['sender'])
            ->orderBy('created_at', 'asc')
            ->paginate($perPage);
    }

    /**
     * Get latest messages by conversation
     *
     * @param Conversation $conversation
     * @param int $limit
     * @return Collection
     */
    public function getLatestByConversation(Conversation $conversation, int $limit = 50): Collection
    {
        return Message::where('conversation_id', $conversation->id)
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();
    }

    /**
     * Mark message as read
     *
     * @param Message $message
     * @return Message
     */
    public function markAsRead(Message $message): Message
    {
        if (!$message->lu) {
            $message->lu = true;
            $message->date_lecture = now();
            $message->save();
        }

        return $message;
    }

    /**
     * Mark all messages in conversation as read for user
     *
     * @param Conversation $conversation
     * @param User $user
     * @return int Number of messages marked
     */
    public function markAllAsRead(Conversation $conversation, User $user): int
    {
        return Message::where('conversation_id', $conversation->id)
            ->where('expediteur_id', '!=', $user->id)
            ->where('lu', false)
            ->update([
                'lu' => true,
                'date_lecture' => now(),
            ]);
    }

    /**
     * Get unread messages count for user in conversation
     *
     * @param Conversation $conversation
     * @param User $user
     * @return int
     */
    public function getUnreadCount(Conversation $conversation, User $user): int
    {
        return Message::where('conversation_id', $conversation->id)
            ->where('expediteur_id', '!=', $user->id)
            ->where('lu', false)
            ->count();
    }

    /**
     * Get total unread messages count for user
     *
     * @param User $user
     * @return int
     */
    public function getTotalUnreadCount(User $user): int
    {
        $conversationIds = Conversation::where('user1_id', $user->id)
            ->orWhere('user2_id', $user->id)
            ->pluck('id');

        return Message::whereIn('conversation_id', $conversationIds)
            ->where('expediteur_id', '!=', $user->id)
            ->where('lu', false)
            ->count();
    }

    /**
     * Delete message
     *
     * @param Message $message
     * @return bool
     */
    public function delete(Message $message): bool
    {
        return $message->delete();
    }

    /**
     * Report message
     *
     * @param Message $message
     * @param User $reporter
     * @param string $reason
     * @return Message
     */
    public function report(Message $message, User $reporter, string $reason): Message
    {
        $message->is_reported = true;
        $message->reported_by = $reporter->id;
        $message->report_reason = $reason;
        $message->reported_at = now();
        $message->save();

        return $message;
    }

    /**
     * Get reported messages
     *
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getReported(int $perPage = 15): LengthAwarePaginator
    {
        return Message::where('is_reported', true)
            ->with(['sender', 'conversation'])
            ->orderBy('reported_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Block message (hide from conversation)
     *
     * @param Message $message
     * @return Message
     */
    public function block(Message $message): Message
    {
        $message->is_blocked = true;
        $message->blocked_at = now();
        $message->save();

        return $message;
    }

    /**
     * Search messages in conversation
     *
     * @param Conversation $conversation
     * @param string $searchTerm
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function searchInConversation(Conversation $conversation, string $searchTerm, int $perPage = 20): LengthAwarePaginator
    {
        return Message::where('conversation_id', $conversation->id)
            ->where('contenu', 'ILIKE', "%{$searchTerm}%")
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get messages with media (photos/files)
     *
     * @param Conversation $conversation
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getMediaMessages(Conversation $conversation, int $perPage = 20): LengthAwarePaginator
    {
        return Message::where('conversation_id', $conversation->id)
            ->where(function($query) {
                $query->whereNotNull('fichier_url')
                      ->orWhere('type_message', 'photo')
                      ->orWhere('type_message', 'fichier');
            })
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get voice messages
     *
     * @param Conversation $conversation
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getVoiceMessages(Conversation $conversation, int $perPage = 20): LengthAwarePaginator
    {
        return Message::where('conversation_id', $conversation->id)
            ->where('type_message', 'vocal')
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Check for spam/fraud keywords
     *
     * @param string $content
     * @return bool
     */
    public function containsSpamKeywords(string $content): bool
    {
        $keywords = [
            'whatsapp',
            'appeler',
            'numero',
            'téléphone',
            'telephone',
            'contact direct',
            'hors plateforme',
            'rencontrer',
            'western union',
            'moneygram',
            'virement bancaire',
            'paypal',
        ];

        $contentLower = strtolower($content);

        foreach ($keywords as $keyword) {
            if (str_contains($contentLower, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get message statistics for conversation
     *
     * @param Conversation $conversation
     * @return array
     */
    public function getConversationStats(Conversation $conversation): array
    {
        return [
            'total_messages' => Message::where('conversation_id', $conversation->id)->count(),
            'text_messages' => Message::where('conversation_id', $conversation->id)
                ->where('type_message', 'texte')->count(),
            'voice_messages' => Message::where('conversation_id', $conversation->id)
                ->where('type_message', 'vocal')->count(),
            'photo_messages' => Message::where('conversation_id', $conversation->id)
                ->where('type_message', 'photo')->count(),
            'unread_count' => Message::where('conversation_id', $conversation->id)
                ->where('lu', false)->count(),
            'reported_count' => Message::where('conversation_id', $conversation->id)
                ->where('is_reported', true)->count(),
        ];
    }

    /**
     * Get user message rate limit info
     *
     * @param User $user
     * @return array
     */
    public function getUserRateLimitInfo(User $user): array
    {
        $oneHourAgo = now()->subHour();
        $today = now()->startOfDay();

        $messagesLastHour = Message::where('expediteur_id', $user->id)
            ->where('created_at', '>', $oneHourAgo)
            ->count();

        $conversationsToday = Conversation::where(function($query) use ($user) {
                $query->where('user1_id', $user->id)
                      ->orWhere('user2_id', $user->id);
            })
            ->where('created_at', '>', $today)
            ->count();

        return [
            'messages_last_hour' => $messagesLastHour,
            'remaining_messages_hour' => max(0, 50 - $messagesLastHour),
            'conversations_today' => $conversationsToday,
            'remaining_conversations_day' => max(0, 10 - $conversationsToday),
            'can_send_message' => $messagesLastHour < 50,
            'can_create_conversation' => $conversationsToday < 10,
        ];
    }
}
