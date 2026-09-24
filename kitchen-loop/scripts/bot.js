import { findMatches, pickMatchAt } from '../src/game/recipeMatcher.js';
import { isCellFree, neighbors } from '../src/game/grid.js';
import { recipeById } from '../src/data/recipes.js';
import { balance } from '../src/data/balance.js';

const WILDCARD = { wildcard: 'spice', wildcardMinSize: balance.spiceMinRecipeSize };

// A bot at the stove, for scripts/simulatePlaythrough.js and the fast-forward video. Pure logic over the engine:
// cook orders first, freeze a dish about to burn, sell at the counter to make room, and place each ingredient
// where it completes an order or sits next to its partners. `skill`: { mistake, fill } (see simulatePlaythrough).
export function createBot({ rng, skill }) {
  // Best placement of a tray ingredient: complete an order > complete any known recipe > sit next to its partners.
  function bestPlacement(engine, known) {
    const { state } = engine;
    const orderIds = new Set(state.customers.filter((c) => !c.cooking).map((c) => c.recipeId));
    const wanted = [...orderIds].map((id) => recipeById[id]);
    let best = null;
    state.tray.slots.forEach((id, slot) => {
      if (!id) return;
      for (let cell = 0; cell < state.grid.cells.length; cell++) {
        if (!isCellFree(state.grid, cell, state.time)) continue;
        let score = rng.next(); // ties broken at random
        if (id === 'clock') score += 500;
        else {
          state.grid.cells[cell].ingredient = id;
          const matches = findMatches(state.grid, known, balance.maxRecipeSize, WILDCARD).filter((m) => m.cells.includes(cell));
          state.grid.cells[cell].ingredient = null;
          for (const m of matches) score = Math.max(score, (orderIds.has(m.recipe.id) ? 200 : 40) + m.cells.length * 5);
          if (matches.length === 0) {
            for (const n of neighbors(state.grid, cell)) {
              const other = state.grid.cells[n].ingredient;
              if (!other) continue;
              const partners = wanted.some((r) => r.ingredients.includes(id) && r.ingredients.includes(other));
              score += partners ? 12 : -4;
            }
            if (!wanted.some((r) => r.ingredients.includes(id))) score += 6 - neighbors(state.grid, cell).length * 2; // leftovers to the edges
          }
        }
        if (!best || score > best.score) best = { slot, cell, score };
      }
    });
    return best;
  }

  function act(engine, known, stats, { clearAtEnd }) {
    const { state } = engine;
    // Chef del Vacío (empty board at the end): in the last seconds, cook everything and knife the leftovers.
    if (clearAtEnd && state.timeLeft < 9) {
      const any = state.matches[0];
      if (any && engine.cookAt(any.cells[0])) return;
      const left = state.grid.cells.findIndex((c) => c.ingredient);
      if (left !== -1 && state.timeLeft < 5) engine.discardAt(left);
      return;
    }
    const ordered = new Set(state.customers.filter((c) => !c.cooking).map((c) => c.recipeId));
    const knownIds = new Set(known.map((r) => r.id));
    const matches = state.matches.filter((m) => knownIds.has(m.recipe.id) || m.recipe.kind !== 'secret');
    // 1) An order that is on the board, most impatient customer first.
    const waiting = state.customers.filter((c) => !c.cooking).sort((a, b) => a.patience - b.patience);
    for (const customer of waiting) {
      for (const m of matches.filter((x) => x.recipe.id === customer.recipeId)) {
        const cell = m.cells.find((c) => pickMatchAt(state.matches, c, ordered)?.recipe.id === customer.recipeId);
        if (cell !== undefined && engine.cookAt(cell)) return;
      }
    }
    // A secret the bot has worked out from its card's hint: cook it as soon as it is on the board.
    const secret = state.matches.find((m) => m.recipe.kind === 'secret' && knownIds.has(m.recipe.id) && !engine.isKnown(m.recipe));
    if (secret && engine.cookAt(secret.cells[0])) return;
    // 2) Frost Tongs when a dish is about to burn.
    const late = state.customers.some((c) => c.cooking && c.patience < c.cooking.readyAt - state.time);
    if (late && engine.freeze()) return (stats.freezes += 1);
    // 3) Counter sale when the board is filling up, or to keep a combo alive.
    const filled = state.grid.cells.filter((c) => c.ingredient).length / state.grid.cells.length;
    const comboEnding = state.combo.chain >= 2 && state.time - state.combo.lastCookAt > balance.comboWindow * 0.7;
    const sellable = matches.filter((m) => !ordered.has(m.recipe.id)).sort((a, b) => b.recipe.points - a.recipe.points);
    if (sellable.length > 0 && (filled >= skill.fill || comboEnding)) {
      engine.cookAt(sellable[0].cells[0]);
      return;
    }
    // 4) Place an ingredient (sometimes carelessly).
    if (rng.next() < skill.mistake) {
      const free = state.grid.cells.map((_, i) => i).filter((i) => isCellFree(state.grid, i, state.time));
      const slot = state.tray.slots.findIndex(Boolean);
      if (free.length > 0 && slot !== -1) engine.placeIngredient(slot, rng.pick(free));
      return;
    }
    const move = bestPlacement(engine, known);
    if (move) engine.placeIngredient(move.slot, move.cell);
  }

  return { act, bestPlacement };
}
