// Daily specialties (spec 2.12). Numbers in balance.specialties; texts in i18n (`specialty.<id>.*`).
// requires: extra unlock beyond level 4 (a customer or a feature from the unlock table).
export const specialties = [
  { id: 'breakfast', icon: 'ingredients/egg' },
  { id: 'baconFest', icon: 'ingredients/bacon' },
  { id: 'pipVisit', icon: 'pip/thumbs_up' },
  { id: 'crazyKitchen', icon: 'vfx/star' },
  { id: 'criticInRoom', icon: 'customers/critic', requires: { customer: 'critic' } },
  { id: 'bruleeNight', icon: 'brulee/proud', requires: { feature: 'bruleeNight' } },
];
