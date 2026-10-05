import { balance } from '../data/balance.js';
import { chapterScenes, AFTER_FINALE } from '../data/dialogues.js';
import { contentFor } from './unlocks.js';
import { treeComplete, utensilsOwned } from './utensils.js';
import { utensils } from '../data/utensils.js';
import { xpToReach } from '../economy/progression.js';
import { track } from '../analytics/analytics.js';

export const LAST_CHAPTER = 7;
// The stage the dialogue is at: the chapter reached, or AFTER_FINALE once the epilogue has been seen.
export const storyStage = (save) => (save.story.seenScenes.includes('finale') ? AFTER_FINALE : save.story.chapter);
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

// What the next chapter needs (spec 6.3), for the menu and the results (Daniel: "falta contexto de que hay una
// historia que seguir"). Returns null once the epilogue has been seen. `share` 0–1 is the way there; `parts` are the
// requirements still shown to the player as { key, have, need } (texts: story.goal.<key>).
export function nextChapterGoal(save) {
  const { player, stats, story } = save;
  const levelPart = (need) => ({ key: 'level', have: player.level, need, share: Math.min(1, (xpToReach(player.level) + player.xp) / xpToReach(need)) });
  const part = (key, have, need) => ({ key, have: Math.min(have, need), need, share: Math.min(1, have / need) });
  const goal = (next, parts) => ({ next, parts, share: parts.reduce((sum, p) => sum + p.share, 0) / parts.length });
  if (story.seenScenes.includes('finale')) return null;
  switch (story.chapter) {
    case 1:
      return goal(2, [levelPart(3)]);
    case 2:
      return goal(3, [part('services', stats.loopsPlayed, balance.bruleeGuaranteedLoop)]);
    case 3:
      return goal(4, [part('runic', save.unlockedItems.includes('runic_counter') ? 1 : 0, 1)]);
    case 4:
      return goal(5, [levelPart(balance.chapterTriggers[5].level), part('utensils', utensilsOwned(save), balance.chapterTriggers[5].utensils)]);
    case 5:
      return goal(6, [levelPart(balance.chapterTriggers[6].level), part('secrets', discoveredSecretCount(save), balance.chapterTriggers[6].secrets)]);
    case 6:
      return goal(7, [part('utensils', utensilsOwned(save), utensils.length)]);
    default:
      return goal('finale', [part('lostRecipe', save.recipes.lost_recipe?.discovered ? 1 : 0, 1)]);
  }
}
