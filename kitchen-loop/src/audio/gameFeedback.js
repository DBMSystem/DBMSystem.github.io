// Sound and vibration for loop events (spec 9.5, 9.7). Returns [sound, vibration] or null.
export function feedbackFor(event) {
  switch (event.type) {
    case 'place':
    case 'move':
    case 'pipPlaced':
      return ['place', null];
    case 'clock':
      return ['coin', 'light'];
    case 'discard':
      return ['discard', 'light'];
    case 'freeze':
      return ['freeze', 'medium'];
    case 'crazyKitchen':
      return ['glow', null];
    case 'customerArrived':
      return event.category === 'common' ? null : ['specialCustomer', 'light'];
    case 'cook':
      if (event.secretFound) return ['secret', 'medium'];
      if (event.golden) return ['coin', 'medium'];
      return [event.customerSlot !== null ? 'sizzle' : 'cook', 'light'];
    case 'served':
      return ['serve', 'light'];
    case 'burnt':
      return ['burn', 'medium'];
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
    case 'challengeDone':
      return ['levelUp', 'medium'];
    default:
      return null;
  }
}
