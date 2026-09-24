// Kitchen decoration (spec 5.6): cosmetic objects bought with coins, shown on the menu's kitchen scene.
// The art is cut out of the day kitchen of the reference mega pack (scripts/extract_sprites.py), so it is the
// same pixel art as the rest of the game. slot: one object per slot. x = centre and size = width in % of the
// scene's width, y = top in % of its height. size = the object's pixels × 0.22 %, which matches the menu
// scene's pixel size. Each object sits on a similar prop of the scene, as if it replaced it.
// draft: invented by Claude Code (docs/CONTENT_REVIEW.md). Names in i18n (`decor.<id>.name`).
// Several objects can share a slot: the one on show is chosen in the warehouse (the last one bought goes up).
// currency: 'coins' (default) or 'fragments' (Brûlée's magic corner). Prices: docs/DECISIONES.md §23.
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
  // Display plates on the counter, left of Pip (the mega pack plates no recipe uses), and a clock above the window.
  { id: 'wall_clock', cost: 1000, slot: 'wall', x: 80, y: 6, size: 7.5, draft: true },
  { id: 'plate_croissant', cost: 1200, slot: 'plate', x: 33, y: 63, size: 15, draft: true },
  { id: 'plate_pancakes', cost: 1500, slot: 'plate', x: 33, y: 62, size: 15, draft: true },
  { id: 'plate_fried_rice', cost: 1800, slot: 'plate', x: 33, y: 63, size: 15, draft: true },
  { id: 'plate_sushi', cost: 2200, slot: 'plate', x: 33, y: 63, size: 15, draft: true },
  { id: 'plate_steak', cost: 2600, slot: 'plate', x: 33, y: 63, size: 15, draft: true },
  // Brûlée's magic corner, paid with fragments.
  { id: 'magic_potion', cost: 600, currency: 'fragments', slot: 'shakers', x: 22, y: 59, size: 6, draft: true },
  { id: 'star_jar', cost: 1200, currency: 'fragments', slot: 'shakers', x: 22, y: 59, size: 10, draft: true },
  { id: 'enchanted_mushrooms', cost: 2000, currency: 'fragments', slot: 'plate', x: 33, y: 61, size: 14, draft: true },
  { id: 'brulee_book', cost: 3000, currency: 'fragments', slot: 'wall', x: 80, y: 5, size: 7.5, draft: true },
  { id: 'golden_truffle', cost: 5000, currency: 'fragments', slot: 'plate', x: 33, y: 60, size: 11, draft: true },
];

export const decorById = Object.fromEntries(decorItems.map((d) => [d.id, d]));
