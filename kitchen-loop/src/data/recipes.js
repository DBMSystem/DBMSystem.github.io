// Recipe data (spec 3.2). Visible names live in i18n/es.js (`recipe.<id>`).
// pattern: 'group' | 'line' | 'square'. `ordered` lines list ingredients in order.
// kind: 'visible' | 'utensil' | 'secret'. What unlocks each recipe lives in unlocks.js.
export const recipes = [
  { id: 'bacon_egg', ingredients: ['egg', 'bacon'], pattern: 'group', points: 50, kind: 'visible' },
  { id: 'tomato_toast', ingredients: ['bread', 'tomato'], pattern: 'group', points: 50, kind: 'visible' },
  { id: 'special_toast', ingredients: ['bread', 'tomato', 'cheese'], pattern: 'group', points: 120, kind: 'visible' },
  { id: 'triple_bacon', ingredients: ['bacon', 'bacon', 'bacon'], pattern: 'line', points: 130, kind: 'visible' },
  { id: 'cheesy_scramble', ingredients: ['egg', 'egg', 'cheese'], pattern: 'group', points: 120, kind: 'visible' },
  { id: 'mushroom_omelette', ingredients: ['egg', 'mushroom'], pattern: 'group', points: 60, kind: 'visible' },
  { id: 'bacon_sandwich', ingredients: ['bread', 'bacon', 'bread'], pattern: 'line', ordered: true, points: 140, kind: 'visible' },
  { id: 'bravas', ingredients: ['potato', 'tomato'], pattern: 'group', points: 60, kind: 'visible' },
  { id: 'spanish_omelette', ingredients: ['egg', 'potato', 'onion'], pattern: 'group', points: 150, kind: 'visible' },
  { id: 'garden_salad', ingredients: ['tomato', 'onion', 'herbs'], pattern: 'group', points: 130, kind: 'visible' },
  { id: 'herb_fish', ingredients: ['fish', 'herbs'], pattern: 'group', points: 70, kind: 'visible' },
  { id: 'fish_chips', ingredients: ['fish', 'potato'], pattern: 'group', points: 70, kind: 'visible' },
  { id: 'full_breakfast', ingredients: ['egg', 'bacon', 'bread', 'tomato'], pattern: 'group', points: 280, kind: 'visible' },

  { id: 'french_omelette', ingredients: ['egg', 'egg'], pattern: 'line', points: 60, kind: 'utensil' },
  { id: 'broken_eggs', ingredients: ['egg', 'potato', 'bacon'], pattern: 'group', points: 150, kind: 'utensil' },
  { id: 'fish_stew', ingredients: ['fish', 'potato', 'onion', 'tomato'], pattern: 'group', points: 280, kind: 'utensil' },
  { id: 'mushroom_cream', ingredients: ['mushroom', 'mushroom', 'cheese', 'onion'], pattern: 'group', points: 260, kind: 'utensil' },
  { id: 'garden_skewer', ingredients: ['tomato', 'onion', 'mushroom', 'flame'], pattern: 'line', points: 300, kind: 'utensil' },

  { id: 'bacon_crown', ingredients: ['bacon', 'egg', 'bacon'], pattern: 'line', ordered: true, points: 220, kind: 'secret' },
  { id: 'impossible_omelette', ingredients: ['egg', 'egg', 'egg', 'egg'], pattern: 'square', points: 350, kind: 'secret' },
  { id: 'mystic_scramble', ingredients: ['mushroom', 'mushroom', 'mushroom', 'egg'], pattern: 'group', points: 300, kind: 'secret' },
  { id: 'master_soup', ingredients: ['fish', 'onion', 'herbs', 'potato'], pattern: 'group', points: 400, kind: 'secret' },
  { id: 'exploding_tomato', ingredients: ['tomato', 'cheese', 'flame'], pattern: 'group', points: 380, kind: 'secret' },
  { id: 'lost_recipe', ingredients: ['truffle', 'egg', 'bread', 'cheese'], pattern: 'square', points: 600, kind: 'secret' },
];

export const recipeById = Object.fromEntries(recipes.map((r) => [r.id, r]));
