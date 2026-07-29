import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';

// Mock the API
jest.mock('@/lib/api/client', () => ({
  api: {
    listings: {
      my: jest.fn(() => Promise.resolve({ data: { data: { listings: [] } } })),
      update: jest.fn(() => Promise.resolve({ data: {} })),
      delete: jest.fn(() => Promise.resolve({ data: {} })),
    },
  },
}));

// Mock auth context
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1' },
  }),
}));

import { useMyListings } from '@/lib/hooks/useMyListings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useMyListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.editModalVisible).toBe(false);
    expect(result.current.deleteModalVisible).toBe(false);
    expect(result.current.editingListing).toBeNull();
    expect(result.current.deleteReason).toBeNull();
  });

  it('opens edit modal with listing data', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    const mockListing = {
      id: '1',
      titre: 'Test Listing',
      description: 'Description',
      loyer_mensuel: 500000,
      quartier: 'Kaloum',
      commune: 'Conakry',
    };

    act(() => {
      result.current.openEditModal(mockListing as any);
    });

    expect(result.current.editModalVisible).toBe(true);
    expect(result.current.editForm.titre).toBe('Test Listing');
    expect(result.current.editForm.loyer_mensuel).toBe('500000');
  });

  it('closes edit modal and resets state', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openEditModal({ id: '1', titre: 'Test' } as any);
    });

    expect(result.current.editModalVisible).toBe(true);

    act(() => {
      result.current.closeEditModal();
    });

    expect(result.current.editModalVisible).toBe(false);
    expect(result.current.editingListing).toBeNull();
  });

  it('updates form data correctly', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openEditModal({ id: '1', titre: 'Initial' } as any);
    });

    act(() => {
      result.current.handleFormChange({ titre: 'Updated Title' });
    });

    expect(result.current.editForm.titre).toBe('Updated Title');
  });

  it('opens delete modal', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    const mockListing = { id: '1', titre: 'Test' };

    act(() => {
      result.current.openDeleteModal(mockListing as any);
    });

    expect(result.current.deleteModalVisible).toBe(true);
  });

  it('sets delete reason', () => {
    const { result } = renderHook(() => useMyListings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openDeleteModal({ id: '1' } as any);
    });

    act(() => {
      result.current.setDeleteReason('loue_immoguinee');
    });

    expect(result.current.deleteReason).toBe('loue_immoguinee');
  });
});
