import { useEffect, useReducer } from 'react';

// Re-renders a screen when an ad becomes ready or is used, and loads ahead the placements it offers.
export function useAds(adManager, placements = []) {
  const [, refresh] = useReducer((n) => n + 1, 0);
  const key = placements.join(',');
  useEffect(() => {
    const unsubscribe = adManager.subscribe(refresh);
    for (const type of key ? key.split(',') : []) adManager.prepare(type);
    return unsubscribe;
  }, [adManager, key]);
}
