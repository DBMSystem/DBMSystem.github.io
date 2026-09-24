// Pip's daily orders ("Encargos de Pip"). Targets and rewards live in balance.challenges.
// scope 'loop': reach the target in a single service; scope 'day': add up over the day's services.
export const challengeTemplates = [
  { id: 'combo', scope: 'loop', stat: 'bestCombo' },
  { id: 'orders', scope: 'loop', stat: 'ordersServed' },
  { id: 'score', scope: 'loop', stat: 'score' },
  { id: 'noLoss', scope: 'loop', stat: 'noCustomerLost' },
  { id: 'cook', scope: 'day', stat: 'cookRecipe' },
  { id: 'perfect', scope: 'day', stat: 'perfectCount' },
  { id: 'fever', scope: 'day', stat: 'feverCount', fromLevel: 2 },
  { id: 'recipes', scope: 'day', stat: 'recipesCooked' },
];
