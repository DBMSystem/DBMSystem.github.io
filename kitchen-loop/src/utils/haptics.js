import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './platform.js';

// Vibration (spec 9.7): Capacitor Haptics on Android, the Vibration API in the browser.
export const HAPTICS = { light: 12, medium: 35, legendary: [40, 60, 40, 60, 120] };
const IMPACT = { light: ImpactStyle.Light, medium: ImpactStyle.Medium };

function nativeVibrate(kind) {
  if (IMPACT[kind]) return Haptics.impact({ style: IMPACT[kind] });
  // A pattern: vibrate on the even entries, wait on the odd ones.
  let at = 0;
  HAPTICS[kind].forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(() => Haptics.vibrate({ duration: ms }).catch(() => {}), at);
    at += ms;
  });
  return Promise.resolve();
}

export function createHaptics({ isEnabled }) {
  return {
    vibrate(kind) {
      if (!isEnabled() || !HAPTICS[kind]) return;
      if (isNative()) {
        nativeVibrate(kind).catch(() => {});
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(HAPTICS[kind]);
    },
  };
}
