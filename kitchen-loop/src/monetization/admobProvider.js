import { adPlacements, admobOptions, ADMOB_TEST_REWARDED } from '../data/ads.js';
import { balance } from '../data/balance.js';
import { track } from '../analytics/analytics.js';
import { createConsent } from './consent.js';

// Rewarded ads with AdMob on Android (@capacitor-community/admob). The reward counts only when AdMob reports
// it (spec 7.2) and is handed over when the ad closes. Ads are loaded ahead only for placements that can be
// offered (prepare), and a failed load is retried later with a growing wait.
export async function createAdMobProvider({ testing, volume = () => 1, onChange = () => {} }) {
  const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
  const consent = createConsent(AdMob, { testing });
  const unit = (type) => (testing || !adPlacements[type]?.adUnit ? ADMOB_TEST_REWARDED : adPlacements[type].adUnit);
  const ready = new Set();
  const loading = new Set();
  const retries = {};
  let started = false;

  async function start() {
    if (started) return consent.canRequestAds();
    started = true;
    if (!(await consent.gather())) return false;
    onChange(); // Settings may now offer the privacy options
    await AdMob.initialize({
      initializeForTesting: testing,
      maxAdContentRating: admobOptions.maxAdContentRating,
      tagForChildDirectedTreatment: admobOptions.tagForChildDirectedTreatment,
      tagForUnderAgeOfConsent: admobOptions.tagForUnderAgeOfConsent,
    });
    AdMob.addListener(RewardAdPluginEvents.AdImpression, (data) => track('ad_revenue', { micros: data?.valueMicros, currency: data?.currencyCode }));
    prepare('CARD_PACK');
    return true;
  }

  // Loads ahead only after start(): the consent form is shown from the menu, never over a service.
  async function prepare(type) {
    if (!started || !consent.canRequestAds() || !adPlacements[type] || ready.has(type) || loading.has(type)) return;
    loading.add(type);
    try {
      await AdMob.prepareRewardVideoAd({ adId: unit(type), isTesting: testing, immersiveMode: admobOptions.immersiveMode });
      ready.add(type);
      retries[type] = 0;
      onChange();
    } catch {
      const wait = Math.min(balance.adRetryMaxSeconds, balance.adRetrySeconds * 2 ** (retries[type] ?? 0));
      retries[type] = (retries[type] ?? 0) + 1;
      setTimeout(() => prepare(type), wait * 1000);
    } finally {
      loading.delete(type);
    }
  }

  function show(type) {
    if (!ready.has(type)) return Promise.resolve('unavailable');
    ready.delete(type);
    onChange();
    return new Promise((resolve) => {
      let earned = false;
      let done = false;
      const handles = [];
      const finish = (status) => {
        if (done) return;
        done = true;
        handles.forEach((h) => h.then((handle) => handle.remove()));
        prepare(type); // the next one, ready for the next offer
        resolve(status);
      };
      handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (earned = true)));
      handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(earned ? 'rewarded' : 'dismissed')));
      handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish('error')));
      AdMob.setApplicationVolume({ volume: volume() })
        .catch(() => {})
        .then(() => AdMob.showRewardVideoAd({ adId: unit(type) }))
        .catch(() => finish('error'));
    });
  }

  return {
    start,
    prepare,
    isAvailable: (type) => ready.has(type),
    show,
    privacyOptionsRequired: consent.privacyOptionsRequired,
    showPrivacyOptions: consent.showPrivacyOptions,
  };
}
