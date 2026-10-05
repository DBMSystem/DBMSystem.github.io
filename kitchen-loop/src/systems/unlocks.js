import { levelUnlocks, chapterUnlocks, utensilUnlocks, treeUnlocks } from '../data/unlocks.js';
import { utensils } from '../data/utensils.js';
import { recipes } from '../data/recipes.js';

const KINDS = ['ingredients', 'recipes', 'customers', 'chapters', 'features'];

// Everything unlocked for a player level, story chapter and bought utensils, read from the single unlock table.
export function getUnlockedContent(level, { chapter = 1, utensils: owned = [] } = {}) {
  const content = Object.fromEntries(KINDS.map((kind) => [kind, []]));
  const add = (row) => {
    for (const kind of KINDS) for (const id of row[kind] ?? []) if (!content[kind].includes(id)) content[kind].push(id);
  };
  for (const row of levelUnlocks) if (row.level <= level) add(row);
  for (const row of chapterUnlocks) if (row.chapter <= chapter) add(row);
  for (const id of owned) if (utensilUnlocks[id]) add(utensilUnlocks[id]);
  if (utensils.every((u) => owned.includes(u.id))) add(treeUnlocks);
  return content;
}

// Unlock context of a save: level, chapter and bought utensils.
export const ownedUtensils = (save) => utensils.filter((u) => save.unlockedItems.includes(u.id)).map((u) => u.id);
export const unlockContext = (save) => ({ chapter: save.story.chapter, utensils: ownedUtensils(save) });
export const contentFor = (save) => getUnlockedContent(save.player.level, unlockContext(save));

// Level at which a recipe (or any other unlockable id) first appears, or null.
export function unlockLevelOf(kind, id) {
  return levelUnlocks.find((row) => row[kind]?.includes(id))?.level ?? null;
}

// The recipes a service can cook, the most valuable first (Daniel: "por orden de puntos"). Secret ones only once
// discovered; locked ones are left to the recipe book in the album.
export function cookableRecipes(level, unlocks = {}, discovered = []) {
  const unlocked = new Set(getUnlockedContent(level, unlocks).recipes);
  return recipes.filter((r) => unlocked.has(r.id) && (r.kind !== 'secret' || discovered.includes(r.id))).sort((a, b) => b.points - a.points);
}
