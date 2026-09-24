import { levelUnlocks } from '../data/unlocks.js';

// Everything unlocked up to `level`, read from the single unlock table.
export function getUnlockedContent(level) {
  const content = { ingredients: [], recipes: [], customers: [], chapters: [], features: [] };
  for (const row of levelUnlocks) {
    if (row.level > level) continue;
    for (const key of Object.keys(content)) content[key].push(...(row[key] ?? []));
  }
  return content;
}

// Level at which a recipe (or any other unlockable id) first appears, or null.
export function unlockLevelOf(kind, id) {
  return levelUnlocks.find((row) => row[kind]?.includes(id))?.level ?? null;
}
