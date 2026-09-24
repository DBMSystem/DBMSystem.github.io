import { levelUnlocks, chapterUnlocks, utensilUnlocks, treeUnlocks } from '../data/unlocks.js';
import { utensils } from '../data/utensils.js';

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
