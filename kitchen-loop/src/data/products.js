// Real-money products (spec 7.4). Everything has fixed content, shown before paying; nothing gives an advantage.
// Names and descriptions in i18n (`product.<id>.*`). Prices are shown as given by the store (mock: these).
export const PASS = 'kl_maestro_pass';
export const STARTER_PACK = 'kl_starter_pack';

export const products = [
  { id: PASS, price: '4,99 €', pan: 'golden' },
  { id: 'kl_skin_rusty', price: '1,99 €', pan: 'rusty' },
  { id: 'kl_skin_pink', price: '1,99 €', pan: 'pink' },
  { id: 'kl_skin_black', price: '1,99 €', pan: 'black' },
];
export const productById = Object.fromEntries(products.map((p) => [p.id, p]));

// Pack de Inicio (spec 7.4): fixed content, all of it also obtainable for free. draft: chosen by Claude Code.
export const starterPack = {
  id: STARTER_PACK,
  price: '0,99 €',
  cards: ['normal_bacon', 'sad_tomato', 'lazy_cheese', 'crying_onion', 'sleepy_pip'],
  draft: true,
};

// Cosmetic pans (spec 7.5): only looks and cosmetic particles, never gameplay. `product`: what unlocks it.
export const pans = [
  { id: 'default', product: null, sprite: 'ui/icon_cook', particle: 'steam' },
  { id: 'rusty', product: 'kl_skin_rusty', sprite: 'pans/rusty', particle: 'fire' },
  { id: 'pink', product: 'kl_skin_pink', sprite: 'pans/pink', particle: 'pinkSpark' },
  { id: 'black', product: 'kl_skin_black', sprite: 'pans/black', particle: 'smoke' },
  { id: 'golden', product: PASS, sprite: 'pans/golden', particle: 'goldSpark' },
];
export const panById = Object.fromEntries(pans.map((p) => [p.id, p]));
