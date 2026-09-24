import { challengeTemplates } from '../data/challenges.js';
import { balance } from '../data/balance.js';
import { recipes } from '../data/recipes.js';
import { getUnlockedContent } from './unlocks.js';
import { createRng } from '../utils/rng.js';
import { addCoins, addFragments, addPack } from '../inventory/inventory.js';
import { track } from '../analytics/analytics.js';
import { t, formatNumber } from '../utils/i18n.js';

// Difficulty tier from the player's level: 0 (levels 1–2) … 3 (level 10+).
export const challengeTier = (level) => (level >= 10 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0);

const templateOf = (challenge) => challengeTemplates.find((c) => c.id === challenge.id);
const numbersOf = (challenge) => balance.challenges.templates[challenge.id];

const hash = (text) => [...text].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

// The same 3 orders for everyone on a given day and level tier (seeded by the date).
export function generateChallenges(date, level) {
  const rng = createRng(hash(`${date}:${challengeTier(level)}`));
  const available = challengeTemplates.filter((c) => level >= (c.fromLevel ?? 1));
  const picked = [];
  while (picked.length < balance.challenges.perDay && available.length > 0) picked.push(available.splice(rng.int(available.length), 1)[0]);
  const orderable = getUnlockedContent(level).recipes.filter((id) => recipes.find((r) => r.id === id).kind !== 'secret');
  return picked.map((template) => ({
    id: template.id,
    target: numbersOf(template).targets[challengeTier(level)],
    recipeId: template.stat === 'cookRecipe' ? rng.pick(orderable) : null,
    progress: 0,
    done: false,
  }));
}

// Today's orders as saved, or freshly generated (without saving) if today has not been played yet.
export const todayChallenges = (save, date) =>
  save.challenges.date === date ? save.challenges.list : generateChallenges(date, save.player.level);

// Makes sure the save holds today's orders.
export function ensureChallenges(save, date) {
  if (save.challenges.date !== date) save.challenges = { date, list: generateChallenges(date, save.player.level), bonusClaimed: false };
  return save.challenges;
}


// Value of a loop (finished or live) for a challenge. `loop` has the fields of engine.getResult().
export function loopValue(challenge, loop) {
  const { stat } = templateOf(challenge);
  if (stat === 'cookRecipe') return loop.cookedCounts[challenge.recipeId] ?? 0;
  if (stat === 'noCustomerLost') return loop.endReason === 'time' && loop.customersLost === 0 ? 1 : 0;
  return loop[stat] ?? 0;
}

// Progress including a loop in progress (for the in-game panel and the "done!" toast).
export function progressWith(challenge, loop) {
  const value = loopValue(challenge, loop);
  return templateOf(challenge).scope === 'loop' ? Math.max(challenge.progress, value) : challenge.progress + value;
}

// Applies a finished loop: updates progress and grants rewards (through the inventory) once.
export function applyChallenges(save, loop, date) {
  const state = ensureChallenges(save, date);
  const completed = [];
  for (const challenge of state.list) {
    if (challenge.done) continue;
    challenge.progress = Math.min(challenge.target, progressWith(challenge, loop));
    if (challenge.progress >= challenge.target) {
      challenge.done = true;
      const { reward } = numbersOf(challenge);
      addCoins(save, reward.coins, 'challenge');
      addFragments(save, reward.fragments, 'challenge');
      completed.push({ ...challenge, reward });
      track('challenge_completed', { id: challenge.id });
    }
  }
  let bonus = null;
  if (!state.bonusClaimed && state.list.every((c) => c.done)) {
    state.bonusClaimed = true;
    for (let i = 0; i < balance.challenges.bonusPacks; i++) addPack(save, 'standard');
    bonus = { packs: balance.challenges.bonusPacks };
  }
  return { completed, bonus };
}

export const challengeReward = (challenge) => numbersOf(challenge).reward;

export function challengeText(challenge) {
  const one = challenge.target === 1 && ['perfect', 'fever'].includes(challenge.id);
  return t(one ? `challenge.${challenge.id}.one` : `challenge.${challenge.id}`, {
    n: formatNumber(challenge.target),
    recipe: challenge.recipeId ? t(`recipe.${challenge.recipeId}`) : '',
  });
}
