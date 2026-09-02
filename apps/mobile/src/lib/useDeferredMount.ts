import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Returns `false` on first render, then flips to `true` once the current
 * navigation/animation interactions have finished.
 *
 * Use it to defer mounting heavy screen content (charts, long lists, animated
 * cards) so the screen shell + skeleton paint immediately on navigation and the
 * expensive tree renders a frame later — the tap no longer feels frozen.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => handle.cancel();
  }, []);

  return ready;
}
