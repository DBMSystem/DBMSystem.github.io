import { balance } from '../data/balance.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { localDateString, effectiveNow } from '../utils/time.js';
import { createMockProvider } from './mocks/mockAds.js';

// Rewarded ads (spec 12.1). No real SDK yet: in production the provider is always "unavailable".
const unavailableProvider = { isAvailable: () => false, show: async () => 'unavailable' };

export function createAdManager({ saveManager, provider = DEV_TOOLS ? createMockProvider() : unavailableProvider, clock = Date.now }) {
  const now = () => effectiveNow(saveManager.get(), clock(), balance.clockRollbackTolerance);
  const today = () => localDateString(new Date(now()));
  function dailyCaps() {
    const caps = saveManager.get().dailyCaps;
    return caps.date === today() ? caps : { date: today(), secondChances: 0, trials: 0 };
  }

  function withinLimits(type) {
    const save = saveManager.get();
    if (save.stats.loopsPlayed < balance.adsMinLoops) return false;
    if (type === 'SECOND_CHANCE') return dailyCaps().secondChances < balance.secondChanceDailyCap;
    if (type === 'CARD_PACK') return freePackWait() === 0;
    return false; // TRIAL arrives in phase 5
  }

  // Seconds until the free pack is ready again (spec 7.2: cooldown freePackCooldown).
  function freePackWait() {
    const readyAt = saveManager.get().cooldowns.lastFreePackTime + balance.freePackCooldown * 1000;
    return Math.max(0, Math.ceil((readyAt - now()) / 1000));
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
    await saveManager.update((save) => {
      if (type === 'SECOND_CHANCE') save.dailyCaps = { ...dailyCaps(), secondChances: dailyCaps().secondChances + 1 };
      if (type === 'CARD_PACK') save.cooldowns.lastFreePackTime = now();
    });
    onReward();
    return { status };
  }

  return { canOffer, isRewardedAvailable, showRewarded, freePackWait };
}
