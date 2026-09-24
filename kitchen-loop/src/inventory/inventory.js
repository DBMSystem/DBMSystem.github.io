import { cardById } from '../data/cards.js';
import { balance } from '../data/balance.js';
import { track } from '../analytics/analytics.js';
import { utensilById } from '../data/utensils.js';
import { decorById } from '../data/decor.js';
import { utensilState, utensilCost } from '../systems/utensils.js';
import { PASS, STARTER_PACK, starterPack, productById, panById } from '../data/products.js';

// The only place that changes coins, fragments, cards, unopened packs and bought items (spec 11.3).
// Every function validates, changes `save` in place and reports what happened.
const isAmount = (n) => Number.isInteger(n) && n > 0;

export function addCoins(save, amount, reason) {
  if (!isAmount(amount)) return 0;
  save.coins += amount;
  track('coins_added', { amount, reason });
  return amount;
}

export function spendCoins(save, amount, reason) {
  if (!isAmount(amount) || save.coins < amount) return false;
  save.coins -= amount;
  track('coins_spent', { amount, reason });
  return true;
}

export function addFragments(save, amount, reason) {
  if (!isAmount(amount)) return 0;
  save.fragments += amount;
  track('fragments_added', { amount, reason });
  return amount;
}

export function spendFragments(save, amount, reason) {
  if (!isAmount(amount) || save.fragments < amount) return false;
  save.fragments -= amount;
  track('fragments_spent', { amount, reason });
  return true;
}

export const ownsCard = (save, cardId) => Boolean(save.cards[cardId]);

// A new card joins the album; a repeated one becomes fragments (spec 4.8).
export function addCard(save, cardId, now, source) {
  const card = cardById[cardId];
  if (!card) return null;
  const entry = save.cards[cardId];
  if (entry) {
    entry.count += 1;
    const fragments = addFragments(save, balance.duplicateFragments[card.rarity], 'duplicate');
    return { cardId, rarity: card.rarity, isNew: false, fragments };
  }
  save.cards[cardId] = { count: 1, firstObtainedAt: now, shiny: false };
  track('card_unlocked', { cardId, source });
  if (card.rarity !== 'common') track(`${card.rarity}_card_unlocked`, { cardId });
  return { cardId, rarity: card.rarity, isNew: true, fragments: 0 };
}

// Pack cards the player does not own can be crafted; discovery cards never (spec 4.8).
export function craftCard(save, cardId, now) {
  const card = cardById[cardId];
  if (!card || card.source !== 'pack' || ownsCard(save, cardId)) return null;
  if (!spendFragments(save, balance.craftCost[card.rarity], 'craft')) return null;
  track('card_crafted', { cardId });
  return addCard(save, cardId, now, 'craft');
}

export function makeShiny(save, cardId) {
  const card = cardById[cardId];
  if (!card || !ownsCard(save, cardId) || save.cards[cardId].shiny) return false;
  if (!spendFragments(save, balance.shinyCost[card.rarity], 'shiny')) return false;
  save.cards[cardId].shiny = true;
  return true;
}

export function addPack(save, kind = 'standard') {
  save.packs[kind] = (save.packs[kind] ?? 0) + 1;
}

export function takePack(save, kind = 'standard') {
  if (!(save.packs[kind] > 0)) return false;
  save.packs[kind] -= 1;
  return true;
}

// Brûlée's warehouse (spec 5.4, 5.6, 8.7): utensils and decoration bought with coins.
export function buyUtensil(save, id) {
  if (!utensilById[id] || utensilState(save, id) !== 'available') return false;
  if (!spendCoins(save, utensilCost(id), 'utensil')) return false;
  save.unlockedItems.push(id);
  track('utensil_bought', { id });
  return true;
}

export function buyDecor(save, id) {
  const item = decorById[id];
  if (!item || save.unlockedItems.includes(id)) return false;
  if (!spendCoins(save, item.cost, 'decor')) return false;
  save.unlockedItems.push(id);
  save.decor[item.slot] = id;
  track('decor_bought', { id });
  return true;
}

// ---------- Purchases (spec 7.4–7.6, 11.3) ----------
// The store confirms ownership; these functions only mirror it in the save (the entitlements cache).

export const hasMaestroPass = (save) => save.entitlements.maestroPass;
export const ownsPan = (save, panId) => {
  const pan = panById[panId];
  if (!pan) return false;
  if (!pan.product) return true;
  return pan.product === PASS ? hasMaestroPass(save) : save.entitlements.skins.includes(panId);
};

// Grants a confirmed purchase. The Pack de Inicio delivers its fixed cards only once (repeated ones → fragments).
export function grantProduct(save, productId, now) {
  const delivered = [];
  if (productId === PASS) save.entitlements.maestroPass = true;
  else if (productId === STARTER_PACK) {
    save.entitlements.starterPack = true;
    if (!save.entitlements.starterPackGranted) {
      save.entitlements.starterPackGranted = true;
      for (const cardId of starterPack.cards) delivered.push(addCard(save, cardId, now, 'starter_pack'));
    }
  } else {
    const pan = productById[productId]?.pan;
    if (!pan) return null;
    if (!save.entitlements.skins.includes(pan)) save.entitlements.skins.push(pan);
  }
  track('purchase_granted', { productId });
  return delivered;
}

// A refund or revocation (spec 7.6): the right goes and whatever depended on it is unequipped.
export function revokeProduct(save, productId) {
  if (productId === PASS) save.entitlements.maestroPass = false;
  else if (productId === STARTER_PACK) save.entitlements.starterPack = false;
  else save.entitlements.skins = save.entitlements.skins.filter((pan) => pan !== productById[productId]?.pan);
  if (!ownsPan(save, save.equippedPan)) save.equippedPan = 'default';
  if (!hasMaestroPass(save)) save.settings.nightTheme = false;
  track('purchase_revoked', { productId });
}

export function equipPan(save, panId) {
  if (!ownsPan(save, panId)) return false;
  save.equippedPan = panId;
  track('pan_equipped', { panId });
  return true;
}

// The Pass's daily pack without an ad (spec 7.4, D-5): once per calendar day.
export function claimPassPack(save, today) {
  if (!hasMaestroPass(save) || save.cooldowns.lastPassPackDate === today) return false;
  save.cooldowns.lastPassPackDate = today;
  addPack(save, 'standard');
  return true;
}
