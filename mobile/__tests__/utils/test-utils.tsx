import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock Auth Context
const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  token: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  updateUser: jest.fn(),
  isLoading: false,
};

// Mock AuthProvider
const MockAuthProvider: React.FC<{
  children: React.ReactNode;
  value?: Partial<typeof mockAuthContext>;
}> = ({ children, value = {} }) => {
  const contextValue = { ...mockAuthContext, ...value };
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Create mock context (simplified)
const AuthContext = React.createContext(mockAuthContext);

interface AllTheProvidersProps {
  children: React.ReactNode;
  authValue?: Partial<typeof mockAuthContext>;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children, authValue }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider value={authValue}>{children}</MockAuthProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<typeof mockAuthContext>;
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { authValue, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders authValue={authValue}>{children}</AllTheProviders>,
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render, mockAuthContext, createTestQueryClient };
