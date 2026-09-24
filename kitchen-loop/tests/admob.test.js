import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMOB_TEST_REWARDED } from '../src/data/ads.js';
import { balance } from '../src/data/balance.js';

// A fake AdMob plugin: records calls and lets each test decide what the SDK does.
const fake = vi.hoisted(() => ({ listeners: {}, calls: [], consent: null, failLoads: 0, onShow: null }));
vi.mock('@capacitor-community/admob', () => ({
  RewardAdPluginEvents: { Rewarded: 'reward', Dismissed: 'dismissed', FailedToShow: 'failedToShow', AdImpression: 'impression' },
  AdMob: {
    requestConsentInfo: async () => fake.consent,
    showConsentForm: async () => ({ ...fake.consent, status: 'OBTAINED', canRequestAds: true }),
    showPrivacyOptionsForm: async () => fake.calls.push('privacy'),
    initialize: async (options) => fake.calls.push(['initialize', options]),
    setApplicationVolume: async () => {},
    prepareRewardVideoAd: async (options) => {
      fake.calls.push(['prepare', options.adId]);
      if (fake.failLoads > 0) {
        fake.failLoads -= 1;
        throw new Error('no fill');
      }
    },
    showRewardVideoAd: async () => fake.onShow?.(),
    addListener: (event, fn) => {
      (fake.listeners[event] ??= new Set()).add(fn);
      return Promise.resolve({ remove: () => fake.listeners[event].delete(fn) });
    },
  },
}));

const { createAdMobProvider } = await import('../src/monetization/admobProvider.js');
const emit = (event) => [...(fake.listeners[event] ?? [])].forEach((fn) => fn());
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  Object.assign(fake, {
    listeners: {},
    calls: [],
    failLoads: 0,
    onShow: null,
    consent: { status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' },
  });
});

describe('AdMob provider', () => {
  it('asks for consent first and requests nothing without it', async () => {
    fake.consent = { status: 'REQUIRED', isConsentFormAvailable: false, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };
    const ads = await createAdMobProvider({ testing: true });
    expect(await ads.start()).toBe(false);
    await ads.prepare('CARD_PACK');
    expect(fake.calls).toEqual([]);
    expect(ads.privacyOptionsRequired()).toBe(true);
  });

  it('shows the consent form when required, then starts with the audience settings and test ads', async () => {
    fake.consent = { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };
    const ads = await createAdMobProvider({ testing: true });
    expect(await ads.start()).toBe(true);
    await flush();
    const [, options] = fake.calls.find((c) => c[0] === 'initialize');
    expect(options).toMatchObject({ initializeForTesting: true, maxAdContentRating: 'ParentalGuidance', tagForChildDirectedTreatment: false });
    expect(fake.calls).toContainEqual(['prepare', ADMOB_TEST_REWARDED]);
    expect(ads.isAvailable('CARD_PACK')).toBe(true);
  });

  it('rewards only when AdMob reports the reward, and loads the next ad', async () => {
    const ads = await createAdMobProvider({ testing: true });
    await ads.start();
    await flush();
    fake.onShow = () => {
      emit('reward');
      emit('dismissed');
    };
    expect(await ads.show('CARD_PACK')).toBe('rewarded');
    await flush();
    expect(ads.isAvailable('CARD_PACK')).toBe(true); // reloaded
    fake.onShow = () => emit('dismissed');
    expect(await ads.show('CARD_PACK')).toBe('dismissed');
    await flush();
    fake.onShow = () => emit('failedToShow');
    expect(await ads.show('CARD_PACK')).toBe('error');
    expect(await ads.show('SECOND_CHANCE')).toBe('unavailable'); // never loaded
  });

  it('retries a failed load later, waiting longer each time', async () => {
    vi.useFakeTimers();
    fake.failLoads = 2;
    const ads = await createAdMobProvider({ testing: true });
    await ads.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(ads.isAvailable('CARD_PACK')).toBe(false);
    await vi.advanceTimersByTimeAsync(balance.adRetrySeconds * 1000);
    expect(ads.isAvailable('CARD_PACK')).toBe(false);
    await vi.advanceTimersByTimeAsync(balance.adRetrySeconds * 2000);
    expect(ads.isAvailable('CARD_PACK')).toBe(true);
    vi.useRealTimers();
  });
});
