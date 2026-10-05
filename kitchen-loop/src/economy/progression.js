import { recipeById } from '../data/recipes.js';
import { balance } from '../data/balance.js';
import { getUnlockedContent } from '../systems/unlocks.js';
import { addCoins, addPack } from '../inventory/inventory.js';

// XP needed to go from level n to n + 1 (spec 5.1).
export const xpToNext = (level) => balance.xpCurve.base + balance.xpCurve.perLevel * (level - 1);

// How far the player is into the current level (0–1) and the XP still missing for the next one (spec 5.1).
export function levelProgress({ level, xp }) {
  if (level >= balance.maxLevel) return { share: 1, left: 0, next: null };
  const need = xpToNext(level);
  return { share: Math.min(1, xp / need), left: Math.max(0, need - xp), next: level + 1 };
}

// XP from the start of the game to the beginning of `level`.
export const xpToReach = (level) => Array.from({ length: Math.max(0, level - 1) }, (_, i) => xpToNext(i + 1)).reduce((a, b) => a + b, 0);

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

// What a level-up unlocks, from the single unlock table (spec 5.2). Secret recipes stay hidden until discovered.
export function unlocksBetween(fromLevel, toLevel, context = {}) {
  const before = getUnlockedContent(fromLevel, context);
  const after = getUnlockedContent(toLevel, context);
  const news = [];
  for (const kind of ['ingredients', 'recipes', 'customers', 'features']) {
    for (const id of after[kind]) if (!before[kind].includes(id) && !(kind === 'recipes' && recipeById[id].kind === 'secret')) news.push({ kind, id });
  }
  return news;
}
