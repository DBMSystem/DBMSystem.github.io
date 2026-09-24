// Customer types (spec 3.3). Names live in i18n/es.js (`customer.<id>`).
// orderFilter: 'small' (size <= smallRecipeMaxSize) | 'cheap' (points <= cheapRecipeMaxPoints) | 'any'
//   | 'medium' (size 3–4) | 'large' (size 4) | 'unserved' (not served this loop).
// `chance` is per arrival for special/legendary customers, which arrive in phase 4.
export const customers = [
  { id: 'calm', category: 'common', patience: 1.3, pay: 1.0, orderFilter: 'small', color: '#8fbf9f' },
  { id: 'student', category: 'common', patience: 1.0, pay: 0.8, orderFilter: 'cheap', color: '#7fa7d9' },
  { id: 'office', category: 'common', patience: 0.8, pay: 1.2, orderFilter: 'any', color: '#9e9e9e' },
  { id: 'tourist', category: 'common', patience: 1.0, pay: 1.0, orderFilter: 'any', color: '#f4a259' },
  { id: 'critic', category: 'special', chance: 0.03, patience: 0.7, pay: 3.0, orderFilter: 'medium', color: '#37474f' },
  { id: 'rival_chef', category: 'special', chance: 0.03, patience: 0.9, pay: 2.0, orderFilter: 'large', color: '#c62828' },
  { id: 'mystery', category: 'special', chance: 0.02, patience: 1.2, pay: 2.0, orderFilter: 'unserved', color: '#5e35b1' },
  { id: 'collector', category: 'special', chance: 0.02, patience: 1.0, pay: 1.0, orderFilter: 'any', fragments: 10, color: '#00897b' },
  { id: 'old_master', category: 'legendary', chance: 0.005, patience: 1.0, pay: 5.0, orderFilter: 'large', color: '#ffb300' },
  { id: 'legendary_critic', category: 'legendary', chance: 0.005, patience: 0.6, pay: 5.0, orderFilter: 'large', color: '#212121' },
  { id: 'night_visitor', category: 'legendary', chance: 0.005, patience: 1.5, pay: 4.0, orderFilter: 'any', color: '#283593' },
];

export const customerById = Object.fromEntries(customers.map((c) => [c.id, c]));
