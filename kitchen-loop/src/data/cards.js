// Album (spec 4.2–4.4): 48 cards. Names, lore and hints live in i18n/es.js (`card.<id>.name|lore|hint`).
// source: 'pack' (packs, loop drops, calendar, crafting) | 'discovery' (only by doing something, `unlock`).
// storyFragment: 1–12, the kitchen diary (spec 6.4). art: layers drawn on the card, bottom to top:
// [spriteKey, { scale, x, y, rotate, filter, opacity }] with x/y in % of the art box from its centre.
// draft: true = invented by Claude Code, pending review (docs/CONTENT_REVIEW.md).
const L = (sprite, options = {}) => [sprite, options];

export const cards = [
  // Commons (20, packs)
  { id: 'dubious_toast', rarity: 'common', source: 'pack', storyFragment: 1, art: [L('ingredients/bread', { filter: 'brightness(0.8) sepia(0.4)', rotate: -8 }), L('ingredients/tomato', { scale: 0.35, x: 22, y: -20, filter: 'grayscale(0.6)' })] },
  { id: 'burnt_egg', rarity: 'common', source: 'pack', storyFragment: 2, art: [L('ingredients/egg', { filter: 'brightness(0.35) sepia(0.8)' }), L('vfx/smoke', { scale: 0.55, x: 18, y: -22, opacity: 0.8 })] },
  { id: 'sad_tomato', rarity: 'common', source: 'pack', art: [L('ingredients/tomato', { filter: 'saturate(0.35) hue-rotate(-10deg)', rotate: 12 })] },
  { id: 'normal_bacon', rarity: 'common', source: 'pack', art: [L('ingredients/bacon')] },
  { id: 'suspicious_potato', rarity: 'common', source: 'pack', storyFragment: 3, art: [L('ingredients/potato', { rotate: -20, filter: 'contrast(1.2)' })] },
  { id: 'lazy_cheese', rarity: 'common', source: 'pack', draft: true, art: [L('ingredients/cheese', { rotate: 90, y: 10 })] },
  { id: 'shy_mushroom', rarity: 'common', source: 'pack', draft: true, storyFragment: 4, art: [L('ingredients/mushroom', { scale: 0.7, x: -10, y: 10 })] },
  { id: 'crying_onion', rarity: 'common', source: 'pack', draft: true, art: [L('ingredients/onion')] },
  { id: 'lost_herbs', rarity: 'common', source: 'pack', draft: true, art: [L('ingredients/herbs', { rotate: 25, x: 12 })] },
  { id: 'fish_out_of_water', rarity: 'common', source: 'pack', draft: true, art: [L('ingredients/fish', { rotate: -15, y: -8 })] },
  { id: 'dancing_bread', rarity: 'common', source: 'pack', draft: true, art: [L('ingredients/bread', { rotate: 18, x: -14, scale: 0.7 }), L('ingredients/bread', { rotate: -18, x: 16, scale: 0.7 })] },
  { id: 'double_yolk', rarity: 'common', source: 'pack', draft: true, storyFragment: 5, art: [L('ingredients/egg', { x: -14, scale: 0.75 }), L('ingredients/egg', { x: 16, y: 10, scale: 0.75 })] },
  { id: 'midnight_snack', rarity: 'common', source: 'pack', draft: true, art: [L('dishes/bacon_sandwich', { filter: 'brightness(0.75) hue-rotate(-15deg)' })] },
  { id: 'crispy_bacon', rarity: 'common', source: 'pack', draft: true, art: [L('dishes/triple_bacon')] },
  { id: 'happy_bravas', rarity: 'common', source: 'pack', draft: true, art: [L('dishes/bravas')] },
  { id: 'grandma_tortilla', rarity: 'common', source: 'pack', draft: true, storyFragment: 6, art: [L('dishes/spanish_omelette')] },
  { id: 'lonely_salad', rarity: 'common', source: 'pack', draft: true, art: [L('dishes/garden_salad', { scale: 0.75 })] },
  { id: 'pip_apron', rarity: 'common', source: 'pack', draft: true, storyFragment: 7, art: [L('pip/thumbs_up')] },
  { id: 'dented_pan', rarity: 'common', source: 'pack', draft: true, art: [L('ui/icon_cook', { rotate: -12, filter: 'contrast(1.2)' })] },
  { id: 'kitchen_clock', rarity: 'common', source: 'pack', draft: true, art: [L('ui/icon_timer')] },

  // Rares (10 packs + 4 discovery)
  { id: 'angry_vegan', rarity: 'rare', source: 'pack', art: [L('customers/office')] },
  { id: 'bacon_dj', rarity: 'rare', source: 'pack', art: [L('customers/student'), L('ingredients/bacon', { scale: 0.4, x: -26, y: 26 })] },
  { id: 'samurai_tomato', rarity: 'rare', source: 'pack', art: [L('ingredients/tomato', { filter: 'saturate(1.4)' }), L('vfx/star', { scale: 0.45, x: 24, y: -24, opacity: 0.9 })] },
  { id: 'astronaut_egg', rarity: 'rare', source: 'pack', art: [L('vfx/rainbow', { scale: 1.1, opacity: 0.45 }), L('ingredients/egg', { scale: 0.75, rotate: -20 })] },
  { id: 'grumpy_grandma', rarity: 'rare', source: 'pack', draft: true, storyFragment: 8, art: [L('customers/calm_angry')] },
  { id: 'sleepy_pip', rarity: 'rare', source: 'pack', draft: true, storyFragment: 9, art: [L('pip/sleeping')] },
  { id: 'alien_tourist', rarity: 'rare', source: 'pack', draft: true, art: [L('customers/tourist')] },
  { id: 'champions_breakfast', rarity: 'rare', source: 'pack', draft: true, art: [L('dishes/full_breakfast')] },
  { id: 'batter_king', rarity: 'rare', source: 'pack', draft: true, storyFragment: 10, art: [L('dishes/fish_chips')] },
  { id: 'kitchen_in_love', rarity: 'rare', source: 'pack', draft: true, art: [L('dishes/bacon_egg', { scale: 0.8, y: 8 }), L('vfx/hearts', { scale: 0.7, y: -18, opacity: 0.9 })] },
  { id: 'bacon_crown', rarity: 'rare', source: 'discovery', unlock: { type: 'secret', recipe: 'bacon_crown' }, art: [L('ingredients/bacon', { rotate: -35, x: -22, scale: 0.6 }), L('ingredients/egg', { scale: 0.55 }), L('ingredients/bacon', { rotate: 35, x: 22, scale: 0.6 }), L('ui/icon_legendary', { scale: 0.45, y: -30 })] },
  { id: 'mystic_scramble', rarity: 'rare', source: 'discovery', unlock: { type: 'secret', recipe: 'mystic_scramble' }, art: [L('vfx/sparkle', { opacity: 0.7 }), L('dishes/cheesy_scramble', { scale: 0.7, filter: 'hue-rotate(200deg)' })] },
  { id: 'master_soup', rarity: 'rare', source: 'discovery', unlock: { type: 'secret', recipe: 'master_soup' }, art: [L('dishes/fish_stew')] },
  { id: 'happy_critic', rarity: 'rare', source: 'discovery', unlock: { type: 'serve', customer: 'critic' }, art: [L('customers/critic')] },

  // Epics (5 packs + 5 discovery)
  { id: 'galactic_bread', rarity: 'epic', source: 'pack', art: [L('vfx/rainbow', { scale: 1.15 }), L('ingredients/bread', { scale: 0.65, rotate: 15 })] },
  { id: 'rooster_king', rarity: 'epic', source: 'pack', draft: true, storyFragment: 11, art: [L('customers/old_master')] },
  { id: 'rival_chef', rarity: 'epic', source: 'pack', draft: true, art: [L('customers/rival_chef')] },
  { id: 'pan_on_fire', rarity: 'epic', source: 'pack', draft: true, art: [L('vfx/fire_pan', { scale: 1.1 })] },
  { id: 'spice_whirl', rarity: 'epic', source: 'pack', draft: true, art: [L('vfx/sparkle', { scale: 1.15 }), L('ingredients/herbs', { scale: 0.55 })] },
  { id: 'triple_bacon_master', rarity: 'epic', source: 'discovery', unlock: { type: 'cookInLoop', recipe: 'triple_bacon', times: 3 }, art: [L('vfx/fire_pan', { scale: 0.9, y: 10, opacity: 0.8 }), L('dishes/triple_bacon', { scale: 0.7, y: -8 })] },
  { id: 'exploding_tomato', rarity: 'epic', source: 'discovery', unlock: { type: 'secret', recipe: 'exploding_tomato' }, art: [L('vfx/star', { filter: 'hue-rotate(160deg)' }), L('ingredients/tomato', { scale: 0.6 })] },
  { id: 'impossible_omelette', rarity: 'epic', source: 'discovery', unlock: { type: 'secret', recipe: 'impossible_omelette' }, art: [L('dishes/mushroom_omelette', { filter: 'hue-rotate(-20deg) saturate(1.3)' }), L('vfx/sparkle', { scale: 0.6, x: 24, y: -24 })] },
  { id: 'void_chef', rarity: 'epic', source: 'discovery', unlock: { type: 'emptyGridAtEnd' }, art: [L('vfx/smoke', { filter: 'invert(1) hue-rotate(180deg)', opacity: 0.6 }), L('pip/surprised', { scale: 0.8 })] },
  { id: 'double_fever', rarity: 'epic', source: 'discovery', unlock: { type: 'feverInLoop', times: 2 }, art: [L('vfx/fire_pan', { x: -18, scale: 0.7 }), L('vfx/fire_pan', { x: 18, y: 10, scale: 0.7 })] },

  // Legendaries (2 packs + 2 discovery)
  { id: 'golden_truffle', rarity: 'legendary', source: 'pack', art: [L('vfx/sparkle', { scale: 1.2 }), L('ingredients/truffle', { scale: 0.6, filter: 'sepia(1) saturate(3) brightness(1.2)' })] },
  { id: 'first_recipe', rarity: 'legendary', source: 'pack', storyFragment: 12, art: [L('vfx/rainbow', { scale: 1.1, opacity: 0.8 }), L('ui/icon_recipe', { scale: 0.6, filter: 'sepia(0.8)' })] },
  { id: 'old_master_seal', rarity: 'legendary', source: 'discovery', unlock: { type: 'serve', customer: 'old_master' }, art: [L('vfx/coins', { opacity: 0.6 }), L('ui/icon_legendary', { scale: 0.7 })] },
  { id: 'lost_recipe', rarity: 'legendary', source: 'discovery', unlock: { type: 'secret', recipe: 'lost_recipe' }, art: [L('vfx/rainbow', { scale: 1.2 }), L('ingredients/truffle', { scale: 0.45, y: 10 }), L('ui/icon_recipe', { scale: 0.4, y: -26 })] },
].map((card, index) => ({ number: index + 1, draft: false, storyFragment: null, unlock: null, ...card }));

export const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
export const RARITIES = ['common', 'rare', 'epic', 'legendary'];
export const STARS = { common: 1, rare: 2, epic: 3, legendary: 4 };
