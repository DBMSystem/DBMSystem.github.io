// Economy simulation (spec 4.10): 1,000 players with different habits play day by day with the real
// reward code (finalizeLoop, packs, calendar, crafting). Prints a Markdown report.
// Usage: node scripts/simulateEconomy.js > docs/ECONOMY_REPORT.md
// Try other values without editing balance.js: node scripts/simulateEconomy.js newCardBias=0.3 craftCost.legendary=2000
import { createDefaultSave } from '../src/save/schema.js';
import { finalizeLoop } from '../src/economy/rewards.js';
import { openPack } from '../src/cards/packs.js';
import { claimCalendar } from '../src/systems/calendar.js';
import { craftCard, takePack } from '../src/inventory/inventory.js';
import { cards, RARITIES } from '../src/data/cards.js';
import { balance } from '../src/data/balance.js';
import { getUnlockedContent } from '../src/systems/unlocks.js';
import { createRng } from '../src/utils/rng.js';

for (const arg of process.argv.slice(2)) {
  const [path, value] = arg.split('=');
  const keys = path.split('.');
  const target = keys.slice(0, -1).reduce((obj, key) => obj[key], balance);
  target[keys.at(-1)] = JSON.parse(value);
}

const PLAYERS = 1000;
const MAX_DAYS = 240;
const TREE_COST = 13500; // spec 5.4
const packCards = cards.filter((c) => c.source === 'pack');

const ACTIVITY = {
  occasional: { loopsPerDay: 3, daysPerWeek: 4, adPacks: 1 },
  constant: { loopsPerDay: 8, daysPerWeek: 7, adPacks: 2 },
  intense: { loopsPerDay: 20, daysPerWeek: 7, adPacks: 4 },
};
const profiles = [];
for (const activity of Object.keys(ACTIVITY)) for (const ads of [true, false]) for (const pass of [false, true]) profiles.push({ activity, ads, pass });

const normal = (rng, mean, sd) => mean + sd * Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());

// A plausible loop for the player's level; better players and higher levels score a bit more.
function playLoop(rng, save, id) {
  const level = save.player.level;
  const score = Math.max(200, Math.round(normal(rng, 1300 + level * 25, 400)));
  const ordersServed = Math.max(0, Math.round(normal(rng, 5.5 + level * 0.05, 2)));
  const secrets = getUnlockedContent(level).recipes.filter((r) => ['bacon_crown', 'impossible_omelette', 'mystic_scramble'].includes(r));
  const discovered = secrets.filter((r) => !save.recipes[r]?.discovered && rng.next() < 0.04);
  return {
    loopId: `sim-${id}`,
    score,
    ordersServed,
    orderCoins: ordersServed * balance.coinsPerOrder,
    bestCombo: 1 + Math.floor(rng.next() * 8),
    servedTypes: [],
    feverCount: rng.next() < 0.25 ? (rng.next() < 0.1 ? 2 : 1) : 0,
    emptyGridAtEnd: rng.next() < 0.01,
    endReason: 'time',
    cookedCounts: { bacon_egg: 2, tomato_toast: 2, triple_bacon: level >= 2 && rng.next() < 0.03 ? 3 : 1 },
    discovered,
  };
}

// Crafts the rarest missing pack card the player can afford.
function craftWhatYouCan(save, now) {
  for (const rarity of [...RARITIES].reverse()) {
    const missing = packCards.find((c) => c.rarity === rarity && !save.cards[c.id]);
    if (missing && save.fragments >= balance.craftCost[rarity]) craftCard(save, missing.id, now);
  }
}

function simulate(profile, seed) {
  const rng = createRng(seed);
  const save = createDefaultSave(0);
  const habit = ACTIVITY[profile.activity];
  let loopId = 0;
  const done = { album: null, tree: null, level10: null };
  let coinsEarned = 0;
  for (let day = 1; day <= MAX_DAYS; day++) {
    if ((day - 1) % 7 >= habit.daysPerWeek) continue;
    const now = day * 86400000;
    claimCalendar(save, rng, `d${day}`, now);
    for (let i = 0; i < habit.loopsPerDay; i++) {
      const before = save.coins;
      finalizeLoop(save, playLoop(rng, save, ++loopId), { rng, now });
      coinsEarned += save.coins - before;
    }
    const packs = (profile.ads ? habit.adPacks : 0) + (profile.pass ? 1 : 0);
    for (let i = 0; i < packs; i++) openPack(save, rng, now);
    while (takePack(save, 'standard')) openPack(save, rng, now);
    while (takePack(save, 'special')) openPack(save, rng, now, { special: true });
    craftWhatYouCan(save, now);
    if (!done.album && packCards.every((c) => save.cards[c.id])) done.album = day;
    if (!done.tree && coinsEarned >= TREE_COST) done.tree = day;
    if (!done.level10 && save.player.level >= 10) done.level10 = day;
    if (done.album && done.tree && done.level10) break;
  }
  return done;
}

const pct = (list, p) => {
  const sorted = list.filter((v) => v !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return '—';
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const weeks = (d) => (d === '—' ? '—' : `${d} d (${(d / 7).toFixed(1).replace('.', ',')} sem)`);

const rows = [];
let seed = 1;
for (const profile of profiles) {
  const runs = Array.from({ length: Math.round(PLAYERS / profiles.length) }, () => simulate(profile, seed++));
  const incomplete = runs.filter((r) => !r.album).length;
  rows.push({ profile, runs, incomplete });
}

const NAMES = { occasional: 'Ocasional', constant: 'Constante', intense: 'Intenso' };
const label = ({ activity, ads, pass }) => `${NAMES[activity]}${ads ? ' + anuncios' : ''}${pass ? ' + Pase' : ''}`;
console.log('# Informe de economía (simulación)\n');
console.log(`Generado con \`node scripts/simulateEconomy.js\`: ${PLAYERS.toLocaleString('es-ES')} jugadores, ${profiles.length} perfiles, hasta ${MAX_DAYS} días. Usa el código real de recompensas, sobres, calendario y fabricación.\n`);
console.log('Hábitos: ocasional = 3 loops/día, 4 días/semana, 1 sobre por anuncio; constante = 8 loops/día y 2 sobres por anuncio; intenso = 20 loops/día y 4 sobres por anuncio (máximo por la espera de 6 h). El Pase suma 1 sobre al día.\n');
console.log('Objetivos: cartas de sobre en 6–8 semanas para un jugador constante con anuncios (sección 4.10); árbol de Brûlée (13.500 monedas ganadas) en 4–6 semanas (sección 5.4); nivel 10 en unos 29 loops (sección 5.1).\n');
console.log('| Perfil | Álbum de sobres (mediana · p10–p90) | Sin completar en 240 d | Monedas del árbol (mediana) | Nivel 10 (mediana) |');
console.log('|---|---|---|---|---|');
for (const { profile, runs, incomplete } of rows) {
  const album = runs.map((r) => r.album);
  console.log(`| ${label(profile)} | ${weeks(pct(album, 50))} · ${pct(album, 10)}–${pct(album, 90)} d | ${incomplete} | ${weeks(pct(runs.map((r) => r.tree), 50))} | ${pct(runs.map((r) => r.level10), 50)} d |`);
}
