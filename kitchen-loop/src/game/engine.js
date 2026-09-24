import { ingredientById } from '../data/ingredients.js';
import { recipeById } from '../data/recipes.js';
import { customerById } from '../data/customers.js';
import { getUnlockedContent } from '../systems/unlocks.js';
import { createRng } from '../utils/rng.js';
import { createGrid, isCellFree, isFull } from './grid.js';
import { findMatches, pickMatchAt } from './recipeMatcher.js';
import { createTray, takeFromTray, generateIngredient, setPreview, missingIngredients } from './tray.js';
import { createComboState, registerCook, updateCombo } from './combo.js';
import { recipePoints } from './scoring.js';
import { chooseOrder, customerFor, freeSlot } from './customers.js';

export const TRAY_SLOTS = 3;
const WILDCARD = 'spice';
const CLOCK = 'clock';
const TRUFFLE = 'truffle';

// One loop of play. Pure logic: no DOM, no React. The view reads `state` and drains `events`.
// `unlocks` = { chapter, utensils } adds story and Brûlée-tree content to the level's (spec 5.2).
// `specialty` = id of the daily specialty (spec 2.12) or null.
// Tutorial options: `ingredientQueue` fixes the first ingredients, `timerRunning: false` stops the clock,
// customers and patience until startTimer(), and `allowedSlots` / `allowedCells` restrict placing.
export function createEngine({
  balance,
  level,
  unlocks = {},
  specialty = null,
  discoveredSecrets = [],
  seed,
  onOverflow,
  onEnd,
  ingredientQueue = [],
  timerRunning = true,
}) {
  const rng = createRng(seed);
  const content = getUnlockedContent(level, unlocks);
  const features = new Set(content.features);
  const runic = features.has('runicGrid');
  const rules = {
    gridSize: runic ? balance.runicGrid.gridSize : balance.gridSize,
    maxCustomers: runic ? balance.runicGrid.maxCustomers : balance.maxCustomers,
    customerInterval: runic ? balance.runicGrid.customerInterval : balance.customerInterval,
  };
  const unlockedIngredients = content.ingredients.map((id) => ingredientById[id]);
  const pool = unlockedIngredients.filter((i) => !i.special);
  const specials = unlockedIngredients.filter((i) => i.special && i.id !== TRUFFLE).map((i) => i.id);
  const cookable = content.recipes.map((id) => recipeById[id]);
  const orderable = cookable.filter((r) => r.kind !== 'secret');
  const unlockedTypes = content.customers.map((id) => customerById[id]).filter(Boolean);
  const commonTypes = unlockedTypes.filter((c) => c.category === 'common');
  const rareTypes = [...unlockedTypes.filter((c) => c.category === 'legendary'), ...unlockedTypes.filter((c) => c.category === 'special')];
  const discovered = new Set(discoveredSecrets);
  const mod = specialty ? { id: specialty, ...balance.specialties[specialty] } : null;
  const events = [];

  const state = {
    status: 'playing', // playing | overflow | ended
    rules,
    specialty,
    timerRunning,
    allowedSlots: null, // Set of tray slots, or null = any
    allowedCells: null, // Set of grid cells, or null = any
    time: 0,
    timeLeft: balance.loopDuration,
    score: 0,
    grid: createGrid(rules.gridSize),
    tray: null,
    customers: [],
    nextCustomerAt: balance.firstCustomerAt,
    ordersIssued: 0,
    customerSeq: 0,
    placeSeq: 0,
    combo: createComboState(),
    ordersServed: 0,
    orderCoins: 0, // coins earned by orders: coinsPerOrder × the customer's pay multiplier
    fragments: 0, // collector and Brûlée's Night
    servedTypes: [],
    servedRecipes: [],
    recipesCooked: 0,
    customersLost: 0,
    goldenCooked: 0,
    legendaryArrived: false,
    cookedCounts: {},
    newlyDiscovered: [],
    specialsSpawned: {},
    truffleAt: unlockedIngredients.some((i) => i.id === TRUFFLE) && rng.next() < balance.truffleChance ? rng.next() * balance.loopDuration * 0.8 : null,
    abilities: Object.fromEntries(['move', 'discard', 'freeze'].filter((a) => features.has(a)).map((a) => [a, balance.abilityUses[a]])),
    frozenUntil: 0,
    nextPipVisitAt: mod?.interval ?? Infinity,
    criticPending: mod?.id === 'criticInRoom' && unlockedTypes.some((c) => c.id === mod.customer),
    secondChanceUsed: false,
    endReason: null,
    matches: [], // every cookable placement on the grid
    glowing: new Set(), // cells of known recipes (undiscovered secrets never glow)
  };

  const orderRecipes = () => state.customers.map((c) => recipeById[c.recipeId]);
  const weightOf = (i) => i.weight * (mod?.ingredient === i.id ? mod.weight : 1);

  // A special ingredient still under its per-loop cap, or null.
  function pickSpecial() {
    const options = specials.filter((id) => (state.specialsSpawned[id] ?? 0) < (balance.specialIngredientCaps[id] ?? Infinity));
    if (options.length === 0) return null;
    const id = rng.pick(options);
    state.specialsSpawned[id] = (state.specialsSpawned[id] ?? 0) + 1;
    return id;
  }

  const queue = [...ingredientQueue];
  function generate(tray) {
    if (queue.length > 0) return queue.shift();
    if (state.truffleAt !== null && state.time >= state.truffleAt) {
      state.truffleAt = null;
      return TRUFFLE;
    }
    if (specials.length > 0 && rng.next() < balance.specialIngredientChance) {
      const special = pickSpecial();
      if (special) return special;
    }
    return generateIngredient(rng, { pool, orderRecipes: orderRecipes(), grid: state.grid, tray, orderBias: balance.orderBias, weightOf });
  }
  const rollGolden = (id) => !ingredientById[id]?.special && rng.next() < balance.goldenIngredientChance;
  state.tray = createTray(TRAY_SLOTS, generate, rollGolden);

  const isKnown = (recipe) => recipe.kind !== 'secret' || discovered.has(recipe.id);

  function refreshMatches() {
    state.matches = findMatches(state.grid, cookable, balance.maxRecipeSize, { wildcard: WILDCARD, wildcardMinSize: balance.spiceMinRecipeSize });
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
      onOverflow?.({ secondChanceAvailable: !state.secondChanceUsed, canDiscard: (state.abilities.discard ?? 0) > 0 });
    }
  }

  function addCustomer(type, recipe) {
    const slot = freeSlot(state.customers, rules.maxCustomers);
    if (slot === -1 || !recipe) return null;
    const patience = balance.customerPatience * type.patience;
    const customer = { uid: ++state.customerSeq, typeId: type.id, recipeId: recipe.id, slot, patience, maxPatience: patience };
    state.customers.push(customer);
    state.ordersIssued += 1;
    if (type.category === 'legendary') state.legendaryArrived = true;
    events.push({ type: 'customerArrived', customer, category: type.category });
    return customer;
  }

  // Special and legendary customers (spec 3.3): chance per arrival, one at a time, one legendary per loop.
  function pickType() {
    const rarePresent = state.customers.filter((c) => customerById[c.typeId].category !== 'common').length;
    if (rarePresent < balance.maxSpecialCustomers) {
      if (state.criticPending && state.time >= mod.arrivalAt) {
        state.criticPending = false;
        return customerById[mod.customer];
      }
      for (const type of rareTypes) {
        if (type.category === 'legendary' && state.legendaryArrived) continue;
        if (rng.next() < type.chance) return type;
      }
    }
    return commonTypes.length > 0 ? rng.pick(commonTypes) : null;
  }

  // Orders: the specialty can steer them (Bacon Fest, Brûlée's Night).
  function orderFor(type) {
    const activeRecipeIds = new Set(state.customers.map((c) => c.recipeId));
    if (mod?.recipe && recipeById[mod.recipe] && orderable.includes(recipeById[mod.recipe]) && rng.next() < mod.orderChance) return recipeById[mod.recipe];
    if (mod?.id === 'bruleeNight') {
      const utensilRecipes = orderable.filter((r) => r.kind === 'utensil');
      if (utensilRecipes.length > 0 && rng.next() < mod.orderChance) return rng.pick(utensilRecipes);
    }
    return chooseOrder(rng, type, orderable, { ordersIssued: state.ordersIssued, activeRecipeIds, servedRecipes: state.servedRecipes }, balance);
  }

  function spawnCustomer() {
    if (orderable.length === 0) return;
    const type = pickType();
    if (type) addCustomer(type, orderFor(type));
  }

  function placeIngredient(slot, cellIndex) {
    if (state.status !== 'playing' || !state.tray.slots[slot] || !isCellFree(state.grid, cellIndex, state.time)) return false;
    if (state.allowedSlots?.has(slot) === false || state.allowedCells?.has(cellIndex) === false) return false;
    const golden = state.tray.golden[slot];
    const ingredient = takeFromTray(state.tray, slot, generate);
    // Kitchen Clock (spec 3.1): adds time and vanishes without taking the cell.
    if (ingredient === CLOCK) {
      state.timeLeft += balance.clockTime;
      events.push({ type: 'clock', cell: cellIndex, seconds: balance.clockTime });
      return true;
    }
    const cell = state.grid.cells[cellIndex];
    cell.ingredient = ingredient;
    cell.golden = golden;
    cell.placedSeq = ++state.placeSeq;
    refreshMatches();
    events.push({ type: 'place', cell: cellIndex, ingredient, slot, golden });
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

    const golden = cells.some((i) => state.grid.cells[i].golden);
    const combo = registerCook(state.combo, state.time, balance);
    const customer = customerFor(state.customers, recipe.id);
    const scored = recipePoints({ base: recipe.points, chain: combo.chain, feverActive: state.combo.fever.active, served: Boolean(customer) }, balance);
    const bonus = (golden ? balance.goldenPointsMultiplier : 1) * (mod?.pointsBonus && recipe.ingredients.includes(mod.ingredient) ? 1 + mod.pointsBonus : 1);
    const points = Math.round(scored.points * bonus);
    state.score += points;
    state.recipesCooked += 1;
    if (golden) state.goldenCooked += 1;
    state.cookedCounts[recipe.id] = (state.cookedCounts[recipe.id] ?? 0) + 1;
    let fragments = 0;
    if (customer) {
      const type = customerById[customer.typeId];
      state.customers = state.customers.filter((c) => c !== customer);
      state.ordersServed += 1;
      state.orderCoins += balance.coinsPerOrder * type.pay;
      fragments = (type.fragments ?? 0) + (mod?.fragmentsPerOrder ?? 0);
      state.fragments += fragments;
      state.servedTypes.push(customer.typeId);
      state.servedRecipes.push(recipe.id);
      state.timeLeft += balance.timeBonusPerOrder;
    }

    const ingredients = cells.map((i) => state.grid.cells[i].ingredient);
    for (const i of cells) {
      state.grid.cells[i].ingredient = null;
      state.grid.cells[i].golden = false;
      state.grid.cells[i].lockedUntil = state.time + balance.cookDuration;
    }
    refreshMatches();

    events.push({
      type: 'cook',
      recipeId: recipe.id,
      cells,
      ingredients,
      points,
      multiplier: scored.multiplier,
      chain: combo.chain,
      golden,
      fragments,
      customerSlot: customer ? customer.slot : null,
      customerTypeId: customer ? customer.typeId : null,
      patienceLeft: customer ? customer.patience / customer.maxPatience : null,
      secretFound,
    });
    if (combo.perfect) events.push({ type: 'perfect' });
    if (combo.feverStarted) events.push({ type: 'fever' });
    return true;
  }

  // Utensil abilities (spec 5.4). Each returns true when used.
  const canUse = (ability) => (state.abilities[ability] ?? 0) > 0;
  function use(ability) {
    state.abilities[ability] -= 1;
  }

  // Crystal Spatula: move a placed ingredient to a free cell.
  function moveIngredient(from, to) {
    if (state.status !== 'playing' || !canUse('move') || from === to) return false;
    const source = state.grid.cells[from];
    if (!source?.ingredient || !isCellFree(state.grid, to, state.time)) return false;
    const target = state.grid.cells[to];
    Object.assign(target, { ingredient: source.ingredient, golden: source.golden, placedSeq: source.placedSeq });
    Object.assign(source, { ingredient: null, golden: false });
    use('move');
    refreshMatches();
    events.push({ type: 'move', from, to, ingredient: target.ingredient });
    checkOverflow();
    return true;
  }

  // Mystic Knife: remove an ingredient from the grid. Also works on an overflowing kitchen.
  function discardAt(cellIndex) {
    if ((state.status !== 'playing' && state.status !== 'overflow') || !canUse('discard')) return false;
    const cell = state.grid.cells[cellIndex];
    if (!cell?.ingredient) return false;
    const ingredient = cell.ingredient;
    Object.assign(cell, { ingredient: null, golden: false });
    use('discard');
    if (state.status === 'overflow') state.status = 'playing';
    refreshMatches();
    events.push({ type: 'discard', cell: cellIndex, ingredient });
    return true;
  }

  // Frost Tongs: every customer's patience stops for a few seconds.
  function freeze() {
    if (state.status !== 'playing' || !canUse('freeze')) return false;
    use('freeze');
    state.frozenUntil = state.time + balance.freezeDuration;
    events.push({ type: 'freeze', duration: balance.freezeDuration });
    return true;
  }

  // Specialty events: Pip places a useful ingredient; the crazy kitchen serves a special one.
  function specialtyTick() {
    if (state.time < state.nextPipVisitAt) return;
    state.nextPipVisitAt += mod.interval;
    if (mod.id === 'pipVisit') {
      const free = state.grid.cells.map((_, i) => i).filter((i) => isCellFree(state.grid, i, state.time));
      if (free.length === 0) return;
      const poolIds = new Set(pool.map((i) => i.id));
      const useful = missingIngredients(orderRecipes(), state.grid, state.tray).filter((id) => poolIds.has(id));
      const ingredient = useful.length > 0 ? rng.pick(useful) : rng.weighted(pool, weightOf).id;
      const cellIndex = rng.pick(free);
      Object.assign(state.grid.cells[cellIndex], { ingredient, golden: false, placedSeq: ++state.placeSeq });
      refreshMatches();
      events.push({ type: 'pipPlaced', cell: cellIndex, ingredient });
      checkOverflow();
    } else if (mod.id === 'crazyKitchen') {
      const special = pickSpecial();
      if (special) setPreview(state.tray, special, false);
      else setPreview(state.tray, state.tray.preview, true);
      events.push({ type: 'crazyKitchen', ingredient: state.tray.preview, golden: state.tray.previewGolden });
    }
  }

  function step(dt) {
    if (state.status !== 'playing') return;
    state.time += dt;
    const combo = updateCombo(state.combo, state.time, balance);
    if (combo.feverEnded) events.push({ type: 'feverEnd' });
    if (combo.chainBroken) events.push({ type: 'comboBreak' });
    if (!state.timerRunning) return;
    state.timeLeft -= dt;

    if (state.time >= state.frozenUntil) for (const customer of state.customers) customer.patience -= dt;
    const leaving = state.customers.filter((c) => c.patience <= 0);
    if (leaving.length > 0) {
      state.customers = state.customers.filter((c) => c.patience > 0);
      state.customersLost += leaving.length;
      for (const customer of leaving) events.push({ type: 'customerLeft', customer });
    }

    if (state.time >= state.nextCustomerAt) {
      state.nextCustomerAt += rules.customerInterval;
      spawnCustomer();
    }
    if (mod) specialtyTick();

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
    for (const { cell } of oldest) Object.assign(cell, { ingredient: null, golden: false });
    state.secondChanceUsed = true;
    state.timeLeft += balance.secondChanceTime;
    state.status = 'playing';
    refreshMatches();
    events.push({ type: 'secondChance', cells: oldest.map(({ index }) => index) });
    return true;
  }

  // Tutorial helpers.
  function orderFrom(typeId, recipeId) {
    return addCustomer(customerById[typeId], recipeById[recipeId]);
  }

  function startTimer(duration) {
    state.timerRunning = true;
    state.timeLeft = duration;
    state.nextCustomerAt = state.time + balance.firstCustomerAt;
  }

  function finishOverflow() {
    if (state.status === 'overflow') end('overflow');
  }

  function getResult() {
    return {
      score: state.score,
      ordersServed: state.ordersServed,
      orderCoins: Math.round(state.orderCoins),
      fragments: state.fragments,
      servedTypes: [...new Set(state.servedTypes)],
      recipesCooked: state.recipesCooked,
      goldenCooked: state.goldenCooked,
      bestCombo: state.combo.best,
      feverCount: state.combo.fever.count,
      perfectCount: state.combo.perfectCount,
      customersLost: state.customersLost,
      cookedCounts: { ...state.cookedCounts },
      discovered: [...state.newlyDiscovered],
      specialty,
      endReason: state.endReason,
      emptyGridAtEnd: state.endReason === 'time' && state.grid.cells.every((cell) => cell.ingredient === null),
    };
  }

  const drainEvents = () => events.splice(0, events.length);

  return {
    state,
    placeIngredient,
    cookAt,
    moveIngredient,
    discardAt,
    freeze,
    step,
    applySecondChance,
    finishOverflow,
    getResult,
    drainEvents,
    isKnown,
    refreshMatches,
    orderFrom,
    startTimer,
  };
}
