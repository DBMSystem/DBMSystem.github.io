import { cards, RARITIES } from '../data/cards.js';
import { balance } from '../data/balance.js';
import { addCard, ownsCard } from '../inventory/inventory.js';
import { track } from '../analytics/analytics.js';

const packPool = (rarity) => cards.filter((c) => c.source === 'pack' && c.rarity === rarity);
const rank = (rarity) => RARITIES.indexOf(rarity);

export function rollRarity(rng, rates) {
  const roll = rng.next();
  let sum = 0;
  for (const rarity of RARITIES) {
    sum += rates[rarity] ?? 0;
    if (roll < sum) return rarity;
  }
  return RARITIES.find((r) => rates[r] > 0);
}

// A card of `rarity`, preferring ones the player does not own (newCardBias, spec 4.7).
export function pickCard(save, rng, rarity) {
  const pool = packPool(rarity);
  const missing = pool.filter((c) => !ownsCard(save, c.id));
  const list = missing.length > 0 && rng.next() < balance.newCardBias ? missing : pool;
  return rng.pick(list).id;
}

// Rarities of a pack with the guarantees of spec 4.7 (pity counters live in the save).
export function packRarities(save, rng, special = false) {
  const { pity } = save;
  const rarities = [];
  for (let slot = 0; slot < balance.packSize; slot++) {
    const last = slot === balance.packSize - 1;
    const rates = last ? balance.packRates[special ? 'special' : 'last'] : balance.packRates.standard;
    rarities.push(rollRarity(rng, rates));
  }
  const allowLegendary = pity.packsOpened >= balance.legendaryMinPacks;
  for (let i = 0; i < rarities.length; i++) if (!allowLegendary && rarities[i] === 'legendary') rarities[i] = 'epic';
  const lastSlot = rarities.length - 1;
  if (allowLegendary && pity.packsSinceLegendary >= balance.legendaryPity - 1 && !rarities.includes('legendary')) {
    rarities[lastSlot] = 'legendary';
  } else if (pity.packsSinceEpic >= balance.epicPity - 1 && !rarities.some((r) => rank(r) >= rank('epic'))) {
    rarities[lastSlot] = 'epic';
  }
  return rarities;
}

// Opens a pack: rolls, updates pity, adds the cards through the inventory.
export function openPack(save, rng, now, { special = false } = {}) {
  const rarities = packRarities(save, rng, special);
  const { pity } = save;
  pity.packsOpened += 1;
  pity.packsSinceEpic = rarities.some((r) => rank(r) >= rank('epic')) ? 0 : pity.packsSinceEpic + 1;
  pity.packsSinceLegendary = rarities.includes('legendary') ? 0 : pity.packsSinceLegendary + 1;
  const results = rarities.map((rarity) => addCard(save, pickCard(save, rng, rarity), now, 'pack'));
  track('pack_opened', { special });
  return results;
}
