'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Spinner } from '@/components/ui/Spinner';
import ConversationList from '@/components/messaging/ConversationList';
import MessageThread from '@/components/messaging/MessageThread';
import MessageInput from '@/components/messaging/MessageInput';

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  participant1: {
    id: string;
    nom_complet: string;
    prenom: string;
    badge_certification: string;
  };
  participant2: {
    id: string;
    nom_complet: string;
    prenom: string;
    badge_certification: string;
  };
  listing?: {
    id: string;
    titre: string;
    photo_principale_url: string;
  };
  unread_count: number;
  date_dernier_message: string;
  statut: string;
}

// Fetch conversations
async function fetchConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/messaging/conversations');
  return response.data.data || [];
}

export default function MessagingPage() {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get('conversation');

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversationIdParam
  );
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Handle conversation selection on mobile
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsMobileListVisible(false);
  };

  const handleBackToList = () => {
    setIsMobileListVisible(true);
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erreur lors du chargement des conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Conversation List - Hidden on mobile when a conversation is selected */}
      <div
        className={`${
          isMobileListVisible ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 lg:w-96 flex-shrink-0 flex-col border-r border-gray-200 bg-white`}
      >
        <div className="border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Messagerie</h1>
          <p className="text-sm text-gray-500">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
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
              <p className="mt-2 text-gray-500">Aucune conversation</p>
              <p className="text-sm text-gray-400">
                Contactez un propriétaire depuis une annonce
              </p>
            </div>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Message Thread - Full width on mobile when a conversation is selected */}
      <div
        className={`${
          !isMobileListVisible || !selectedConversationId ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col bg-white`}
      >
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-200 px-4 py-3">
              <button
                onClick={handleBackToList}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
                aria-label="Retour à la liste"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">
                  {getOtherParticipant(selectedConversation).nom_complet}
                </h2>
                {selectedConversation.listing && (
                  <p className="text-sm text-gray-500 truncate">
                    {selectedConversation.listing.titre}
                  </p>
                )}
              </div>

              {/* Options menu */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <MessageThread conversationId={selectedConversation.id} />

            {/* Input */}
            <MessageInput conversationId={selectedConversation.id} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-gray-300"
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
              <p className="mt-4 text-gray-500">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to get the other participant
function getOtherParticipant(conversation: Conversation) {
  // This would normally use the current user's ID
  // For now, we'll return participant2 as a placeholder
  return conversation.participant2;
}
