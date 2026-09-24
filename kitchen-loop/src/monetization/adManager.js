import { balance } from '../data/balance.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { localDateString } from '../utils/time.js';
import { createMockProvider } from './mocks/mockAds.js';

// Rewarded ads (spec 12.1). No real SDK yet: in production the provider is always "unavailable".
const unavailableProvider = { isAvailable: () => false, show: async () => 'unavailable' };

export function createAdManager({ saveManager, provider = DEV_TOOLS ? createMockProvider() : unavailableProvider, today = localDateString }) {
  function dailyCaps() {
    const caps = saveManager.get().dailyCaps;
    return caps.date === today() ? caps : { date: today(), secondChances: 0, trials: 0 };
  }

  function withinLimits(type) {
    const save = saveManager.get();
    if (save.stats.loopsPlayed < balance.adsMinLoops) return false;
    if (type === 'SECOND_CHANCE') return dailyCaps().secondChances < balance.secondChanceDailyCap;
    return false; // CARD_PACK and TRIAL arrive in later phases
  }

  // Whether the offer may be shown at all (limits). The button is disabled when the ad is not ready.
  const canOffer = (type) => withinLimits(type);
  const isRewardedAvailable = (type) => withinLimits(type) && provider.isAvailable(type);

  // Never throws. onReward runs only when the provider confirms completion.
  async function showRewarded(type, onReward) {
    if (!isRewardedAvailable(type)) return { status: 'unavailable' };
    let status;
    try {
      status = await provider.show(type);
    } catch {
      status = 'error';
    }
    if (status !== 'rewarded') return { status };
    if (type === 'SECOND_CHANCE') {
      await saveManager.update((save) => {
        save.dailyCaps = { ...dailyCaps(), secondChances: dailyCaps().secondChances + 1 };
      });
    }
    onReward();
    return { status };
  }

  return { canOffer, isRewardedAvailable, showRewarded };
}
