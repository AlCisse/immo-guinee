import api from './api';
import { Favorite, PaginatedResponse } from '../types';

// Get user's favorites
export const getFavorites = async (page: number = 1): Promise<PaginatedResponse<Favorite>> => {
  const response = await api.get<PaginatedResponse<Favorite>>('/user/favorites', {
    params: { page },
  });
  return response.data;
};

// Add to favorites
export const addToFavorites = async (listingId: string): Promise<Favorite> => {
  const response = await api.post<{ data: Favorite }>('/user/favorites', {
    listing_id: listingId,
  });
  return response.data.data;
};

// Remove from favorites
export const removeFromFavorites = async (listingId: string): Promise<void> => {
  await api.delete(`/user/favorites/${listingId}`);
};

// Check if listing is favorited
export const checkFavorite = async (listingId: string): Promise<boolean> => {
  const response = await api.get<{ data: { is_favorite: boolean } }>(
    `/user/favorites/${listingId}/check`
  );
  return response.data.data.is_favorite;
};

// Toggle favorite
export const toggleFavorite = async (listingId: string): Promise<{ is_favorite: boolean }> => {
  const response = await api.post<{ data: { is_favorite: boolean } }>(
    `/user/favorites/${listingId}/toggle`
  );
  return response.data.data;
};
