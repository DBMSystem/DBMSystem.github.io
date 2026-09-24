import { utensils, utensilById } from '../data/utensils.js';
import { balance } from '../data/balance.js';

// Brûlée's tree rules (spec 5.4).
export const utensilCost = (id) => balance.utensilCosts[`t${utensilById[id].tier}`];
export const treeTotalCost = () => utensils.reduce((sum, u) => sum + utensilCost(u.id), 0);

const owns = (save, id) => save.unlockedItems.includes(id);

export function requirementMet(save, id) {
  const { requires } = utensilById[id];
  if (requires.chapter) return save.story.chapter >= requires.chapter;
  if (requires.utensil) return owns(save, requires.utensil);
  return utensils.filter((u) => u.tier === requires.tier && owns(save, u.id)).length >= requires.count;
}

// 'owned' | 'available' (requirement met, may still lack coins) | 'locked'
export function utensilState(save, id) {
  if (owns(save, id)) return 'owned';
  return requirementMet(save, id) ? 'available' : 'locked';
}

export const treeComplete = (save) => utensils.every((u) => owns(save, u.id));
export const utensilsOwned = (save) => utensils.filter((u) => owns(save, u.id)).length;
