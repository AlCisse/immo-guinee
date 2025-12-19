import api from './api';
import { Listing, PaginatedResponse, SearchFilters, Media } from '../types';

interface ListingsParams extends SearchFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Get listings with filters
export const getListings = async (params: ListingsParams = {}): Promise<PaginatedResponse<Listing>> => {
  const response = await api.get<PaginatedResponse<Listing>>('/listings', { params });
  return response.data;
};

// Get single listing
export const getListing = async (id: string): Promise<Listing> => {
  const response = await api.get<{ data: Listing }>(`/listings/${id}`);
  return response.data.data;
};

// Get featured listings
export const getFeaturedListings = async (limit: number = 10): Promise<Listing[]> => {
  const response = await api.get<{ data: Listing[] }>('/listings/featured', {
    params: { limit },
  });
  return response.data.data;
};

// Get recent listings
export const getRecentListings = async (limit: number = 10): Promise<Listing[]> => {
  const response = await api.get<{ data: Listing[] }>('/listings/recent', {
    params: { limit },
  });
  return response.data.data;
};

// Search listings
export const searchListings = async (
  query: string,
  filters: SearchFilters = {},
  page: number = 1
): Promise<PaginatedResponse<Listing>> => {
  const response = await api.get<PaginatedResponse<Listing>>('/listings/search', {
    params: { q: query, ...filters, page },
  });
  return response.data;
};

// Get user's listings
export const getMyListings = async (page: number = 1): Promise<PaginatedResponse<Listing>> => {
  const response = await api.get<PaginatedResponse<Listing>>('/user/listings', {
    params: { page },
  });
  return response.data;
};

// Create listing
export const createListing = async (data: Partial<Listing>): Promise<Listing> => {
  const response = await api.post<{ data: Listing }>('/listings', data);
  return response.data.data;
};

// Update listing
export const updateListing = async (id: string, data: Partial<Listing>): Promise<Listing> => {
  const response = await api.put<{ data: Listing }>(`/listings/${id}`, data);
  return response.data.data;
};

// Delete listing
export const deleteListing = async (id: string): Promise<void> => {
  await api.delete(`/listings/${id}`);
};

// Upload media for listing
export const uploadListingMedia = async (
  listingId: string,
  files: { uri: string; type: string; name: string }[]
): Promise<Media[]> => {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append(`files[${index}]`, {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
  });

  const response = await api.post<{ data: Media[] }>(
    `/listings/${listingId}/media`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
};

// Delete media
export const deleteListingMedia = async (listingId: string, mediaId: string): Promise<void> => {
  await api.delete(`/listings/${listingId}/media/${mediaId}`);
};

// Increment view count
export const recordListingView = async (id: string): Promise<void> => {
  await api.post(`/listings/${id}/view`);
};

// Get similar listings
export const getSimilarListings = async (id: string, limit: number = 4): Promise<Listing[]> => {
  const response = await api.get<{ data: Listing[] }>(`/listings/${id}/similar`, {
    params: { limit },
  });
  return response.data.data;
};
