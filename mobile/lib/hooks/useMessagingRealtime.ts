import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMessagingStore } from '@/lib/stores/messagingStore';

// Typing indicator timeout (3 seconds)
const TYPING_TIMEOUT = 3000;
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
import { receiveEncryptedMedia } from '@/lib/services';
import { storePendingKey, deletePendingKey } from '@/lib/storage';

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

  // Get connection state from store instead of calling functions directly
  const connected = useMessagingStore((state) => state.isConnected);

  return {
    isConnected: connected,
    connectionState: getConnectionState(),
  };
}

/**
 * Hook to subscribe to a specific conversation's real-time events
 */
export function useConversationRealtime(conversationId: string | null) {
  const { user } = useAuth();
  const {
    addMessage,
    updateMessage,
    updateMessageStatus,
    setTyping,
    markMessageAsDeleted,
    setActiveConversation,
    isConnected: storeIsConnected,
  } = useMessagingStore();

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;

    // Set active conversation
    setActiveConversation(conversationId);

    // Reset subscription flag when conversation changes
    hasSubscribedRef.current = false;

    // Retry subscription with delay if not connected
    const attemptSubscription = (attempt: number = 0) => {
      // Don't subscribe twice
      if (hasSubscribedRef.current) return;

      const state = getConnectionState();
      if (state !== 'connected' && attempt < 5) {
        subscriptionTimeoutRef.current = setTimeout(() => attemptSubscription(attempt + 1), 1000);
        return;
      }

      hasSubscribedRef.current = true;

      // Subscribe to conversation channel
      channelRef.current = subscribeToConversation(conversationId, {
        onMessage: async (message) => {
          // Handle E2E encrypted media (only for messages from others)
          const mediaId = message.encrypted_media?.id || message.encrypted_media_id;
          const needsDownload = message.sender_id !== user?.id && message.is_e2e_encrypted && mediaId && message.encryption_key;

          // Normalize encrypted_media_id from WebSocket structure
          const normalizedMessage = {
            ...message,
            status: 'read' as const,
            // WebSocket sends encrypted_media.id, but store/render expects encrypted_media_id
            encrypted_media_id: message.encrypted_media_id || message.encrypted_media?.id,
            // Set localMediaReady: false for messages that need download (shows loading)
            // Set localMediaReady: true for sender's own messages
            // Leave undefined for messages from others without encryption_key
            localMediaReady: message.sender_id === user?.id ? true : (needsDownload ? false : undefined),
          };

          addMessage(conversationId, normalizedMessage);

          // Download E2E encrypted media
          if (needsDownload) {
            if (__DEV__) console.log('[Realtime] Downloading E2E media:', mediaId);

            // Store the pending key first (in case download fails, we can retry later)
            await storePendingKey(mediaId, message.encryption_key, conversationId, message.sender_id);

            try {
              await receiveEncryptedMedia({
                mediaId,
                encryptionKey: message.encryption_key,
                conversationId,
                senderId: message.sender_id,
              });
              // Update message to indicate local media is ready - triggers UI refresh
              if (__DEV__) console.log('[Realtime] E2E download complete, setting localMediaReady');
              updateMessage(conversationId, message.id, { localMediaReady: true });
              // Delete pending key after successful download
              await deletePendingKey(mediaId);
            } catch (error) {
              if (__DEV__) console.error('[Realtime] E2E download failed:', error);
              // Keep pending key for retry, but mark as ready so user can try to play
              updateMessage(conversationId, message.id, { localMediaReady: true });
            }
          }

          // Mark message as delivered on server (only for messages from others)
          if (message.sender_id !== user?.id) {
            markAsDelivered(message.id);
          }
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

      if (!channelRef.current && __DEV__) {
        console.warn('[Realtime] Failed to subscribe - channel is null');
      }
    };

    attemptSubscription();

    return () => {
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
      if (conversationId) {
        unsubscribeFromConversation(conversationId);
      }
      setActiveConversation(null);
      channelRef.current = null;
      hasSubscribedRef.current = false;

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
  const { user } = useAuth();
  const { addMessage, updateMessage, queueMessage, removeFromQueue } = useMessagingStore();

  const sendMessage = useCallback(
    async (content: string, type: 'TEXT' | 'VOCAL' = 'TEXT', file?: FormData) => {
      const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create optimistic message
      const optimisticMessage = {
        id: localId,
        localId,
        conversation_id: conversationId,
        sender_id: user?.id || '',
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
    [conversationId, user?.id, addMessage, updateMessage, queueMessage]
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
  // Access typing users directly from state to avoid creating new array references
  const typingData = useMessagingStore((state) => state.typingUsers[conversationId]);

  // Memoize the filtered typing users to avoid recalculating on every render
  const typingUsers = useMemo(() => {
    if (!typingData || typingData.length === 0) return [];
    const now = Date.now();
    return typingData
      .filter((t) => now - t.timestamp < TYPING_TIMEOUT)
      .map((t) => t.userId);
  }, [typingData]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return 'est en train d\'écrire...';
    if (typingUsers.length === 2) return 'sont en train d\'écrire...';
    return `${typingUsers.length} personnes écrivent...`;
  }, [typingUsers]);

  return {
    isTyping: typingUsers.length > 0,
    typingText,
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
