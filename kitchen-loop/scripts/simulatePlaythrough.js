// Full playthrough with a bot (Daniel: "pásate el juego, intenta desbloquear todo"). The bot plays the real engine
// with human-like reaction times and the real progression: rewards, packs, calendar, Pip's orders, specialties,
// Brûlée's warehouse, story and crafting. Prints a Markdown report with milestones and how each loop felt.
// Usage: node scripts/simulatePlaythrough.js [skilled|casual] [seed] > docs/PLAYTHROUGH_REPORT.md (DAYS=30 for a shorter run)
import { createEngine } from '../src/game/engine.js';
import { createBot } from './bot.js';
import { recipeById } from '../src/data/recipes.js';
import { cards } from '../src/data/cards.js';
import { utensils } from '../src/data/utensils.js';
import { decorItems } from '../src/data/decor.js';
import { balance } from '../src/data/balance.js';
import { createDefaultSave } from '../src/save/schema.js';
import { finalizeLoop, discoveredSecrets } from '../src/economy/rewards.js';
import { openPack } from '../src/cards/packs.js';
import { claimCalendar } from '../src/systems/calendar.js';
import { craftCard, takePack, buyUtensil, buyDecor } from '../src/inventory/inventory.js';
import { utensilState, utensilCost, treeComplete } from '../src/systems/utensils.js';
import { advanceStory, pendingScenes, markSceneSeen, LAST_CHAPTER } from '../src/systems/story.js';
import { unlockContext, contentFor } from '../src/systems/unlocks.js';
import { rollSpecialties } from '../src/systems/specialty.js';
import { createRng } from '../src/utils/rng.js';

// Try other balance values without editing balance.js: BALANCE='{"comboWindow":4}' node scripts/simulatePlaythrough.js
Object.assign(balance, JSON.parse(process.env.BALANCE ?? '{}'));
const DT = 1 / 30;
// think: seconds between actions (mean), mistake: chance of a careless placement, fill: board share that makes
// the bot sell at the counter to make room, study: loops after a secret unlocks until the bot has read its hint.
const SKILLS = {
  skilled: { think: 0.9, jitter: 0.3, mistake: 0.05, fill: 0.6, study: 12, loopsPerDay: 8, adPacks: 2 },
  casual: { think: 1.5, jitter: 0.5, mistake: 0.15, fill: 0.75, study: 30, loopsPerDay: 4, adPacks: 1 },
};
const skillName = process.argv[2] ?? 'skilled';
const skill = SKILLS[skillName];
const rng = createRng(Number(process.argv[3] ?? 7));
const MAX_DAYS = Number(process.env.DAYS ?? 150);
const bot = createBot({ rng, skill });

function playLoop(save, { specialty, known, tutorial = false, secondChances, clearAtEnd }) {
  let result = null;
  const engine = createEngine({
    balance,
    level: save.player.level,
    unlocks: tutorial ? {} : unlockContext(save),
    specialty,
    discoveredSecrets: discoveredSecrets(save),
    seed: rng.int(1e9),
    onEnd: (r) => (result = r),
  });
  const stats = { counterSales: 0, served: 0, burnt: 0, justInTime: 0, fullStove: 0, freezes: 0, secondChance: false, specials: [], maxPans: 0 };
  let nextAction = 0.6;
  while (!result && engine.state.time < 600) {
    engine.step(DT);
    const { state } = engine;
    if (state.status === 'overflow') {
      const oldest = state.grid.cells.reduce((b, c, i) => (c.ingredient && (b === -1 || c.placedSeq < state.grid.cells[b].placedSeq) ? i : b), -1);
      if (engine.discardAt(oldest)) continue;
      if (secondChances.left > 0 && engine.applySecondChance()) {
        secondChances.left -= 1;
        stats.secondChance = true;
        continue;
      }
      engine.finishOverflow();
    }
    for (const e of engine.drainEvents()) {
      if (e.type === 'cook' && e.customerSlot === null) stats.counterSales += 1;
      if (e.type === 'served') stats.served += 1;
      if (e.type === 'served' && e.justInTime) stats.justInTime += 1;
      if (e.type === 'burnt') stats.burnt += 1;
      if (e.type === 'fullStove') stats.fullStove += 1;
      if (e.type === 'customerArrived' && e.category !== 'common') stats.specials.push(e.customer.typeId);
    }
    stats.maxPans = Math.max(stats.maxPans, state.customers.filter((c) => c.cooking).length);
    if (state.status === 'playing' && state.time >= nextAction) {
      bot.act(engine, known, stats, { clearAtEnd });
      nextAction = state.time + Math.max(0.15, skill.think + (rng.next() - 0.5) * 2 * skill.jitter);
    }
  }
  return { result: { ...result, tutorial, loopId: `bot-${rng.int(1e12)}` }, stats };
}

// ---------- the player's life ----------

const save = createDefaultSave(0);
save.player.name = 'Bot';
const t0 = Date.UTC(2026, 9, 1, 9);
const milestones = [];
const mark = (what, day, loop) => milestones.push({ what, day, loop });
const loops = [];
const secretSince = {}; // recipe → loop when it became cookable
const studied = new Set();
const discoveryWay = {};
let loopCount = 0;
let coinsEarned = 0;
let coinsSpent = 0;
const packCards = cards.filter((c) => c.source === 'pack');

function knownRecipes() {
  const content = contentFor(save);
  return content.recipes
    .map((id) => recipeById[id])
    .filter((r) => {
      if (r.kind !== 'secret') return true;
      secretSince[r.id] ??= loopCount;
      if (save.recipes[r.id]?.discovered) return true;
      if (loopCount - secretSince[r.id] >= skill.study) studied.add(r.id); // read the card's hint in the album
      return studied.has(r.id);
    });
}

function shop(day) {
  // Brûlée's tree first (cheapest available), then decoration.
  for (;;) {
    const next = utensils.filter((u) => utensilState(save, u.id) === 'available').sort((a, b) => utensilCost(a.id) - utensilCost(b.id))[0];
    if (!next || save.coins < utensilCost(next.id)) break;
    const before = save.coins;
    buyUtensil(save, next.id);
    coinsSpent += before - save.coins;
    mark(`Utensilio: ${next.id}`, day, loopCount);
  }
  if (treeComplete(save) && contentFor(save).features.includes('warehouse')) {
    for (const d of decorItems) {
      if (save.unlockedItems.includes(d.id) || save.coins < d.cost) continue;
      coinsSpent += d.cost;
      buyDecor(save, d.id);
      mark(`Decoración: ${d.id}`, day, loopCount);
    }
  }
  for (const n of advanceStory(save)) mark(`Capítulo ${n}`, day, loopCount);
  for (const id of pendingScenes(save)) markSceneSeen(save, id);
}

function craft(now) {
  for (const rarity of ['legendary', 'epic', 'rare', 'common']) {
    for (const c of packCards.filter((x) => x.rarity === rarity && !save.cards[x.id])) {
      if (save.fragments < balance.craftCost[rarity]) break;
      craftCard(save, c.id, now);
    }
  }
}

const seen = { level: 1, chapter: 1, album: 0 };
let finished = null;
for (let day = 1; day <= MAX_DAYS && !finished; day++) {
  const now = t0 + day * 86400000;
  const today = new Date(now).toISOString().slice(0, 10);
  const secondChances = { left: balance.secondChanceDailyCap };
  claimCalendar(save, rng, today, now);
  for (let i = 0; i < skill.loopsPerDay; i++) {
    const tutorial = loopCount === 0;
    const offered = tutorial ? [] : rollSpecialties(rng, save);
    const specialty = offered.length > 0 ? rng.pick(offered).id : null;
    const known = knownRecipes();
    // After reading the Chef del Vacío hint, a completionist tries it now and then.
    const clearAtEnd = !save.cards.void_chef && loopCount >= skill.study * 2 && rng.next() < 0.25;
    const { result, stats } = playLoop(save, { specialty, known, tutorial, secondChances, clearAtEnd });
    loopCount += 1;
    const coinsBefore = save.coins;
    const summary = finalizeLoop(save, result, { rng, now: now + i * 600000, today });
    coinsEarned += save.coins - coinsBefore;
    for (const id of result.discovered) discoveryWay[id] = studied.has(id) ? 'hint' : 'accident';
    loops.push({
      day,
      level: summary.levelBefore,
      chapter: save.story.chapter,
      specialty,
      ...stats,
      score: result.score,
      orders: result.ordersServed,
      lost: result.customersLost,
      combo: result.bestCombo,
      fever: result.feverCount,
      perfect: result.perfectCount,
      overflow: result.endReason === 'overflow',
      cards: summary.cards.length,
    });
    for (const n of summary.chapters) mark(`Capítulo ${n}`, day, loopCount);
    for (const id of result.discovered) mark(`Secreta: ${id} (${discoveryWay[id] === 'hint' ? 'con pista' : 'por accidente'})`, day, loopCount);
    if (save.player.level > seen.level) {
      for (const lv of [5, 10, 15, 20, 25, 30]) if (seen.level < lv && save.player.level >= lv) mark(`Nivel ${lv}`, day, loopCount);
      seen.level = save.player.level;
    }
    for (const id of pendingScenes(save)) {
      markSceneSeen(save, id);
      if (id === 'finale') mark('Final de la historia', day, loopCount);
    }
    shop(day);
  }
  for (let i = 0; i < skill.adPacks; i++) openPack(save, rng, now);
  while (takePack(save, 'standard')) openPack(save, rng, now);
  while (takePack(save, 'special')) openPack(save, rng, now, { special: true });
  craft(now);
  const owned = cards.filter((c) => save.cards[c.id]).length;
  if (!seen.packAlbum && packCards.every((c) => save.cards[c.id])) {
    seen.packAlbum = true;
    mark('Todas las cartas de sobre', day, loopCount);
  }
  for (const share of [0.25, 0.5, 0.75, 1]) if (seen.album < share && owned >= cards.length * share) mark(`Álbum ${Math.round(share * 100)} %`, day, loopCount);
  seen.album = owned / cards.length;
  const everything =
    save.story.seenScenes.includes('finale') &&
    treeComplete(save) &&
    decorItems.every((d) => save.unlockedItems.includes(d.id)) &&
    owned === cards.length &&
    save.player.level >= balance.maxLevel;
  if (everything) finished = day;
}

// ---------- report ----------

const avg = (list, f) => (list.length ? list.reduce((s, x) => s + f(x), 0) / list.length : 0);
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
const owned = cards.filter((c) => save.cards[c.id]);
const missing = cards.filter((c) => !save.cards[c.id]);
const days = loops.at(-1).day;

console.log(`# Partida completa simulada (${skillName === 'skilled' ? 'jugador hábil' : 'jugador casual'})\n`);
console.log(
  `Generado con \`node scripts/simulatePlaythrough.js ${skillName}\`. Un bot juega con el motor real (reacción media ${skill.think} s, ${Math.round(skill.mistake * 100)} % de colocaciones descuidadas), ${skill.loopsPerDay} servicios al día y ${skill.adPacks} sobres por anuncio al día, sin pagar nada.\n`,
);
console.log(
  `**Resultado:** ${finished ? `todo desbloqueado el día ${finished}` : `sin completar en ${MAX_DAYS} días`} · ${loopCount} servicios · nivel ${save.player.level} · capítulo ${save.story.chapter}/${LAST_CHAPTER} · álbum ${owned.length}/${cards.length} · monedas ganadas ${coinsEarned.toLocaleString('es-ES')}, gastadas ${coinsSpent.toLocaleString('es-ES')}.\n`,
);
console.log('## Hitos\n\n| Día | Servicio | Hito |\n|---|---|---|');
for (const m of milestones) console.log(`| ${m.day} | ${m.loop} | ${m.what} |`);
console.log('\n## Cómo se sienten los servicios (medias por tramo de nivel)\n');
console.log(
  '| Niveles | Servicios | Puntos | Pedidos | Perdidos | Quemados | Justo a tiempo | Mostrador | Combo máx. | Fiebres | En su punto | Desbordes | Cocina a tope |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [a, b] of [
  [1, 3],
  [4, 6],
  [7, 10],
  [11, 15],
  [16, 20],
  [21, 25],
  [26, 30],
]) {
  const set = loops.filter((l) => l.level >= a && l.level <= b);
  if (set.length === 0) continue;
  console.log(
    `| ${a}–${b} | ${set.length} | ${Math.round(avg(set, (l) => l.score))} | ${fmt(avg(set, (l) => l.orders))} | ${fmt(avg(set, (l) => l.lost))} | ${fmt(
      avg(set, (l) => l.burnt),
      2,
    )} | ${fmt(
      avg(set, (l) => l.justInTime),
      2,
    )} | ${fmt(avg(set, (l) => l.counterSales))} | ${fmt(avg(set, (l) => l.combo))} | ${fmt(
      avg(set, (l) => l.fever),
      2,
    )} | ${fmt(
      avg(set, (l) => l.perfect),
      2,
    )} | ${Math.round(avg(set, (l) => (l.overflow ? 100 : 0)))} % | ${fmt(
      avg(set, (l) => l.fullStove),
      2,
    )} |`,
  );
}
const specials = loops.flatMap((l) => l.specials);
const count = (list) =>
  Object.entries(list.reduce((o, x) => ({ ...o, [x]: (o[x] ?? 0) + 1 }), {}))
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
const pans = (n) => Math.round((loops.filter((l) => l.maxPans >= n).length / loops.length) * 100);
console.log(`\n**Sartenes a la vez:** al menos 2 en el ${pans(2)} % de los servicios, 3 en el ${pans(3)} %, 4 en el ${pans(4)} %.\n`);
console.log(`\n**Clientes especiales vistos:** ${count(specials) || 'ninguno'}.\n`);
console.log(`**Especialidades jugadas:** ${count(loops.map((l) => l.specialty).filter(Boolean)) || 'ninguna'}.\n`);
console.log(
  `**Secretas:** ${
    Object.entries(discoveryWay)
      .map(([id, way]) => `${id} (${way === 'hint' ? 'con pista' : 'por accidente'})`)
      .join(', ') || 'ninguna'
  }.\n`,
);
console.log(`**Cartas que faltan (${missing.length}):** ${missing.map((c) => `${c.id} (${c.rarity}, ${c.source})`).join(', ') || 'ninguna'}.\n`);
console.log(`**Días jugados:** ${days}. **Fragmentos sobrantes:** ${save.fragments}. **Monedas sobrantes:** ${save.coins}.`);
