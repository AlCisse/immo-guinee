import { create } from 'zustand';
import { toggleFavorite } from '../services/favorites';

interface FavoritesState {
  favoriteIds: Set<string>;
  isLoading: Record<string, boolean>;

  // Actions
  addFavoriteId: (id: string) => void;
  removeFavoriteId: (id: string) => void;
  setFavoriteIds: (ids: string[]) => void;
  toggleFavoriteOptimistic: (listingId: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),
  isLoading: {},

  addFavoriteId: (id) => {
    set((state) => ({
      favoriteIds: new Set([...state.favoriteIds, id]),
    }));
  },

  removeFavoriteId: (id) => {
    set((state) => {
      const newSet = new Set(state.favoriteIds);
      newSet.delete(id);
      return { favoriteIds: newSet };
    });
  },

  setFavoriteIds: (ids) => {
    set({ favoriteIds: new Set(ids) });
  },

  toggleFavoriteOptimistic: async (listingId) => {
    const { favoriteIds, isLoading } = get();

    if (isLoading[listingId]) return;

    const wasFavorite = favoriteIds.has(listingId);

    // Optimistic update
    set((state) => {
      const newSet = new Set(state.favoriteIds);
      if (wasFavorite) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return {
        favoriteIds: newSet,
        isLoading: { ...state.isLoading, [listingId]: true },
      };
    });

    try {
      await toggleFavorite(listingId);
    } catch (error) {
      // Revert on error
      set((state) => {
        const newSet = new Set(state.favoriteIds);
        if (wasFavorite) {
          newSet.add(listingId);
        } else {
          newSet.delete(listingId);
        }
        return { favoriteIds: newSet };
      });
      throw error;
    } finally {
      set((state) => ({
        isLoading: { ...state.isLoading, [listingId]: false },
      }));
    }
  },

  isFavorite: (id) => {
    return get().favoriteIds.has(id);
  },
}));
