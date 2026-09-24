// Applies a finished loop to the save. Phase 1: stats, record and recipes (coins/XP/cards in phase 2).
export function applyLoopResult(save, result) {
  const { stats } = save;
  const newRecord = result.score > stats.bestScore;
  stats.loopsPlayed += 1;
  stats.bestScore = Math.max(stats.bestScore, result.score);
  stats.bestCombo = Math.max(stats.bestCombo, result.bestCombo);
  stats.totalOrders += result.ordersServed;
  if (result.endReason === 'overflow') stats.overflows += 1;
  for (const [id, times] of Object.entries(result.cookedCounts)) {
    const entry = (save.recipes[id] ??= { discovered: false, timesCooked: 0 });
    entry.timesCooked += times;
  }
  for (const id of result.discovered) {
    (save.recipes[id] ??= { discovered: false, timesCooked: 0 }).discovered = true;
  }
  return { newRecord };
}

export const discoveredSecrets = (save) => Object.keys(save.recipes).filter((id) => save.recipes[id].discovered);
