// The single unlock table (spec 5.2). Nothing is unlocked from anywhere else.
// Rows by player level, by story chapter, by utensil bought and for the complete Brûlée tree.
export const levelUnlocks = [
  {
    level: 1,
    ingredients: ['egg', 'bacon', 'bread', 'tomato', 'cheese'],
    recipes: ['bacon_egg', 'tomato_toast', 'special_toast'],
    customers: ['calm', 'student'],
    chapters: [1],
  },
  { level: 2, recipes: ['triple_bacon', 'cheesy_scramble', 'bacon_crown'], customers: ['office'] },
  { level: 3, ingredients: ['mushroom'], recipes: ['mushroom_omelette', 'impossible_omelette'], chapters: [2] },
  { level: 4, ingredients: ['potato'], recipes: ['bravas', 'bacon_sandwich', 'mystic_scramble'], customers: ['tourist'], features: ['loopModifiers'] },
  { level: 5, ingredients: ['onion', 'herbs'], recipes: ['spanish_omelette', 'garden_salad'], customers: ['critic'] },
  { level: 6, ingredients: ['fish'], recipes: ['herb_fish', 'fish_chips'], customers: ['rival_chef'] },
  { level: 7, recipes: ['full_breakfast'], customers: ['mystery'] },
  { level: 8, customers: ['collector'] },
  { level: 10, customers: ['old_master', 'legendary_critic'] },
];

// Brûlée's appearance opens chapter 3 (spec 5.2, 6.3).
export const chapterUnlocks = [{ chapter: 3, customers: ['night_visitor'], features: ['warehouse', 'bruleeNight'] }];

// Brûlée's tree (spec 5.4): what each utensil unlocks.
export const utensilUnlocks = {
  runic_counter: { features: ['runicGrid'] },
  crystal_spatula: { features: ['move'] },
  time_ladle: { ingredients: ['clock'] },
  ancient_spice: { ingredients: ['spice'] },
  mystic_knife: { features: ['discard'] },
  golden_whisk: { recipes: ['french_omelette', 'broken_eggs'] },
  enchanted_pot: { recipes: ['fish_stew', 'mushroom_cream', 'master_soup'] },
  frost_tongs: { features: ['freeze'] },
  ember_skewers: { ingredients: ['flame'], recipes: ['garden_skewer', 'exploding_tomato'] },
};

// The complete tree: the truffle and the story's final recipe.
export const treeUnlocks = { ingredients: ['truffle'], recipes: ['lost_recipe'] };

// Highest level with new content.
export const maxContentLevel = 10;
