// Customers during a loop: arrival, orders and patience (spec 2.7, 3.3).
export function orderFilterFor(type, balance) {
  switch (type.orderFilter) {
    case 'small':
      return (r) => r.ingredients.length <= balance.smallRecipeMaxSize;
    case 'cheap':
      return (r) => r.points <= balance.cheapRecipeMaxPoints;
    case 'medium':
      return (r) => r.ingredients.length >= 3;
    case 'large':
      return (r) => r.ingredients.length === 4;
    default:
      return () => true;
  }
}

export function chooseOrder(rng, type, orderable, { ordersIssued, activeRecipeIds }, balance) {
  let options = orderable;
  if (ordersIssued < balance.smallOrdersFirst) {
    const smallest = Math.min(...orderable.map((r) => r.ingredients.length));
    options = orderable.filter((r) => r.ingredients.length === smallest);
  }
  const filtered = options.filter(orderFilterFor(type, balance));
  if (filtered.length > 0) options = filtered;
  const fresh = options.filter((r) => !activeRecipeIds.has(r.id));
  if (fresh.length > 0) options = fresh;
  return rng.pick(options);
}

export function freeSlot(customers, maxCustomers) {
  for (let slot = 0; slot < maxCustomers; slot++) {
    if (!customers.some((c) => c.slot === slot)) return slot;
  }
  return -1;
}

// The customer who gets a dish: whoever ordered it with the least patience left.
export function customerFor(customers, recipeId) {
  let target = null;
  for (const customer of customers) {
    if (customer.recipeId === recipeId && (!target || customer.patience < target.patience)) target = customer;
  }
  return target;
}
