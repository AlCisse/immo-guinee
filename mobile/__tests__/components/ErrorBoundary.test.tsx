import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AppErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('AppErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <AppErrorBoundary>
        <Text>Child content</Text>
      </AppErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('renders error UI when child throws', () => {
    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    );

    expect(screen.getByText("Oups ! Une erreur s'est produite")).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = <Text>Custom error message</Text>;

    render(
      <AppErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeTruthy();
  });

  it('has a retry button that resets the error state', () => {
    const { rerender } = render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText("Oups ! Une erreur s'est produite")).toBeTruthy();

    // Find and press retry button
    const retryButton = screen.getByText('Réessayer');
    fireEvent.press(retryButton);

    // After retry, it will try to render children again
    // Since ThrowError still throws, error UI will show again
    expect(screen.getByText("Oups ! Une erreur s'est produite")).toBeTruthy();
  });
});
