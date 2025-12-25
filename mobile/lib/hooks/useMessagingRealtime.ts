import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMessagingStore } from '@/lib/stores/messagingStore';
import {
  initializeEcho,
  disconnectEcho,
  subscribeToConversation,
  subscribeToUserChannel,
  subscribeToPresence,
  unsubscribeFromConversation,
  sendTypingIndicator as sendTyping,
  isConnected,
  getConnectionState,
} from '@/lib/socket/echo';
import { api } from '@/lib/api/client';

/**
 * Hook to manage real-time messaging connection and subscriptions
 */
export function useMessagingConnection() {
  const { isAuthenticated, user } = useAuth();
  const {
    setConnected,
    setOnlineUsers,
    setUserOnline,
    setUserOffline,
  } = useMessagingStore();

  const initializationRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectEcho();
      setConnected(false);
      return;
    }

    if (initializationRef.current) return;

    const initialize = async () => {
      initializationRef.current = true;

      const echo = await initializeEcho();
      if (echo) {
        setConnected(true);

        // Subscribe to presence channel for online users
        subscribeToPresence({
          onHere: (users) => {
            setOnlineUsers(users);
          },
          onJoining: (user) => {
            setUserOnline(user);
          },
          onLeaving: (user) => {
            setUserOffline(user.id);
          },
        });

        // Subscribe to user's personal channel
        subscribeToUserChannel(user.id, {
          onNotification: (notification) => {
            if (__DEV__) console.log('[Realtime] Notification:', notification);
            // Handle push notification display
          },
        });

        // Update online status on server
        try {
          await api.auth.updateProfile({ is_online: true });
        } catch (error) {
          if (__DEV__) console.error('[Realtime] Failed to update online status:', error);
        }
      }
    };

    initialize();

    return () => {
      // Set offline when unmounting
      api.auth.updateProfile({ is_online: false }).catch(() => {});
      disconnectEcho();
      setConnected(false);
      initializationRef.current = false;
    };
  }, [isAuthenticated, user]);

  return {
    isConnected: isConnected(),
    connectionState: getConnectionState(),
  };
}

/**
 * Hook to subscribe to a specific conversation's real-time events
 */
export function useConversationRealtime(conversationId: string | null) {
  const {
    addMessage,
    updateMessageStatus,
    setTyping,
    markMessageAsDeleted,
    setActiveConversation,
  } = useMessagingStore();

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Set active conversation
    setActiveConversation(conversationId);

    // Subscribe to conversation channel
    channelRef.current = subscribeToConversation(conversationId, {
      onMessage: (message) => {
        addMessage(conversationId, {
          ...message,
          status: 'read',
        });

        // Mark message as delivered on server
        markAsDelivered(message.id);
      },
      onTyping: (data) => {
        setTyping(conversationId, data.userId, data.isTyping);
      },
      onRead: (data) => {
        updateMessageStatus(data.messageId, 'read');
      },
      onDelivered: (data) => {
        updateMessageStatus(data.messageId, 'delivered');
      },
    });

    return () => {
      if (conversationId) {
        unsubscribeFromConversation(conversationId);
      }
      setActiveConversation(null);
      channelRef.current = null;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  // Debounced typing indicator sender
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      sendTyping(conversationId, isTyping);

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(conversationId, false);
        }, 3000);
      }
    },
    [conversationId]
  );

  return {
    sendTypingIndicator,
  };
}

/**
 * Send message with optimistic update
 */
export function useSendMessage(conversationId: string) {
  const { addMessage, updateMessage, queueMessage, removeFromQueue } = useMessagingStore();

  const sendMessage = useCallback(
    async (content: string, type: 'TEXT' | 'VOCAL' = 'TEXT', file?: FormData) => {
      const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create optimistic message
      const optimisticMessage = {
        id: localId,
        localId,
        conversation_id: conversationId,
        type_message: type,
        contenu: content,
        status: 'sending' as const,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      // Add to store immediately (optimistic update)
      addMessage(conversationId, optimisticMessage);

      try {
        // Send to server
        const data = file || { type_message: type, contenu: content };
        const response = await api.messaging.sendMessage(conversationId, data);

        // Update with real message from server
        updateMessage(conversationId, localId, {
          id: response.data.data.id,
          status: 'sent',
        });

        return response.data.data;
      } catch (error) {
        // Mark as failed
        updateMessage(conversationId, localId, { status: 'failed' });

        // Queue for retry if offline
        if (!isConnected()) {
          queueMessage(optimisticMessage);
        }

        throw error;
      }
    },
    [conversationId, addMessage, updateMessage, queueMessage]
  );

  return { sendMessage };
}

/**
 * Mark message as delivered on server
 */
async function markAsDelivered(messageId: string): Promise<void> {
  try {
    // This endpoint needs to be added to the backend
    await api.messaging.markDelivered?.(messageId);
  } catch (error) {
    if (__DEV__) console.error('[Realtime] Failed to mark as delivered:', error);
  }
}

/**
 * Hook for typing indicator display
 */
export function useTypingIndicator(conversationId: string) {
  const typingUsers = useMessagingStore((state) => state.getTypingUsers(conversationId));

  const getTypingText = useCallback(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return 'est en train d\'écrire...';
    if (typingUsers.length === 2) return 'sont en train d\'écrire...';
    return `${typingUsers.length} personnes écrivent...`;
  }, [typingUsers]);

  return {
    isTyping: typingUsers.length > 0,
    typingText: getTypingText(),
    typingUserIds: typingUsers,
  };
}

/**
 * Hook to get online status of a user
 */
export function useUserOnlineStatus(userId: string) {
  const isOnline = useMessagingStore((state) => state.isUserOnline(userId));
  const onlineUsers = useMessagingStore((state) => state.onlineUsers);

  const user = onlineUsers.get(userId);

  return {
    isOnline,
    user,
  };
}

/**
 * Hook to get unread message count
 */
export function useUnreadCount() {
  const totalUnread = useMessagingStore((state) => state.getTotalUnreadCount());

  return totalUnread;
}
