// How even the loops are (Daniel: "que sea equilibrado en cada partida"). The bot plays many loops at fixed levels
// and this prints, per level, the spread of the score and how often a loop goes wrong: few orders, lost customers,
// overflow, long waits for a missing ingredient, and how much of what the tray deals ends up unused.
// Usage: node scripts/simulateLoops.js [loops per level] [seed]   ·   BALANCE='{"orderBias":0.5}' to try values.
import { createEngine } from '../src/game/engine.js';
import { createBot } from './bot.js';
import { recipeById } from '../src/data/recipes.js';
import { balance } from '../src/data/balance.js';
import { getUnlockedContent } from '../src/systems/unlocks.js';
import { createRng } from '../src/utils/rng.js';

Object.assign(balance, JSON.parse(process.env.BALANCE ?? '{}'));
const LOOPS = Number(process.argv[2] ?? 300);
const rng = createRng(Number(process.argv[3] ?? 11));
const DT = 1 / 30;
const LEVELS = [1, 3, 4, 5, 7, 10];
const SKILLS = {
  skilled: { think: 0.9, jitter: 0.3, mistake: 0.05, fill: 0.6 },
  casual: { think: 1.5, jitter: 0.5, mistake: 0.15, fill: 0.75 },
};

function playLoop(level, skill) {
  const bot = createBot({ rng, skill });
  const known = getUnlockedContent(level, {})
    .recipes.map((id) => recipeById[id])
    .filter((r) => r.kind !== 'secret');
  let result = null;
  const engine = createEngine({ balance, level, seed: rng.int(1e9), onEnd: (r) => (result = r) });
  const arrived = new Map();
  const waits = [];
  let dealt = 0;
  let used = 0;
  let overflow = false;
  let nextAction = 0.6;
  while (!result && engine.state.time < 300) {
    engine.step(DT);
    const { state } = engine;
    if (state.status === 'overflow') {
      overflow = true;
      engine.finishOverflow();
    }
    for (const e of engine.drainEvents()) {
      if (e.type === 'customerArrived') arrived.set(e.customer.id, state.time);
      if (e.type === 'place') dealt += 1;
      if (e.type === 'cook') {
        used += e.cells?.length ?? recipeById[e.recipeId]?.ingredients.length ?? 0;
        const customer = state.customers.find((c) => c.slot === e.customerSlot);
        if (customer && arrived.has(customer.id)) waits.push(state.time - arrived.get(customer.id));
      }
    }
    if (state.status === 'playing' && state.time >= nextAction) {
      bot.act(engine, known, {}, {});
      nextAction = state.time + Math.max(0.15, skill.think + (rng.next() - 0.5) * 2 * skill.jitter);
    }
  }
  return { score: result.score, served: result.ordersServed, lost: result.customersLost, overflow, waits, dealt, used, bestCombo: result.bestCombo };
}

const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sd = (xs) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const f0 = (x) => Math.round(x).toString();
const f1 = (x) => x.toFixed(1);
const pc = (x) => `${Math.round(x * 100)} %`;

console.log(`# Loop balance — ${LOOPS} loops per level and skill\n`);
console.log(`Values: ${process.env.BALANCE ?? 'balance.js'}\n`);
console.log('| Skill | Level | Score (p10 · median · p90) | Spread (CV) | Weak loops | Served | Lost | Overflow | Wait p90 | Unused |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const [name, skill] of Object.entries(SKILLS)) {
  for (const level of LEVELS) {
    const runs = Array.from({ length: LOOPS }, () => playLoop(level, skill));
    const scores = runs.map((r) => r.score);
    const waits = runs.flatMap((r) => r.waits);
    const weak = runs.filter((r) => r.score < balance.weakLoopScore).length / LOOPS;
    const unused = 1 - mean(runs.map((r) => r.used)) / Math.max(1, mean(runs.map((r) => r.dealt)));
    console.log(
      `| ${name} | ${level} | ${f0(pct(scores, 0.1))} · ${f0(pct(scores, 0.5))} · ${f0(pct(scores, 0.9))} | ${sd(scores) / mean(scores) >= 0 ? f1((sd(scores) / mean(scores)) * 100) : '-'} % | ${pc(weak)} | ${f1(mean(runs.map((r) => r.served)))} | ${f1(mean(runs.map((r) => r.lost)))} | ${pc(mean(runs.map((r) => (r.overflow ? 1 : 0))))} | ${f1(pct(waits, 0.9))} s | ${pc(unused)} |`,
    );
  }
}
