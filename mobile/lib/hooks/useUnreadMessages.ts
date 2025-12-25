import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface Conversation {
  id: string;
  unread_count: number;
  [key: string]: any;
}

export function useUnreadMessages() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      try {
        const response = await api.messaging.conversations();
        const conversations: Conversation[] = response.data?.data || [];

        // Sum up all unread counts from all conversations
        const totalUnread = conversations.reduce(
          (sum, conv) => sum + (conv.unread_count || 0),
          0
        );

        return totalUnread;
      } catch (error) {
        if (__DEV__) console.error('Failed to fetch unread messages count:', error);
        return 0;
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    unreadCount: data || 0,
    isLoading,
    refetch,
  };
}
