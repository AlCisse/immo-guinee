import { useEffect, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface Conversation {
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

export interface Message {
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

export interface SendMessageData {
  type_message: 'TEXTE' | 'VOCAL' | 'PHOTO' | 'LOCALISATION_GPS';
  contenu_texte?: string;
  fichier?: File;
  localisation_lat_lng?: string;
}

export interface RateLimitStatus {
  messages_per_hour: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  };
  new_conversations_per_day: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  };
}

// API functions
async function fetchConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/messaging/conversations');
  return response.data.data || [];
}

async function fetchMessages(conversationId: string): Promise<Message[]> {
  const response = await apiClient.get(`/messaging/${conversationId}/messages`);
  return response.data.data || [];
}

async function sendMessage(conversationId: string, data: SendMessageData) {
  const formData = new FormData();
  formData.append('type_message', data.type_message);

  if (data.contenu_texte) {
    formData.append('contenu_texte', data.contenu_texte);
  }

  if (data.fichier) {
    formData.append('fichier', data.fichier);
  }

  if (data.localisation_lat_lng) {
    formData.append('localisation_lat_lng', data.localisation_lat_lng);
  }

  const response = await apiClient.post(`/messaging/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
}

async function archiveConversation(conversationId: string) {
  const response = await apiClient.post(`/messaging/${conversationId}/archive`);
  return response.data;
}

async function reportMessage(messageId: string, reason: string) {
  const response = await apiClient.post(`/messaging/messages/${messageId}/report`, { raison: reason });
  return response.data;
}

async function sendTypingIndicator(conversationId: string, isTyping: boolean) {
  const response = await apiClient.post(`/messaging/${conversationId}/typing`, { is_typing: isTyping });
  return response.data;
}

// Hooks

/**
 * Fetch all conversations for the current user
 */
export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });
}

/**
 * Fetch messages for a specific conversation
 */
export function useMessages(conversationId: string) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

/**
 * Send a message mutation
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageData) => sendMessage(conversationId, data),
    onSuccess: (newMessage) => {
      // Add message to cache optimistically
      queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => [
        ...old,
        newMessage,
      ]);
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Archive a conversation mutation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Report a message mutation
 */
export function useReportMessage() {
  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      reportMessage(messageId, reason),
  });
}

/**
 * Send typing indicator
 */
export function useTypingIndicator(conversationId: string) {
  const [isTyping, setIsTyping] = useState(false);

  const sendIndicator = useCallback(
    async (typing: boolean) => {
      if (typing !== isTyping) {
        setIsTyping(typing);
        try {
          await sendTypingIndicator(conversationId, typing);
        } catch (err) {
          console.error('Failed to send typing indicator:', err);
        }
      }
    },
    [conversationId, isTyping]
  );

  return { isTyping, sendIndicator };
}

/**
 * Real-time messaging with Laravel Echo
 */
export function useMessagingRealtime(conversationId: string) {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    // Check if Echo is available (from window)
    const Echo = (window as any).Echo;
    if (!Echo) {
      console.warn('Laravel Echo not initialized');
      return;
    }

    // Subscribe to private conversation channel
    const channel = Echo.private(`conversation.${conversationId}`);

    // Listen for new messages
    channel.listen('.NewMessageEvent', (event: any) => {
      // Add new message to cache
      queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
        // Check if message already exists
        if (old.some((m) => m.id === event.id)) {
          return old;
        }
        return [...old, event];
      });

      // Invalidate conversations to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Listen for typing indicators
    channel.listen('.typing.indicator', (event: any) => {
      if (event.is_typing) {
        setTypingUsers((prev) => {
          if (!prev.includes(event.user_name)) {
            return [...prev, event.user_name];
          }
          return prev;
        });

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((name) => name !== event.user_name));
        }, 3000);
      } else {
        setTypingUsers((prev) => prev.filter((name) => name !== event.user_name));
      }
    });

    // Listen for message read events
    channel.listen('.message.read', (event: any) => {
      queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) =>
        old.map((m) =>
          m.id === event.message_id ? { ...m, statut_lecture: 'LU' } : m
        )
      );
    });

    // Cleanup
    return () => {
      Echo.leave(`conversation.${conversationId}`);
    };
  }, [conversationId, queryClient]);

  return { typingUsers };
}

// Utility functions

/**
 * Get the other participant in a conversation
 */
export function getOtherParticipant(conversation: Conversation, currentUserId: string) {
  if (conversation.participant_1_id === currentUserId) {
    return conversation.participant2;
  }
  return conversation.participant1;
}

/**
 * Format message preview for conversation list
 */
export function formatMessagePreview(message: Message): string {
  switch (message.type_message) {
    case 'TEXTE':
      const text = message.contenu_texte || '';
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    case 'VOCAL':
      return '🎤 Message vocal';
    case 'PHOTO':
      return '📷 Photo';
    case 'LOCALISATION_GPS':
      return '📍 Position partagée';
    default:
      return 'Message';
  }
}

/**
 * Get unread message count for a conversation
 */
export function getUnreadCount(conversation: Conversation): number {
  return conversation.unread_count || 0;
}

/**
 * Check if a message was sent by the current user
 */
export function isOwnMessage(message: Message, currentUserId: string): boolean {
  return message.expediteur_id === currentUserId;
}
