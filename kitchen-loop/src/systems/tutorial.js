// Runs the guided first loop (spec 8.2) on top of an engine. Pure logic: the view reads `step`.
export function createTutorialRunner(engine, script, balance) {
  let index = -1;
  let step = null;

  function enter(next) {
    index = next;
    step = script.steps[index] ?? null;
    engine.state.allowedSlots = step?.allowedSlots ? new Set(step.allowedSlots) : null;
    engine.state.allowedCells = step?.allowedCells ? new Set(step.allowedCells) : null;
    if (step?.spawnsOrder) engine.orderFrom(script.order.customer, script.order.recipe);
    if (step?.startsTimer) engine.startTimer(balance.tutorialLoopDuration);
  }

  const completes = (event) =>
    (step.until === 'place' && event.type === 'place') ||
    (step.until === 'cook' && event.type === 'cook') ||
    (step.until === 'serve' && event.type === 'cook' && event.customerSlot !== null);

  // Returns true when the step changed.
  function handle(events) {
    let changed = false;
    for (const event of events) {
      if (step?.until && completes(event)) {
        enter(index + 1);
        changed = true;
      }
    }
    return changed;
  }

  enter(0);
  return {
    handle,
    get step() {
      return step;
    },
  };
}
