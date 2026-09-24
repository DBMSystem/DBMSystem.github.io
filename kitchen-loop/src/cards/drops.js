import { balance } from '../data/balance.js';
import { rollRarity, pickCard } from './packs.js';

// Combo steps reached in a loop: each multiplier step above x1 counts (spec 4.6).
export const comboStepsReached = (bestCombo) => balance.comboMultipliers.filter((step) => step.chain > 1 && bestCombo >= step.chain).length;

// Chance of a card at the end of a loop (spec 4.6).
export function loopCardChance(result) {
  const chance = balance.loopCardBase + balance.loopCardPerOrder * result.ordersServed + balance.loopCardPerComboStep * comboStepsReached(result.bestCombo);
  return Math.min(balance.loopCardMax, chance);
}

// Card id dropped at the end of a loop, or null. Uses the rates of pack slots 1–2.
export function rollLoopCard(save, rng, result) {
  if (rng.next() >= loopCardChance(result)) return null;
  return pickCard(save, rng, rollRarity(rng, balance.packRates.standard));
}
