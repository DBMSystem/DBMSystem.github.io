// Ingredient data (spec 3.1). Visible names live in i18n/es.js (`ingredient.<id>`).
// `color`/`shape` feed the procedural placeholders (D-2); `weight` is the tray bag weight.
export const ingredients = [
  { id: 'egg', color: '#fff3d6', accent: '#ffc233', shape: 'egg', weight: 1 },
  { id: 'bacon', color: '#e8616b', accent: '#ffd0c2', shape: 'strip', weight: 1 },
  { id: 'bread', color: '#d9a05b', accent: '#f6d7a4', shape: 'loaf', weight: 1 },
  { id: 'tomato', color: '#e53935', accent: '#58b24a', shape: 'round', weight: 1 },
  { id: 'cheese', color: '#ffd23f', accent: '#e0a800', shape: 'wedge', weight: 1 },
  { id: 'mushroom', color: '#c9a27e', accent: '#f5e9d8', shape: 'cap', weight: 1 },
  { id: 'potato', color: '#b5835a', accent: '#7a5436', shape: 'oval', weight: 1 },
  { id: 'onion', color: '#b56cc9', accent: '#efd6f5', shape: 'bulb', weight: 1 },
  { id: 'herbs', color: '#4caf50', accent: '#a5d6a7', shape: 'leaf', weight: 1 },
  { id: 'fish', color: '#5c9ded', accent: '#cfe3ff', shape: 'fish', weight: 1 },
  // Special ingredients (phase 4)
  { id: 'clock', color: '#90a4ae', accent: '#ffffff', shape: 'round', weight: 0, special: true },
  { id: 'spice', color: '#ff8a3d', accent: '#ffe0b2', shape: 'round', weight: 0, special: true },
  { id: 'flame', color: '#ff5722', accent: '#ffeb3b', shape: 'round', weight: 0, special: true },
  { id: 'truffle', color: '#5d4037', accent: '#a1887f', shape: 'round', weight: 0, special: true },
];

export const ingredientById = Object.fromEntries(ingredients.map((i) => [i.id, i]));
