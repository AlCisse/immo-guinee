import { useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Hook to defer rendering heavy components until after navigation animations complete.
 * This improves perceived performance by allowing the screen transition to complete
 * smoothly before rendering expensive content.
 *
 * @param delay - Optional additional delay in ms after interactions complete
 * @returns boolean - true when the component should render its heavy content
 *
 * @example
 * function MyScreen() {
 *   const isReady = useDeferredRender();
 *
 *   if (!isReady) {
 *     return <ScreenLoader />;
 *   }
 *
 *   return <HeavyContent />;
 * }
 */
export function useDeferredRender(delay: number = 0): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for navigation animations to complete
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      if (delay > 0) {
        setTimeout(() => setIsReady(true), delay);
      } else {
        setIsReady(true);
      }
    });

    return () => interactionPromise.cancel();
  }, [delay]);

  return isReady;
}

/**
 * Hook to defer rendering with a placeholder component.
 * Returns the actual component or placeholder based on readiness.
 *
 * @param Component - The heavy component to render
 * @param Placeholder - The placeholder component to show while waiting
 * @param props - Props to pass to the Component
 * @param delay - Optional delay after interactions
 */
export function useDeferredComponent<P extends object>(
  Component: React.ComponentType<P>,
  Placeholder: React.ComponentType,
  props: P,
  delay: number = 0
): React.ReactElement {
  const isReady = useDeferredRender(delay);

  if (!isReady) {
    return <Placeholder />;
  }

  return <Component {...props} />;
}

export default useDeferredRender;
