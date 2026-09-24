import { describe, it, expect } from 'vitest';
import { createAdManager } from '../src/monetization/adManager.js';
import { createSaveManager } from '../src/save/saveManager.js';
import { createMemoryAdapter } from '../src/save/storageAdapter.js';
import { balance } from '../src/data/balance.js';

async function setup(outcome, loopsPlayed = balance.adsMinLoops) {
  const saveManager = createSaveManager(createMemoryAdapter());
  await saveManager.load();
  saveManager.get().stats.loopsPlayed = loopsPlayed;
  const provider = {
    isAvailable: () => outcome !== 'unavailable',
    show: async () => {
      if (outcome === 'throw') throw new Error('sdk');
      return outcome;
    },
  };
  let day = '2026-09-24';
  const ads = createAdManager({ saveManager, provider, today: () => day });
  return { ads, saveManager, setDay: (d) => (day = d) };
}

describe('ad manager — second chance', () => {
  it('reward only when the provider confirms completion', async () => {
    for (const outcome of ['dismissed', 'error']) {
      const { ads } = await setup(outcome);
      let rewarded = false;
      expect((await ads.showRewarded('SECOND_CHANCE', () => (rewarded = true))).status).toBe(outcome);
      expect(rewarded).toBe(false);
    }
    const { ads } = await setup('rewarded');
    let rewarded = false;
    expect((await ads.showRewarded('SECOND_CHANCE', () => (rewarded = true))).status).toBe('rewarded');
    expect(rewarded).toBe(true);
  });

  it('never throws', async () => {
    const { ads } = await setup('throw');
    expect((await ads.showRewarded('SECOND_CHANCE', () => {})).status).toBe('error');
  });

  it('unavailable ad: offer shown but disabled', async () => {
    const { ads } = await setup('unavailable');
    expect(ads.canOffer('SECOND_CHANCE')).toBe(true);
    expect(ads.isRewardedAvailable('SECOND_CHANCE')).toBe(false);
    expect((await ads.showRewarded('SECOND_CHANCE', () => {})).status).toBe('unavailable');
  });

  it('no ads before adsMinLoops completed loops', async () => {
    const { ads } = await setup('rewarded', balance.adsMinLoops - 1);
    expect(ads.canOffer('SECOND_CHANCE')).toBe(false);
  });

  it('daily cap, reset on a new local day', async () => {
    const { ads, setDay } = await setup('rewarded');
    for (let i = 0; i < balance.secondChanceDailyCap; i++) await ads.showRewarded('SECOND_CHANCE', () => {});
    expect(ads.canOffer('SECOND_CHANCE')).toBe(false);
    setDay('2026-09-25');
    expect(ads.canOffer('SECOND_CHANCE')).toBe(true);
  });
});
