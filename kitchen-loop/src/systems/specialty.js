import { specialties } from '../data/specialties.js';
import { balance } from '../data/balance.js';
import { contentFor } from './unlocks.js';
import { createRng } from '../utils/rng.js';

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

// The offer before the next service: fixed until that service is played (Daniel: leaving and coming back must not
// deal new ones), so it is seeded by the save itself and the number of services played.
export function nextSpecialties(save) {
  return rollSpecialties(createRng(save.createdAt + save.stats.loopsPlayed * 7919), save);
}
