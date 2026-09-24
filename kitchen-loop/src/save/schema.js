import { recipeById } from '../data/recipes.js';
import { cardById } from '../data/cards.js';
import { calendarDays } from '../data/calendar.js';
import { balance } from '../data/balance.js';
import { xpToNext } from '../economy/progression.js';
import { challengeTemplates } from '../data/challenges.js';
import { utensilById } from '../data/utensils.js';
import { decorById } from '../data/decor.js';

export const SAVE_VERSION = 1;

// Save layout (spec 11.1). `packs` holds unopened packs (level-ups and calendar).
export function createDefaultSave(now = Date.now()) {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    lastSavedAt: now,
    lastSeenTimestamp: now,
    player: { name: 'Aprendiz', level: 1, xp: 0 },
    tutorialDone: false,
    stats: { loopsPlayed: 0, bestScore: 0, bestCombo: 0, totalOrders: 0, overflows: 0 },
    coins: 0,
    fragments: 0,
    cards: {},
    packs: { standard: 0, special: 0 },
    recipes: {},
    unlockedItems: [],
    decor: {},
    story: { chapter: 1, seenScenes: [], bruleeMet: false },
    pity: { packsOpened: 0, packsSinceEpic: 0, packsSinceLegendary: 0 },
    cooldowns: { lastFreePackTime: 0, lastPassPackDate: null },
    dailyCaps: { date: null, secondChances: 0, trials: 0 },
    calendar: { dayIndex: 0, lastClaimDate: null },
    challenges: { date: null, list: [], bonusClaimed: false },
    entitlements: { maestroPass: false, skins: [], starterPack: false, starterPackGranted: false, verifiedAt: 0 },
    equippedPan: 'default',
    grantedRewards: [],
    settings: { music: 0.7, sfx: 0.8, vibration: true, reducedMotion: false, tapToPlace: false, notifications: false, nightTheme: false },
  };
}

const isCount = (v) => Number.isFinite(v) && v >= 0;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const dateOrNull = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const volume = (v, fallback) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
export const PANS = ['default', 'rusty', 'pink', 'black', 'golden'];
export const NAME_MAX = 12;

// Returns a clean save, or null when the data is unusable. Wrong types, negatives, NaN, out-of-range
// values and unknown ids are corrected or dropped (spec 11.2, 11.4).
export function validateSave(raw) {
  if (!isPlainObject(raw) || !Number.isInteger(raw.saveVersion)) return null;
  const clean = createDefaultSave(Number.isFinite(raw.createdAt) ? raw.createdAt : undefined);
  for (const key of Object.keys(clean)) {
    if (!(key in raw)) continue;
    clean[key] = isPlainObject(clean[key]) && isPlainObject(raw[key]) ? { ...clean[key], ...raw[key] } : raw[key];
  }
  const defaults = createDefaultSave(clean.createdAt);
  for (const key of ['lastSavedAt', 'lastSeenTimestamp']) if (!isCount(clean[key])) clean[key] = defaults[key];
  clean.tutorialDone = Boolean(clean.tutorialDone);

  const { player } = clean;
  player.name = typeof player.name === 'string' && player.name.trim() ? player.name.trim().slice(0, NAME_MAX) : defaults.player.name;
  player.level = Number.isInteger(player.level) ? Math.min(balance.maxLevel, Math.max(1, player.level)) : 1;
  player.xp = Math.min(count(player.xp), player.level >= balance.maxLevel ? 0 : xpToNext(player.level) - 1);

  for (const key of Object.keys(defaults.stats)) clean.stats[key] = count(clean.stats[key]);
  clean.coins = count(clean.coins);
  clean.fragments = count(clean.fragments);
  clean.packs = { standard: count(clean.packs?.standard), special: count(clean.packs?.special) };
  for (const key of Object.keys(defaults.pity)) clean.pity[key] = count(clean.pity[key]);

  clean.cards = Object.fromEntries(
    Object.entries(isPlainObject(clean.cards) ? clean.cards : {})
      .filter(([id, entry]) => cardById[id] && isPlainObject(entry) && Number.isInteger(entry.count) && entry.count >= 1)
      .map(([id, entry]) => [
        id,
        { count: entry.count, firstObtainedAt: isCount(entry.firstObtainedAt) ? entry.firstObtainedAt : 0, shiny: Boolean(entry.shiny) },
      ]),
  );
  clean.recipes = Object.fromEntries(
    Object.entries(isPlainObject(clean.recipes) ? clean.recipes : {})
      .filter(([id, entry]) => recipeById[id] && isPlainObject(entry))
      .map(([id, entry]) => [id, { discovered: Boolean(entry.discovered), timesCooked: count(entry.timesCooked) }]),
  );

  clean.cooldowns = {
    lastFreePackTime: isCount(clean.cooldowns.lastFreePackTime) ? clean.cooldowns.lastFreePackTime : 0,
    lastPassPackDate: dateOrNull(clean.cooldowns.lastPassPackDate),
  };
  clean.dailyCaps = { date: dateOrNull(clean.dailyCaps.date), secondChances: count(clean.dailyCaps.secondChances), trials: count(clean.dailyCaps.trials) };
  const dayIndex = count(clean.calendar.dayIndex);
  clean.calendar = { dayIndex: dayIndex < calendarDays.length ? dayIndex : 0, lastClaimDate: dateOrNull(clean.calendar.lastClaimDate) };

  const challengeIds = new Set(challengeTemplates.map((c) => c.id));
  const list = Array.isArray(clean.challenges.list) ? clean.challenges.list : [];
  clean.challenges = {
    date: dateOrNull(clean.challenges.date),
    bonusClaimed: Boolean(clean.challenges.bonusClaimed),
    list: list
      .filter((c) => isPlainObject(c) && challengeIds.has(c.id) && Number.isInteger(c.target) && c.target > 0)
      .map((c) => ({
        id: c.id,
        target: c.target,
        recipeId: recipeById[c.recipeId] ? c.recipeId : null,
        progress: Math.min(count(c.progress), c.target),
        done: Boolean(c.done),
      })),
  };

  const { story } = clean;
  story.chapter = Number.isInteger(story.chapter) ? Math.min(7, Math.max(1, story.chapter)) : 1;
  story.seenScenes = Array.isArray(story.seenScenes) ? story.seenScenes.filter((id) => typeof id === 'string') : [];
  story.bruleeMet = Boolean(story.bruleeMet);

  const known = (id) => Boolean(utensilById[id] || decorById[id]);
  clean.unlockedItems = Array.isArray(clean.unlockedItems) ? [...new Set(clean.unlockedItems.filter(known))] : [];
  clean.decor = Object.fromEntries(
    Object.entries(isPlainObject(clean.decor) ? clean.decor : {}).filter(([slot, id]) => decorById[id]?.slot === slot && clean.unlockedItems.includes(id)),
  );
  clean.grantedRewards = Array.isArray(clean.grantedRewards)
    ? clean.grantedRewards.filter((id) => typeof id === 'string').slice(-balance.grantedRewardsKept)
    : [];
  const e = isPlainObject(clean.entitlements) ? clean.entitlements : {};
  clean.entitlements = {
    maestroPass: Boolean(e.maestroPass),
    skins: Array.isArray(e.skins) ? [...new Set(e.skins.filter((pan) => ['rusty', 'pink', 'black'].includes(pan)))] : [],
    starterPack: Boolean(e.starterPack),
    starterPackGranted: Boolean(e.starterPackGranted),
    verifiedAt: isCount(e.verifiedAt) ? e.verifiedAt : 0,
  };
  // The golden pan needs the Pass; the others, their skin (spec 7.5).
  const pan = PANS.includes(clean.equippedPan) ? clean.equippedPan : 'default';
  const owned = pan === 'default' || (pan === 'golden' ? clean.entitlements.maestroPass : clean.entitlements.skins.includes(pan));
  clean.equippedPan = owned ? pan : 'default';

  const { settings } = clean;
  settings.music = volume(settings.music, defaults.settings.music);
  settings.sfx = volume(settings.sfx, defaults.settings.sfx);
  for (const key of ['vibration', 'reducedMotion', 'tapToPlace', 'notifications', 'nightTheme']) settings[key] = Boolean(settings[key]);
  settings.nightTheme = settings.nightTheme && clean.entitlements.maestroPass;
  return clean;
}
