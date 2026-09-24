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
  let time = new Date(2099, 8, 24, 12).getTime(); // far ahead of the real clock, which the save also records
  saveManager.get().lastSeenTimestamp = time;
  const ads = createAdManager({ saveManager, provider, clock: () => time });
  return { ads, saveManager, setTime: (t) => (time = t), getTime: () => time };
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
    const { ads, setTime, getTime } = await setup('rewarded');
    for (let i = 0; i < balance.secondChanceDailyCap; i++) await ads.showRewarded('SECOND_CHANCE', () => {});
    expect(ads.canOffer('SECOND_CHANCE')).toBe(false);
    setTime(getTime() + 24 * 3600 * 1000);
    expect(ads.canOffer('SECOND_CHANCE')).toBe(true);
  });
});

describe('ad manager — free pack', () => {
  it('cooldown of freePackCooldown after a completed ad', async () => {
    const { ads, setTime, getTime } = await setup('rewarded');
    expect(ads.canOffer('CARD_PACK')).toBe(true);
    const start = getTime();
    await ads.showRewarded('CARD_PACK', () => {});
    expect(ads.canOffer('CARD_PACK')).toBe(false);
    expect(ads.freePackWait()).toBe(balance.freePackCooldown);
    setTime(start + balance.freePackCooldown * 1000);
    expect(ads.canOffer('CARD_PACK')).toBe(true);
  });

  it('turning the clock back does not skip the cooldown', async () => {
    const { ads, saveManager, setTime, getTime } = await setup('rewarded');
    const start = getTime();
    await ads.showRewarded('CARD_PACK', () => {});
    saveManager.get().lastSeenTimestamp = start + 3600 * 1000; // played an hour later
    setTime(start - 2 * 24 * 3600 * 1000); // then moved the clock two days back
    expect(ads.freePackWait()).toBe(balance.freePackCooldown - 3600);
  });
});
