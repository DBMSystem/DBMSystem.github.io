import { cards } from '../data/cards.js';
import { recipeById } from '../data/recipes.js';
import { balance } from '../data/balance.js';

export function albumProgress(save) {
  const owned = cards.filter((c) => save.cards[c.id]).length;
  return { owned, total: cards.length, percent: Math.floor((owned / cards.length) * 100) };
}

// Discovery cards earned by what happened in a loop (spec 4.4).
export function discoveriesFor(result) {
  const earned = [];
  for (const card of cards) {
    const u = card.unlock;
    if (!u) continue;
    const ok =
      (u.type === 'secret' && result.discovered.includes(u.recipe)) ||
      (u.type === 'serve' && result.servedTypes.includes(u.customer)) ||
      (u.type === 'cookInLoop' && (result.cookedCounts[u.recipe] ?? 0) >= u.times) ||
      (u.type === 'emptyGridAtEnd' && (result.leftoverAtEnd ?? (result.emptyGridAtEnd ? 0 : Infinity)) <= (u.max ?? 0)) ||
      (u.type === 'feverInLoop' && result.feverCount >= u.times) ||
      (u.type === 'comboInLoop' && result.bestCombo >= u.times) ||
      (u.type === 'perfectInLoop' && (result.perfectCount ?? 0) >= u.times) ||
      (u.type === 'scoreInLoop' && result.score >= u.points) ||
      (u.type === 'noLossLoop' && result.endReason === 'time' && result.customersLost === 0 && result.ordersServed >= u.orders);
    if (ok) earned.push(card.id);
  }
  return earned;
}

// Recipe mastery 1–3, derived from timesCooked (spec 5.3).
export function masteryLevel(timesCooked) {
  let level = 1;
  balance.masteryThresholds.forEach((threshold, i) => {
    if (i > 0 && timesCooked >= threshold) level = i + 1;
  });
  return level;
}

export const isRecipe = (id) => Boolean(recipeById[id]);
