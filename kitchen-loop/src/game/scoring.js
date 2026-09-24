import { comboMultiplier } from './combo.js';

// Recipe points (spec 2.14 + 2.6): base × combo × fever × (order bonus | counter sale).
export function recipePoints({ base, chain, feverActive, served }, balance) {
  const multiplier = comboMultiplier(chain, balance.comboMultipliers) * (feverActive ? balance.feverMultiplier : 1);
  const destination = served ? 1 + balance.orderBonus : balance.counterSaleMultiplier;
  return { points: Math.round(base * multiplier * destination), multiplier };
}
