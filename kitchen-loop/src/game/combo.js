// Combo chain, ¡En su punto! and ¡Fiebre en la cocina! (spec 2.8–2.10).
export function createComboState() {
  return { chain: 0, best: 0, lastCookAt: -Infinity, recentCooks: [], perfectCount: 0, fever: { active: false, endsAt: 0, count: 0, base: 0 } };
}

export function comboMultiplier(chain, table) {
  let multiplier = 1;
  for (const step of table) if (chain >= step.chain) multiplier = step.multiplier;
  return multiplier;
}

export function currentComboWindow(state, balance) {
  return balance.comboWindow * (state.fever.active ? balance.feverComboWindowMultiplier : 1);
}

// Advances timers. Returns what changed so the engine can emit events.
export function updateCombo(state, time, balance) {
  const changes = { feverEnded: false, chainBroken: false };
  if (state.fever.active && time >= state.fever.endsAt) {
    state.fever.active = false;
    state.fever.base = state.chain; // the next fever needs feverThreshold more recipes in the chain
    changes.feverEnded = true;
  }
  if (state.chain > 0 && time - state.lastCookAt > currentComboWindow(state, balance)) {
    state.chain = 0;
    state.fever.base = 0;
    changes.chainBroken = true;
  }
  return changes;
}

export function registerCook(state, time, balance) {
  updateCombo(state, time, balance);
  state.chain += 1;
  state.best = Math.max(state.best, state.chain);
  state.lastCookAt = time;

  state.recentCooks = state.recentCooks.filter((t) => time - t <= balance.perfectWindow);
  state.recentCooks.push(time);
  const perfect = state.recentCooks.length >= balance.perfectRecipes;
  if (perfect) {
    state.recentCooks = [];
    state.perfectCount += 1;
  }

  // A fever needs feverThreshold recipes in the chain; after one, another feverThreshold (the chain outlives the
  // fever thanks to its longer window, and would light the next one at once).
  const feverStarted = !state.fever.active && state.chain - state.fever.base >= balance.feverThreshold;
  if (feverStarted) {
    state.fever.active = true;
    state.fever.endsAt = time + balance.feverDuration;
    state.fever.count += 1;
  }
  return { chain: state.chain, perfect, feverStarted };
}
