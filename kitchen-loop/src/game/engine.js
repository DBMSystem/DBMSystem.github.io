import { ingredientById } from '../data/ingredients.js';
import { recipeById } from '../data/recipes.js';
import { customerById } from '../data/customers.js';
import { getUnlockedContent } from '../systems/unlocks.js';
import { createRng } from '../utils/rng.js';
import { createGrid, isCellFree, isFull } from './grid.js';
import { findMatches, pickMatchAt } from './recipeMatcher.js';
import { createTray, takeFromTray, generateIngredient } from './tray.js';
import { createComboState, registerCook, updateCombo } from './combo.js';
import { recipePoints } from './scoring.js';
import { chooseOrder, customerFor, freeSlot } from './customers.js';

export const TRAY_SLOTS = 3;

// One loop of play. Pure logic: no DOM, no React. The view reads `state` and drains `events`.
export function createEngine({ balance, level, discoveredSecrets = [], seed, onOverflow, onEnd }) {
  const rng = createRng(seed);
  const content = getUnlockedContent(level);
  const pool = content.ingredients.map((id) => ingredientById[id]).filter((i) => i.weight > 0);
  const cookable = content.recipes.map((id) => recipeById[id]);
  const orderable = cookable.filter((r) => r.kind !== 'secret');
  const customerTypes = content.customers.map((id) => customerById[id]).filter((c) => c?.category === 'common');
  const discovered = new Set(discoveredSecrets);
  const events = [];

  const state = {
    status: 'playing', // playing | overflow | ended
    time: 0,
    timeLeft: balance.loopDuration,
    score: 0,
    grid: createGrid(balance.gridSize),
    tray: null,
    customers: [],
    nextCustomerAt: balance.firstCustomerAt,
    ordersIssued: 0,
    customerSeq: 0,
    placeSeq: 0,
    combo: createComboState(),
    ordersServed: 0,
    recipesCooked: 0,
    customersLost: 0,
    cookedCounts: {},
    newlyDiscovered: [],
    secondChanceUsed: false,
    endReason: null,
    matches: [], // every cookable placement on the grid
    glowing: new Set(), // cells of known recipes (undiscovered secrets never glow)
  };

  const orderRecipes = () => state.customers.map((c) => recipeById[c.recipeId]);
  const generate = (tray) =>
    generateIngredient(rng, { pool, orderRecipes: orderRecipes(), grid: state.grid, tray, orderBias: balance.orderBias });
  state.tray = createTray(TRAY_SLOTS, generate);

  const isKnown = (recipe) => recipe.kind !== 'secret' || discovered.has(recipe.id);

  function refreshMatches() {
    state.matches = findMatches(state.grid, cookable, balance.maxRecipeSize);
    state.glowing = new Set(state.matches.filter((m) => isKnown(m.recipe)).flatMap((m) => m.cells));
  }

  function end(reason) {
    state.status = 'ended';
    state.endReason = reason;
    events.push({ type: 'end', reason });
    onEnd?.(getResult());
  }

  function checkOverflow() {
    if (isFull(state.grid) && state.matches.length === 0) {
      state.status = 'overflow';
      events.push({ type: 'overflow' });
      onOverflow?.({ secondChanceAvailable: !state.secondChanceUsed });
    }
  }

  function spawnCustomer() {
    const slot = freeSlot(state.customers, balance.maxCustomers);
    if (slot === -1 || customerTypes.length === 0 || orderable.length === 0) return;
    const type = rng.pick(customerTypes);
    const recipe = chooseOrder(
      rng,
      type,
      orderable,
      { ordersIssued: state.ordersIssued, activeRecipeIds: new Set(state.customers.map((c) => c.recipeId)) },
      balance,
    );
    const patience = balance.customerPatience * type.patience;
    const customer = { uid: ++state.customerSeq, typeId: type.id, recipeId: recipe.id, slot, patience, maxPatience: patience };
    state.customers.push(customer);
    state.ordersIssued += 1;
    events.push({ type: 'customerArrived', customer });
  }

  function placeIngredient(slot, cellIndex) {
    if (state.status !== 'playing' || !state.tray.slots[slot] || !isCellFree(state.grid, cellIndex, state.time)) return false;
    const ingredient = takeFromTray(state.tray, slot, generate);
    const cell = state.grid.cells[cellIndex];
    cell.ingredient = ingredient;
    cell.placedSeq = ++state.placeSeq;
    refreshMatches();
    events.push({ type: 'place', cell: cellIndex, ingredient, slot });
    checkOverflow();
    return true;
  }

  function cookAt(cellIndex) {
    if (state.status !== 'playing' || !state.grid.cells[cellIndex]?.ingredient) return false;
    const ordered = new Set(state.customers.map((c) => c.recipeId));
    const match = pickMatchAt(state.matches, cellIndex, ordered);
    if (!match) {
      events.push({ type: 'noRecipe', cell: cellIndex });
      return false;
    }
    const { recipe, cells } = match;
    const secretFound = recipe.kind === 'secret' && !discovered.has(recipe.id);
    if (secretFound) {
      discovered.add(recipe.id);
      state.newlyDiscovered.push(recipe.id);
    }

    const combo = registerCook(state.combo, state.time, balance);
    const customer = customerFor(state.customers, recipe.id);
    const { points, multiplier } = recipePoints(
      { base: recipe.points, chain: combo.chain, feverActive: state.combo.fever.active, served: Boolean(customer) },
      balance,
    );
    state.score += points;
    state.recipesCooked += 1;
    state.cookedCounts[recipe.id] = (state.cookedCounts[recipe.id] ?? 0) + 1;
    if (customer) {
      state.customers = state.customers.filter((c) => c !== customer);
      state.ordersServed += 1;
      state.timeLeft += balance.timeBonusPerOrder;
    }

    const ingredients = cells.map((i) => state.grid.cells[i].ingredient);
    for (const i of cells) {
      state.grid.cells[i].ingredient = null;
      state.grid.cells[i].lockedUntil = state.time + balance.cookDuration;
    }
    refreshMatches();

    events.push({
      type: 'cook',
      recipeId: recipe.id,
      cells,
      ingredients,
      points,
      multiplier,
      chain: combo.chain,
      customerSlot: customer ? customer.slot : null,
      secretFound,
    });
    if (combo.perfect) events.push({ type: 'perfect' });
    if (combo.feverStarted) events.push({ type: 'fever' });
    return true;
  }

  function step(dt) {
    if (state.status !== 'playing') return;
    state.time += dt;
    state.timeLeft -= dt;

    const combo = updateCombo(state.combo, state.time, balance);
    if (combo.feverEnded) events.push({ type: 'feverEnd' });
    if (combo.chainBroken) events.push({ type: 'comboBreak' });

    for (const customer of state.customers) customer.patience -= dt;
    const leaving = state.customers.filter((c) => c.patience <= 0);
    if (leaving.length > 0) {
      state.customers = state.customers.filter((c) => c.patience > 0);
      state.customersLost += leaving.length;
      for (const customer of leaving) events.push({ type: 'customerLeft', customer });
    }

    if (state.time >= state.nextCustomerAt) {
      state.nextCustomerAt += balance.customerInterval;
      spawnCustomer();
    }

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      end('time');
    }
  }

  // Rewarded second chance (spec 2.11): clears the oldest ingredients and adds time. Once per loop.
  function applySecondChance() {
    if (state.status !== 'overflow' || state.secondChanceUsed) return false;
    const oldest = state.grid.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.ingredient !== null)
      .sort((a, b) => a.cell.placedSeq - b.cell.placedSeq)
      .slice(0, balance.secondChanceCells);
    for (const { cell } of oldest) cell.ingredient = null;
    state.secondChanceUsed = true;
    state.timeLeft += balance.secondChanceTime;
    state.status = 'playing';
    refreshMatches();
    events.push({ type: 'secondChance', cells: oldest.map(({ index }) => index) });
    return true;
  }

  function finishOverflow() {
    if (state.status === 'overflow') end('overflow');
  }

  function getResult() {
    return {
      score: state.score,
      ordersServed: state.ordersServed,
      recipesCooked: state.recipesCooked,
      bestCombo: state.combo.best,
      feverCount: state.combo.fever.count,
      perfectCount: state.combo.perfectCount,
      customersLost: state.customersLost,
      cookedCounts: { ...state.cookedCounts },
      discovered: [...state.newlyDiscovered],
      endReason: state.endReason,
    };
  }

  const drainEvents = () => events.splice(0, events.length);

  return { state, placeIngredient, cookAt, step, applySecondChance, finishOverflow, getResult, drainEvents, isKnown, refreshMatches };
}
