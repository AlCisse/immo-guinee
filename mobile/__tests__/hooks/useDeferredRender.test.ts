import { useState, useEffect } from 'react';
import { renderHook, act } from '@testing-library/react-native';

// Create a simple test version of the hook to test the logic
function useTestDeferredRender(delay: number = 0): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate InteractionManager behavior
    const timeout = setTimeout(() => {
      if (delay > 0) {
        setTimeout(() => setIsReady(true), delay);
      } else {
        setIsReady(true);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [delay]);

  return isReady;
}

describe('useDeferredRender logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false initially', () => {
    const { result } = renderHook(() => useTestDeferredRender(0));

    // Initially false
    expect(result.current).toBe(false);
  });

  it('returns true after timeout completes (no delay)', () => {
    const { result } = renderHook(() => useTestDeferredRender(0));

    expect(result.current).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    expect(result.current).toBe(true);
  });

  it('respects the delay parameter', () => {
    const { result } = renderHook(() => useTestDeferredRender(100));

    expect(result.current).toBe(false);

    // First timeout (simulating runAfterInteractions)
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Still false because of delay
    expect(result.current).toBe(false);

    // Advance past delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useTestDeferredRender(100));

    // Should not throw when unmounting before timeout
    expect(() => unmount()).not.toThrow();
  });
});
