// Daily specialties (spec 2.12). Numbers in balance.specialties; texts in i18n (`specialty.<id>.*`).
// requires: extra unlock beyond level 4 (a customer or a feature from the unlock table).
// accent and tag: how its card looks in the picker (colour, and what it is about: specialty.tag.<tag>).
export const specialties = [
  { id: 'breakfast', icon: 'ingredients/egg', accent: '#ffd54f', tag: 'points' },
  { id: 'baconFest', icon: 'ingredients/bacon', accent: '#ff7043', tag: 'orders' },
  { id: 'pipVisit', icon: 'pip/thumbs_up', accent: '#4fc3f7', tag: 'help' },
  { id: 'crazyKitchen', icon: 'vfx/star', accent: '#ce93d8', tag: 'chaos' },
  { id: 'criticInRoom', icon: 'customers/critic', accent: '#f06292', tag: 'challenge', requires: { customer: 'critic' } },
  { id: 'bruleeNight', icon: 'brulee/proud', accent: '#9575cd', tag: 'fragments', requires: { feature: 'bruleeNight' } },
];
