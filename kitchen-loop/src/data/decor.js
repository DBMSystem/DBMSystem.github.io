// Kitchen decoration (spec 5.6): cosmetic objects bought with coins, shown on the menu's kitchen scene.
// slot: where it goes (one object per slot). x = centre and size = width in % of the scene's width,
// y = top in % of its height. Sprite `decor/<id>`. size = art pixels × 0.55 %, the pixel size of the
// menu scene, so every object looks drawn with the same pixels as the kitchen.
// draft: invented by Claude Code (docs/CONTENT_REVIEW.md). Names in i18n (`decor.<id>.name|desc`).
export const decorItems = [
  { id: 'herb_pots', cost: 150, slot: 'sill', x: 70, y: 41, size: 10, draft: true },
  { id: 'garlic_string', cost: 250, slot: 'hook', x: 53, y: 21, size: 5, draft: true },
  { id: 'menu_board', cost: 400, slot: 'wall', x: 30, y: 72, size: 9, draft: true },
  { id: 'copper_lamp', cost: 500, slot: 'ceiling', x: 93, y: 0, size: 6, draft: true },
  { id: 'spice_rack', cost: 650, slot: 'shelf', x: 24, y: 60, size: 7, draft: true },
  { id: 'wall_clock', cost: 800, slot: 'wallHigh', x: 84, y: 3, size: 7, draft: true },
  { id: 'cookie_jar', cost: 1000, slot: 'counter', x: 75, y: 55, size: 6, draft: true },
  { id: 'fairy_lights', cost: 1300, slot: 'top', x: 78, y: 16, size: 26, draft: true },
  { id: 'big_plant', cost: 1600, slot: 'corner', x: 6, y: 58, size: 10, draft: true },
  { id: 'sleeping_cat', cost: 2000, slot: 'floor', x: 80, y: 72, size: 15.5, draft: true },
];

export const decorById = Object.fromEntries(decorItems.map((d) => [d.id, d]));
