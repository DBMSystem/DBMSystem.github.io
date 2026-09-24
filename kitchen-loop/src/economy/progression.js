import { balance } from '../data/balance.js';
import { getUnlockedContent } from '../systems/unlocks.js';
import { addCoins, addPack } from '../inventory/inventory.js';

// XP needed to go from level n to n + 1 (spec 5.1).
export const xpToNext = (level) => balance.xpCurve.base + balance.xpCurve.perLevel * (level - 1);

// Adds XP, levelling up as many times as it reaches. Each level gives coins; every few levels, a pack.
export function addXp(save, xp) {
  const { player } = save;
  const levelsGained = [];
  player.xp += Math.max(0, Math.floor(xp));
  while (player.level < balance.maxLevel && player.xp >= xpToNext(player.level)) {
    player.xp -= xpToNext(player.level);
    player.level += 1;
    const coins = addCoins(save, balance.levelCoinReward * player.level, 'level');
    const pack = player.level % balance.packEveryNLevels === 0;
    if (pack) addPack(save, 'standard');
    levelsGained.push({ level: player.level, coins, pack });
  }
  if (player.level >= balance.maxLevel) player.xp = 0;
  return levelsGained;
}

// What a level-up unlocks, from the single unlock table (spec 5.2).
export function unlocksBetween(fromLevel, toLevel) {
  const before = getUnlockedContent(fromLevel);
  const after = getUnlockedContent(toLevel);
  const news = [];
  for (const kind of ['ingredients', 'recipes', 'customers', 'features']) {
    for (const id of after[kind]) if (!before[kind].includes(id)) news.push({ kind, id });
  }
  return news;
}
