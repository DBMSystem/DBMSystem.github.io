// Kitchen decoration (spec 5.6): cosmetic objects bought with coins, shown on the menu's kitchen scene.
// The art is cut out of the day kitchen of the reference mega pack (scripts/extract_sprites.py), so it is the
// same pixel art as the rest of the game. slot: one object per slot. x = centre and size = width in % of the
// scene's width, y = top in % of its height. size = the object's pixels × 0.22 %, which matches the menu
// scene's pixel size. Each object sits on a similar prop of the scene, as if it replaced it.
// draft: invented by Claude Code (docs/CONTENT_REVIEW.md). Names in i18n (`decor.<id>.name`).
export const decorItems = [
  { id: 'herb_pot', cost: 150, slot: 'salt', x: 80, y: 50, size: 9, draft: true },
  { id: 'veggie_bag', cost: 250, slot: 'cup', x: 91, y: 51, size: 12, draft: true },
  { id: 'cutting_board', cost: 400, slot: 'counterLeft', x: 12, y: 51, size: 18, draft: true },
  { id: 'garlic_string', cost: 500, slot: 'rod', x: 20, y: 29, size: 30, draft: true },
  { id: 'window_plant', cost: 650, slot: 'sill', x: 70, y: 40, size: 11, draft: true },
  { id: 'fruit_bowl', cost: 800, slot: 'counter', x: 68, y: 53, size: 17, draft: true },
  { id: 'jar_shelf', cost: 1000, slot: 'shelfTop', x: 16, y: 13, size: 30, draft: true },
  { id: 'pendant_lamp', cost: 1300, slot: 'ceiling', x: 90, y: 0, size: 12, draft: true },
  { id: 'plant_shelf', cost: 1600, slot: 'shelf', x: 18, y: 38, size: 35, draft: true },
  { id: 'big_plant', cost: 2000, slot: 'floor', x: 90, y: 70, size: 14, draft: true },
];

export const decorById = Object.fromEntries(decorItems.map((d) => [d.id, d]));
