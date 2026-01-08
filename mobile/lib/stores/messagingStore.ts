import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createEncryptedStorage } from '@/lib/storage/EncryptedStorage';
import { Message, Conversation } from '@/types';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface LocalMessage extends Message {
  localId?: string;
  status?: MessageStatus;
  localMediaReady?: boolean;
}

interface TypingUser {
  userId: string;
  timestamp: number;
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
}

interface MessagingState {
  // Data
  conversations: Conversation[];
  messages: Record<string, LocalMessage[]>;
  typingUsers: Record<string, TypingUser[]>;
  onlineUsers: Record<string, OnlineUser>;
  pendingMessages: LocalMessage[];

  // Connection state
  isConnected: boolean;
  lastSyncTime: number | null;

  // UI state
  activeConversationId: string | null;

  // Actions - Conversations
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;

  // Actions - Messages
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: LocalMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<LocalMessage>) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  markMessageAsDeleted: (conversationId: string, messageId: string, deletedForEveryone: boolean) => void;

  // Actions - Pending (offline) messages
  queueMessage: (message: LocalMessage) => void;
  removeFromQueue: (localId: string) => void;
  flushPendingMessages: () => LocalMessage[];

  // Actions - Typing
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearExpiredTyping: () => void;

  // Actions - Online status
  setUserOnline: (user: OnlineUser) => void;
  setUserOffline: (userId: string) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  isUserOnline: (userId: string) => boolean;

  // Actions - Connection
  setConnected: (isConnected: boolean) => void;
  setActiveConversation: (conversationId: string | null) => void;

  // Actions - Sync
  updateLastSyncTime: () => void;

  // Selectors
  getConversation: (conversationId: string) => Conversation | undefined;
  getMessages: (conversationId: string) => LocalMessage[];
  getTypingUsers: (conversationId: string) => string[];
  getTotalUnreadCount: () => number;
}

// Typing indicator timeout (3 seconds)
const TYPING_TIMEOUT = 3000;

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
  // Initial state
  conversations: [],
  messages: {},
  typingUsers: {},
  onlineUsers: {},
  pendingMessages: [],
  isConnected: false,
  lastSyncTime: null,
  activeConversationId: null,

  // Conversations
  setConversations: (conversations) => set({ conversations }),

  updateConversation: (conversationId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    })),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations.filter((c) => c.id !== conversation.id)],
    })),

  // Messages
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages.map((m) => ({ ...m, status: 'read' as MessageStatus })),
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existingMessages = state.messages[conversationId] || [];

      // Avoid duplicates
      if (existingMessages.some((m) => m.id === message.id || m.localId === message.localId)) {
        return state;
      }

      // Add message and update conversation's last_message
      const newMessages = [...existingMessages, message];

      // Update conversation with new last message
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message: message,
            updated_at: message.created_at,
          };
        }
        return conv;
      });

      // Sort conversations by last message time
      updatedConversations.sort((a, b) => {
        const aTime = new Date(a.last_message?.created_at || a.updated_at).getTime();
        const bTime = new Date(b.last_message?.created_at || b.updated_at).getTime();
        return bTime - aTime;
      });

      return {
        messages: { ...state.messages, [conversationId]: newMessages },
        conversations: updatedConversations,
      };
    }),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId || m.localId === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const newMessages = { ...state.messages };

      // Find and update the message in any conversation
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].map((m) =>
          m.id === messageId || m.localId === messageId ? { ...m, status } : m
        );
      }

      return { messages: newMessages };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).filter(
          (m) => m.id !== messageId && m.localId !== messageId
        ),
      },
    })),

  markMessageAsDeleted: (conversationId, messageId, deletedForEveryone) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                contenu: deletedForEveryone ? 'Ce message a été supprimé' : m.contenu,
                deleted_for_everyone: deletedForEveryone,
              }
            : m
        ),
      },
    })),

  // Pending messages
  queueMessage: (message) =>
    set((state) => ({
      pendingMessages: [...state.pendingMessages, message],
    })),

  removeFromQueue: (localId) =>
    set((state) => ({
      pendingMessages: state.pendingMessages.filter((m) => m.localId !== localId),
    })),

  flushPendingMessages: () => {
    const { pendingMessages } = get();
    set({ pendingMessages: [] });
    return pendingMessages;
  },

  // Typing
  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const currentTyping = state.typingUsers[conversationId] || [];

      if (isTyping) {
        // Add or update typing user
        const filtered = currentTyping.filter((t) => t.userId !== userId);
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...filtered, { userId, timestamp: Date.now() }],
          },
        };
      } else {
        // Remove typing user
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: currentTyping.filter((t) => t.userId !== userId),
          },
        };
      }
    }),

  clearExpiredTyping: () =>
    set((state) => {
      const now = Date.now();
      const newTypingUsers: Record<string, TypingUser[]> = {};

      for (const convId in state.typingUsers) {
        const filtered = state.typingUsers[convId].filter(
          (t) => now - t.timestamp < TYPING_TIMEOUT
        );
        if (filtered.length > 0) {
          newTypingUsers[convId] = filtered;
        }
      }

      return { typingUsers: newTypingUsers };
    }),

  // Online status
  setUserOnline: (user) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [user.id]: user },
    })),

  setUserOffline: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.onlineUsers;
      return { onlineUsers: rest };
    }),

  setOnlineUsers: (users) =>
    set(() => ({
      onlineUsers: users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, OnlineUser>),
    })),

  isUserOnline: (userId) => userId in get().onlineUsers,

  // Connection
  setConnected: (isConnected) => set({ isConnected }),

  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),

  // Sync
  updateLastSyncTime: () => set({ lastSyncTime: Date.now() }),

  // Selectors
  getConversation: (conversationId) =>
    get().conversations.find((c) => c.id === conversationId),

  getMessages: (conversationId) => get().messages[conversationId] || [],

  getTypingUsers: (conversationId) => {
    const now = Date.now();
    return (get().typingUsers[conversationId] || [])
      .filter((t) => now - t.timestamp < TYPING_TIMEOUT)
      .map((t) => t.userId);
  },

  getTotalUnreadCount: () =>
    get().conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0),
    }),
    {
      name: 'immoguinee-messaging',
      // Use encrypted storage for sensitive message data (AES-256-GCM)
      storage: createJSONStorage(createEncryptedStorage),
      // Only persist pending messages and conversations for offline support
      partialize: (state) => ({
        pendingMessages: state.pendingMessages,
        conversations: state.conversations,
        messages: state.messages,
      }),
    }
  )
);

// Cleanup interval for expired typing indicators
if (typeof window !== 'undefined') {
  setInterval(() => {
    useMessagingStore.getState().clearExpiredTyping();
  }, 1000);
}
