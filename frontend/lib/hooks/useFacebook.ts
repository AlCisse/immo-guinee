import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface FacebookPageConnection {
  id: string;
  page_id: string;
  page_name: string;
  auto_publish_enabled: boolean;
  token_expires_at: string;
  is_token_valid: boolean;
  posts_count: number;
  last_published_at: string | null;
  created_at: string;
}

export interface FacebookPost {
  id: string;
  listing_id: string;
  facebook_post_id: string;
  status: 'pending' | 'published' | 'failed' | 'deleted';
  post_url: string | null;
  published_at: string | null;
  deleted_at: string | null;
  error_message: string | null;
  listing: {
    id: string;
    titre: string;
    prix: number;
    photo_principale_url: string | null;
  };
}

export interface FacebookStatistics {
  total_posts: number;
  published_posts: number;
  failed_posts: number;
  deleted_posts: number;
  last_7_days: number;
  last_30_days: number;
}

export interface FacebookStatus {
  connected: boolean;
  connection: FacebookPageConnection | null;
}

/**
 * Hook for checking Facebook connection status
 */
export function useFacebookStatus() {
  return useQuery({
    queryKey: ['facebook', 'status'],
    queryFn: async (): Promise<FacebookStatus> => {
      try {
        const response = await api.facebook.status();
        // Handle different response structures
        const data = response.data?.data || response.data;
        return {
          connected: data?.connected ?? false,
          connection: data?.connection ?? null,
        };
      } catch (error) {
        // Return default state on error (not connected)
        return { connected: false, connection: null };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: false, // Don't retry on auth errors
  });
}

/**
 * Hook for initiating Facebook OAuth connection
 */
export function useFacebookConnect() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.facebook.connect();
      const data = response.data?.data || response.data;
      return { authorization_url: data?.authorization_url || '' };
    },
  });
}

/**
 * Hook for disconnecting Facebook page
 */
export function useFacebookDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.facebook.disconnect();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook'] });
    },
  });
}

/**
 * Hook for toggling auto-publish setting
 */
export function useFacebookToggleAutoPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await api.facebook.toggleAutoPublish(enabled);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook', 'status'] });
    },
  });
}

/**
 * Hook for refreshing Facebook token
 */
export function useFacebookRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.facebook.refreshToken();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook', 'status'] });
    },
  });
}

/**
 * Hook for fetching Facebook posts
 */
export function useFacebookPosts(params?: {
  page?: number;
  per_page?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['facebook', 'posts', params],
    queryFn: async () => {
      const response = await api.facebook.posts(params);
      return response.data.data as {
        posts: FacebookPost[];
        pagination: {
          current_page: number;
          per_page: number;
          total: number;
          last_page: number;
        };
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for fetching Facebook statistics
 */
export function useFacebookStatistics() {
  return useQuery({
    queryKey: ['facebook', 'statistics'],
    queryFn: async () => {
      const response = await api.facebook.statistics();
      return response.data.data as FacebookStatistics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for manually publishing a listing to Facebook
 */
export function usePublishToFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const response = await api.facebook.publishListing(listingId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['facebook', 'statistics'] });
    },
  });
}

/**
 * Hook for deleting a listing from Facebook
 */
export function useDeleteFromFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const response = await api.facebook.deleteListing(listingId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['facebook', 'statistics'] });
    },
  });
}
