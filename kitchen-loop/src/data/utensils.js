// Brûlée's tree (spec 5.4): 9 utensils in 4 tiers, paid with coins (costs in balance.utensilCosts).
// requires: { chapter } | { utensil } | { tier, count } = at least `count` utensils of that tier.
// What each one unlocks lives in unlocks.js. Names and descriptions in i18n (`utensil.<id>.*`).
export const utensils = [
  { id: 'runic_counter', tier: 1, requires: { chapter: 3 } },
  { id: 'crystal_spatula', tier: 2, requires: { utensil: 'runic_counter' } },
  { id: 'time_ladle', tier: 2, requires: { utensil: 'runic_counter' } },
  { id: 'ancient_spice', tier: 3, requires: { tier: 2, count: 1 } },
  { id: 'mystic_knife', tier: 3, requires: { tier: 2, count: 1 } },
  { id: 'golden_whisk', tier: 3, requires: { tier: 2, count: 1 } },
  { id: 'enchanted_pot', tier: 4, requires: { tier: 3, count: 2 } },
  { id: 'frost_tongs', tier: 4, requires: { tier: 3, count: 2 } },
  { id: 'ember_skewers', tier: 4, requires: { tier: 3, count: 2 } },
];

export const utensilById = Object.fromEntries(utensils.map((u) => [u.id, u]));
