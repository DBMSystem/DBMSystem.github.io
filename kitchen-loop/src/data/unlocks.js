// The single unlock table (spec 5.2). Nothing is unlocked from anywhere else.
// Phase 1 only reads the level rows; the other triggers are wired in later phases.
export const levelUnlocks = [
  { level: 1, ingredients: ['egg', 'bacon', 'bread', 'tomato', 'cheese'], recipes: ['bacon_egg', 'tomato_toast', 'special_toast'], customers: ['calm', 'student'], chapters: [1] },
  { level: 2, recipes: ['triple_bacon', 'cheesy_scramble', 'bacon_crown'], customers: ['office'] },
  { level: 3, ingredients: ['mushroom'], recipes: ['mushroom_omelette', 'impossible_omelette'], chapters: [2] },
  { level: 4, ingredients: ['potato'], recipes: ['bravas', 'bacon_sandwich', 'mystic_scramble'], customers: ['tourist'], features: ['loopModifiers'] },
  { level: 5, ingredients: ['onion', 'herbs'], recipes: ['spanish_omelette', 'garden_salad'], customers: ['critic'] },
  { level: 6, ingredients: ['fish'], recipes: ['herb_fish', 'fish_chips'], customers: ['rival_chef'] },
  { level: 7, recipes: ['full_breakfast'], customers: ['mystery'] },
  { level: 8, customers: ['collector'] },
  { level: 10, customers: ['old_master', 'legendary_critic'] },
];

export const utensilUnlocks = {
  golden_whisk: { recipes: ['french_omelette', 'broken_eggs'] },
  enchanted_pot: { recipes: ['fish_stew', 'mushroom_cream', 'master_soup'] },
  ember_skewers: { ingredients: ['flame'], recipes: ['garden_skewer', 'exploding_tomato'] },
};

// Highest level with new content; the phase 1 test-level selector goes up to here.
export const maxContentLevel = 7;
