// Sound and vibration for loop events (spec 9.5, 9.7). Returns [sound, vibration] or null.
export function feedbackFor(event) {
  switch (event.type) {
    case 'place':
      return ['place', null];
    case 'cook':
      if (event.secretFound) return ['secret', 'medium'];
      return [event.customerSlot !== null ? 'serve' : 'cook', 'light'];
    case 'noRecipe':
      return ['noRecipe', null];
    case 'perfect':
      return ['perfect', 'medium'];
    case 'fever':
      return ['fever', 'medium'];
    case 'customerLeft':
      return ['customerLeft', null];
    case 'overflow':
      return ['overflow', 'medium'];
    case 'secondChance':
      return ['secondChance', null];
    default:
      return null;
  }
}
