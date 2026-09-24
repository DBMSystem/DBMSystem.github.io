import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { createSaveManager } from './save/saveManager.js';
import { localStorageAdapter, preferencesAdapter } from './save/storageAdapter.js';
import { createAdManager } from './monetization/adManager.js';
import { createAdMobProvider } from './monetization/admobProvider.js';
import { createShop } from './monetization/shop.js';
import { adUnitsReady } from './data/ads.js';
import { DEV_TOOLS, isNative } from './utils/platform.js';
import { loadSprites } from './assets/manifest.js';
import { createAudioManager } from './audio/audioManager.js';
import { createHaptics } from './utils/haptics.js';
import { onAppLifecycle } from './utils/lifecycle.js';
import { handleBack } from './utils/backButton.js';
import { App as NativeApp } from '@capacitor/app';
import './styles.css';

const saveManager = createSaveManager(isNative() ? preferencesAdapter : localStorageAdapter, { onEvent: (name) => console.info(`[analytics] ${name}`) });
const adManager = createAdManager({ saveManager });
// Android: AdMob with UMP consent (spec 7.7). Test ads in development/playtest builds and until the real ad
// units are filled in (src/data/ads.js).
if (isNative()) {
  createAdMobProvider({ testing: DEV_TOOLS || !adUnitsReady(), volume: () => saveManager.get()?.settings.sfx ?? 1, onChange: () => adManager.notify() })
    .then(adManager.setProvider)
    .catch(() => {}); // no plugin: ads stay unavailable
}
const audio = createAudioManager({
  getVolume: () => saveManager.get()?.settings.sfx ?? 0,
  getMusicVolume: () => saveManager.get()?.settings.music ?? 0,
});
// Every button clicks softly (spec 9.5).
document.addEventListener('click', (e) => e.target.closest?.('button') && audio.play('tap'), true);
const haptics = createHaptics({ isEnabled: () => Boolean(saveManager.get()?.settings.vibration) });
const shop = createShop({ saveManager });
const services = { saveManager, adManager, audio, haptics, shop };

// Save right away when the app goes to the background; purchases refresh on returning (spec 7.6, 10.6).
onAppLifecycle({
  hidden: () => saveManager.get() && saveManager.persist(),
  shown: () => saveManager.get() && shop.refreshEntitlements(),
});
// Android Back button (spec 8.9): the open overlay or the current screen answers; with nothing to answer, the app closes.
if (isNative()) NativeApp.addListener('backButton', () => handleBack() || NativeApp.exitApp());

Promise.all([saveManager.load(), loadSprites()]).then(() => {
  shop.refreshEntitlements(); // spec 7.6: the store confirms purchases on start; offline, the cache stays
  document.body.classList.toggle('reduced-motion', saveManager.get().settings.reducedMotion);
  createRoot(document.getElementById('root')).render(<App services={services} />);
});
