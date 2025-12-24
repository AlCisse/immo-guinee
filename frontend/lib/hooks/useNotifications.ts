import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action_url?: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unread_count: number;
    total: number;
  };
}

interface UserCounts {
  unread_notifications: number;
  unread_messages: number;
  favorites_count: number;
}

// Fetch notifications from API
export function useNotifications(enabled: boolean = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.get<NotificationsResponse>('/notifications');
      return response.data;
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true,
  });
}

// Fetch user badge counts (notifications, messages, favorites)
export function useUserCounts(isAuthenticated: boolean) {
  return useQuery({
    queryKey: ['userCounts'],
    queryFn: async (): Promise<UserCounts> => {
      try {
        // Try to get counts from a dedicated endpoint
        const response = await apiClient.get('/auth/me/counts');
        return response.data.data || {
          unread_notifications: 0,
          unread_messages: 0,
          favorites_count: 0,
        };
      } catch {
        // Fallback: fetch from multiple endpoints in parallel
        try {
          const [messagesRes] = await Promise.allSettled([
            apiClient.get('/messaging/conversations?unread_only=true'),
          ]);

          let unreadMessages = 0;
          if (messagesRes.status === 'fulfilled') {
            const conversations = messagesRes.value.data?.data || [];
            unreadMessages = conversations.reduce(
              (acc: number, conv: { unread_count?: number }) => acc + (conv.unread_count || 0),
              0
            );
          }

          return {
            unread_notifications: 0,
            unread_messages: unreadMessages,
            favorites_count: 0,
          };
        } catch {
          return {
            unread_notifications: 0,
            unread_messages: 0,
            favorites_count: 0,
          };
        }
      }
    },
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.post(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userCounts'] });
    },
  });
}
