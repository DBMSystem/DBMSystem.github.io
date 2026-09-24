import { balance } from '../data/balance.js';
import { cardById } from '../data/cards.js';
import { addCoins, addFragments, addCard, ownsCard } from '../inventory/inventory.js';
import { addXp, unlocksBetween } from './progression.js';
import { rollLoopCard } from '../cards/drops.js';
import { discoveriesFor, masteryLevel, albumProgress } from '../cards/album.js';
import { track } from '../analytics/analytics.js';
import { applyChallenges } from '../systems/challenges.js';

export const TUTORIAL_CARD = 'dubious_toast';

// Coins and XP of a loop (spec 2.14).
export const loopCoins = (result) => result.orderCoins + Math.floor(result.score / balance.pointsPerCoin);
export const loopXp = (result) => Math.floor(result.score / balance.pointsPerXp) + result.ordersServed * balance.xpPerOrder;

function remember(save, rewardId) {
  save.grantedRewards.push(rewardId);
  if (save.grantedRewards.length > balance.grantedRewardsKept) save.grantedRewards.shift();
}

// Applies a finished loop to the save exactly once (spec 2.11: only after the loop really ends;
// spec 11.4: idempotent by `result.loopId`). Returns the summary shown on the results screen.
export function finalizeLoop(save, result, { rng, now, today }) {
  if (save.grantedRewards.includes(result.loopId)) return null;
  remember(save, result.loopId);

  const { stats } = save;
  const newRecord = result.score > stats.bestScore;
  stats.loopsPlayed += 1;
  stats.bestScore = Math.max(stats.bestScore, result.score);
  stats.bestCombo = Math.max(stats.bestCombo, result.bestCombo);
  stats.totalOrders += result.ordersServed;
  if (result.endReason === 'overflow') stats.overflows += 1;

  // Recipes: times cooked, secret discoveries and mastery rewards.
  const mastery = [];
  for (const [id, times] of Object.entries(result.cookedCounts)) {
    const entry = (save.recipes[id] ??= { discovered: false, timesCooked: 0 });
    const before = masteryLevel(entry.timesCooked);
    entry.timesCooked += times;
    const after = masteryLevel(entry.timesCooked);
    for (let level = before + 1; level <= after; level++) {
      const reward = balance.masteryRewards[level - 1];
      addCoins(save, reward.coins, 'mastery');
      addFragments(save, reward.fragments, 'mastery');
      mastery.push({ recipeId: id, level, ...reward });
    }
  }
  for (const id of result.discovered) {
    (save.recipes[id] ??= { discovered: false, timesCooked: 0 }).discovered = true;
    track('recipe_discovered', { recipeId: id });
  }

  const coins = addCoins(save, loopCoins(result), 'loop');
  const xp = loopXp(result);
  const levelBefore = save.player.level;
  const xpBefore = save.player.xp;
  const levels = addXp(save, xp);

  const challenges = result.tutorial || !today ? { completed: [], bonus: null } : applyChallenges(save, result, today);

  const cards = [];
  if (result.tutorial && !ownsCard(save, TUTORIAL_CARD)) cards.push(addCard(save, TUTORIAL_CARD, now, 'tutorial'));
  for (const cardId of discoveriesFor(result)) if (!ownsCard(save, cardId)) cards.push(addCard(save, cardId, now, 'discovery'));
  const dropped = result.tutorial ? null : rollLoopCard(save, rng, result);
  if (dropped) cards.push(addCard(save, dropped, now, 'loop'));

  track('game_complete', { score: result.score, orders: result.ordersServed, reason: result.endReason });
  return {
    ...result,
    newRecord,
    coins,
    xp,
    levelBefore,
    xpBefore,
    levelAfter: save.player.level,
    xpAfter: save.player.xp,
    levels,
    unlocks: unlocksBetween(levelBefore, save.player.level),
    mastery,
    challenges,
    cards: cards.map((c) => ({ ...c, rarity: cardById[c.cardId].rarity })),
    album: albumProgress(save),
  };
}

export const discoveredSecrets = (save) => Object.keys(save.recipes).filter((id) => save.recipes[id].discovered);
