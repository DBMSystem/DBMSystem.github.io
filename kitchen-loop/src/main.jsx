import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { createSaveManager } from './save/saveManager.js';
import { localStorageAdapter } from './save/storageAdapter.js';
import { createAdManager } from './monetization/adManager.js';
import { createAdMobProvider } from './monetization/admobProvider.js';
import { adUnitsReady } from './data/ads.js';
import { DEV_TOOLS, isNative } from './utils/platform.js';
import { loadSprites } from './assets/manifest.js';
import { createAudioManager } from './audio/audioManager.js';
import { createHaptics } from './utils/haptics.js';
import './styles.css';

const saveManager = createSaveManager(localStorageAdapter, { onEvent: (name) => console.info(`[analytics] ${name}`) });
const adManager = createAdManager({ saveManager });
// Android: AdMob with UMP consent (spec 7.7). Test ads in development/playtest builds and until the real ad
// units are filled in (src/data/ads.js).
if (isNative()) {
  createAdMobProvider({ testing: DEV_TOOLS || !adUnitsReady(), volume: () => saveManager.get()?.settings.sfx ?? 1, onChange: () => adManager.notify() })
    .then(adManager.setProvider)
    .catch(() => {}); // no plugin: ads stay unavailable
}
const audio = createAudioManager({ getVolume: () => saveManager.get()?.settings.sfx ?? 0 });
const haptics = createHaptics({ isEnabled: () => Boolean(saveManager.get()?.settings.vibration) });
const services = { saveManager, adManager, audio, haptics };

// Save right away when the app goes to the background (spec 10.6).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && saveManager.get()) saveManager.persist();
});

Promise.all([saveManager.load(), loadSprites()]).then(() => {
  document.body.classList.toggle('reduced-motion', saveManager.get().settings.reducedMotion);
  createRoot(document.getElementById('root')).render(<App services={services} />);
});
