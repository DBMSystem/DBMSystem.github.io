import { balance } from '../data/balance.js';
import { chapterScenes } from '../data/dialogues.js';
import { contentFor } from './unlocks.js';
import { treeComplete, utensilsOwned } from './utensils.js';
import { track } from '../analytics/analytics.js';

export const LAST_CHAPTER = 7;
const discoveredSecretCount = (save) => Object.values(save.recipes).filter((r) => r.discovered).length;

// Whether chapter n (2–7) opens, given the save after a loop or a purchase (spec 6.3).
// `loop` = the loop that just ended (Brûlée appears on the results screen, never mid-loop).
function chapterReady(save, n, loop) {
  const { player, stats } = save;
  const rule = balance.chapterTriggers[n];
  switch (n) {
    case 2:
      return contentFor(save).chapters.includes(2);
    case 3:
      return (
        Boolean(loop) &&
        (stats.loopsPlayed >= balance.bruleeGuaranteedLoop || (stats.loopsPlayed >= balance.bruleeFromLoop && loop.score >= balance.bruleeScoreThreshold))
      );
    case 4:
      return save.unlockedItems.includes('runic_counter');
    case 5:
      return player.level >= rule.level && utensilsOwned(save) >= rule.utensils;
    case 6:
      return player.level >= rule.level && discoveredSecretCount(save) >= rule.secrets;
    case 7:
      return treeComplete(save);
    default:
      return false;
  }
}

// Opens every chapter now due, in order (chapters never skip). Returns the chapters opened.
export function advanceStory(save, loop = null) {
  const opened = [];
  while (save.story.chapter < LAST_CHAPTER && chapterReady(save, save.story.chapter + 1, loop)) {
    save.story.chapter += 1;
    if (save.story.chapter === 3) save.story.bruleeMet = true;
    opened.push(save.story.chapter);
    track('chapter_unlocked', { chapter: save.story.chapter });
  }
  return opened;
}

// The finale plays once La Receta Perdida has been cooked in chapter 7.
const finaleDue = (save) => save.story.chapter === LAST_CHAPTER && save.recipes.lost_recipe?.discovered;

// Scenes waiting to be shown, in order.
export function pendingScenes(save) {
  const ids = [];
  for (let n = 2; n <= save.story.chapter; n++) if (!save.story.seenScenes.includes(`chapter${n}`)) ids.push(`chapter${n}`);
  if (finaleDue(save) && !save.story.seenScenes.includes('finale')) ids.push('finale');
  return ids.filter((id) => chapterScenes[id]);
}

export function markSceneSeen(save, id) {
  if (!save.story.seenScenes.includes(id)) save.story.seenScenes.push(id);
}
