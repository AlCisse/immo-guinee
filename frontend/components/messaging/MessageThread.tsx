'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';
import { apiClient } from '@/lib/api/client';
import { Spinner } from '@/components/ui/Spinner';

interface Message {
  id: string;
  conversation_id: string;
  expediteur_id: string;
  type_message: 'TEXTE' | 'VOCAL' | 'PHOTO' | 'LOCALISATION_GPS';
  contenu_texte: string | null;
  fichier_url: string | null;
  localisation_lat_lng: string | null;
  horodatage: string;
  statut_lecture: 'ENVOYE' | 'LIVRE' | 'LU';
  sender: {
    id: string;
    nom_complet: string;
    prenom: string;
  };
}

interface MessageThreadProps {
  conversationId: string;
}

// Fetch messages for a conversation
async function fetchMessages(conversationId: string): Promise<Message[]> {
  const response = await apiClient.get(`/messaging/${conversationId}/messages`);
  return response.data.data || [];
}

export default function MessageThread({ conversationId }: MessageThreadProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 5000, // Poll for new messages
  });

  // Get current user ID (would come from auth context in real app)
  const currentUserId = 'current-user-id'; // Placeholder

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2 text-gray-500">Aucun message</p>
            <p className="text-sm text-gray-400">
              Commencez la conversation !
            </p>
          </div>
        </div>
      ) : (
        <>
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                  {date}
                </span>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages.map((message, index) => {
                  const isOwn = message.expediteur_id === currentUserId;
                  const showAvatar =
                    index === 0 ||
                    dateMessages[index - 1]?.expediteur_id !== message.expediteur_id;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typingUser && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
              <span>{typingUser} écrit...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  showAvatar,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}) {
  const statusIcon = getStatusIcon(message.statut_lecture);

  return (
    <div
      className={clsx(
        'flex gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">
            {message.sender.prenom.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Message content */}
      <div
        className={clsx(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOwn
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        )}
      >
        {/* Text message */}
        {message.type_message === 'TEXTE' && (
          <p className="whitespace-pre-wrap break-words">{message.contenu_texte}</p>
        )}

        {/* Voice message */}
        {message.type_message === 'VOCAL' && (
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-white/20 hover:bg-white/30">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1 h-1 bg-white/30 rounded-full">
              <div className="h-full w-1/3 bg-white rounded-full" />
            </div>
            <span className="text-xs opacity-70">0:15</span>
          </div>
        )}

        {/* Photo message */}
        {message.type_message === 'PHOTO' && message.fichier_url && (
          <img
            src={message.fichier_url}
            alt="Photo partagée"
            className="rounded-lg max-w-full"
          />
        )}

        {/* Location message */}
        {message.type_message === 'LOCALISATION_GPS' && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Position partagée</span>
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={clsx(
            'flex items-center gap-1 mt-1 text-xs',
            isOwn ? 'text-white/70 justify-end' : 'text-gray-400'
          )}
        >
          <span>
            {format(new Date(message.horodatage), 'HH:mm', { locale: fr })}
          </span>
          {isOwn && statusIcon}
        </div>
      </div>
    </div>
  );
}

// Get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case 'LU':
      return (
        <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
        </svg>
      );
    case 'LIVRE':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41z" />
        </svg>
      );
    case 'ENVOYE':
    default:
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      );
  }
}

// Group messages by date
function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};

  messages.forEach((message) => {
    const date = new Date(message.horodatage);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    if (date.toDateString() === today.toDateString()) {
      dateKey = "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Hier';
    } else {
      dateKey = format(date, 'd MMMM yyyy', { locale: fr });
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return groups;
}
