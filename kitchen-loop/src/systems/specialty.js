import { specialties } from '../data/specialties.js';
import { balance } from '../data/balance.js';
import { contentFor } from './unlocks.js';

// Specialties the player can be offered (spec 2.12): from level 4, if enabled in balance.
export function availableSpecialties(save) {
  const content = contentFor(save);
  if (!balance.loopModifiersEnabled || !content.features.includes('loopModifiers')) return [];
  return specialties.filter(({ requires }) => !requires || content.customers.includes(requires.customer) || content.features.includes(requires.feature));
}

// 3 different specialties at random among the available ones.
export function rollSpecialties(rng, save) {
  const pool = [...availableSpecialties(save)];
  const picked = [];
  while (picked.length < balance.specialtyChoices && pool.length > 0) picked.push(pool.splice(rng.int(pool.length), 1)[0]);
  return picked;
}
