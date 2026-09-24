// Vibration (spec 9.7). Browser Vibration API for now; Capacitor Haptics replaces it in phase 6.
export const HAPTICS = { light: 12, medium: 35, legendary: [40, 60, 40, 60, 120] };

export function createHaptics({ isEnabled }) {
  return {
    vibrate(kind) {
      if (!isEnabled() || typeof navigator === 'undefined' || !navigator.vibrate) return;
      navigator.vibrate(HAPTICS[kind]);
    },
  };
}
