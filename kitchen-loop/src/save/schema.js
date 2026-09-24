import { recipeById } from '../data/recipes.js';

export const SAVE_VERSION = 1;

// Save layout (spec 11.1). Phase 1 uses player, stats, recipes, dailyCaps and settings.
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
    recipes: {},
    unlockedItems: [],
    decor: {},
    story: { chapter: 1, seenScenes: [], bruleeMet: false },
    pity: { packsOpened: 0, packsSinceEpic: 0, packsSinceLegendary: 0 },
    cooldowns: { lastFreePackTime: 0, lastPassPackDate: null },
    dailyCaps: { date: null, secondChances: 0, trials: 0 },
    calendar: { dayIndex: 0, lastClaimDate: null },
    entitlements: { maestroPass: false, skins: [], starterPack: false, starterPackGranted: false, verifiedAt: 0 },
    equippedPan: 'default',
    grantedRewards: [],
    settings: { music: 0.7, sfx: 0.8, vibration: true, reducedMotion: false, tapToPlace: false, notifications: false },
  };
}

const isCount = (v) => Number.isFinite(v) && v >= 0;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Returns a clean save, or null when the data is unusable. Absurd values are corrected (spec 11.4).
// Full validation of cards, entitlements, etc. arrives in phase 2.
export function validateSave(raw) {
  if (!isPlainObject(raw) || !Number.isInteger(raw.saveVersion)) return null;
  const clean = createDefaultSave(raw.createdAt);
  for (const key of Object.keys(clean)) {
    if (!(key in raw)) continue;
    clean[key] = isPlainObject(clean[key]) && isPlainObject(raw[key]) ? { ...clean[key], ...raw[key] } : raw[key];
  }
  for (const key of Object.keys(clean.stats)) if (!isCount(clean.stats[key])) clean.stats[key] = 0;
  if (!isCount(clean.dailyCaps.secondChances)) clean.dailyCaps.secondChances = 0;
  if (!Number.isInteger(clean.player.level) || clean.player.level < 1) clean.player.level = 1;
  for (const key of ['vibration', 'reducedMotion', 'tapToPlace', 'notifications']) {
    clean.settings[key] = Boolean(clean.settings[key]);
  }
  clean.recipes = Object.fromEntries(
    Object.entries(isPlainObject(clean.recipes) ? clean.recipes : {})
      .filter(([id, entry]) => recipeById[id] && isPlainObject(entry))
      .map(([id, entry]) => [id, { discovered: Boolean(entry.discovered), timesCooked: isCount(entry.timesCooked) ? entry.timesCooked : 0 }]),
  );
  return clean;
}
