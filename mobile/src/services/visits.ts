import api from './api';
import { Visit, PaginatedResponse } from '../types';

// Get user's visits (as visitor or owner)
export const getVisits = async (
  type: 'visitor' | 'owner' = 'visitor',
  page: number = 1
): Promise<PaginatedResponse<Visit>> => {
  const response = await api.get<PaginatedResponse<Visit>>('/visits', {
    params: { type, page },
  });
  return response.data;
};

// Get single visit
export const getVisit = async (id: string): Promise<Visit> => {
  const response = await api.get<{ data: Visit }>(`/visits/${id}`);
  return response.data.data;
};

// Request a visit
export const requestVisit = async (data: {
  listing_id: string;
  date_visite: string;
  heure_debut: string;
  heure_fin: string;
  notes?: string;
}): Promise<Visit> => {
  const response = await api.post<{ data: Visit }>('/visits', data);
  return response.data.data;
};

// Update visit status (for property owner)
export const updateVisitStatus = async (
  id: string,
  statut: 'CONFIRMEE' | 'ANNULEE'
): Promise<Visit> => {
  const response = await api.put<{ data: Visit }>(`/visits/${id}`, { statut });
  return response.data.data;
};

// Cancel visit (for visitor)
export const cancelVisit = async (id: string): Promise<Visit> => {
  const response = await api.put<{ data: Visit }>(`/visits/${id}/cancel`);
  return response.data.data;
};

// Get available time slots for a listing
export const getAvailableSlots = async (
  listingId: string,
  date: string
): Promise<{ heure_debut: string; heure_fin: string }[]> => {
  const response = await api.get<{ data: { heure_debut: string; heure_fin: string }[] }>(
    `/listings/${listingId}/available-slots`,
    { params: { date } }
  );
  return response.data.data;
};
