import { pipTriggers } from '../data/dialogues.js';
import { createDialogue } from './dialogue.js';
import { countOccupied } from '../game/grid.js';

const PASS_TRIGGERS = ['loopStart', 'cook', 'combo'];

// Turns loop events into Pip's lines (spec 3.6). `tips` = tip ids already seen (shown once ever).
// `pass`: with the Maestro Pass, some everyday lines become one of its 15 special lines.
// `chapter`: the story stage reached (systems/story.js storyStage), which unlocks lines (spec 6.3).
export function createPip({ engine, balance, rng, tips = new Set(), onTipSeen = () => {}, pass = false, chapter = 1 }) {
  const dialogue = createDialogue({ triggers: pipTriggers, rng, minInterval: balance.pipLineInterval, historySize: balance.dialogueHistory, chapter });
  let line = null;

  const say = (trigger) => {
    const special = pass && PASS_TRIGGERS.includes(trigger) && rng.next() < balance.passLineChance;
    const next = (special && dialogue.say('pass', engine.state.time)) || dialogue.say(trigger, engine.state.time);
    if (next) line = { ...next, duration: balance.pipLineDuration };
  };

  // Shows a specific line (tutorial) for `duration` seconds.
  const show = (key, expression, duration) => {
    line = { key, expression, at: engine.state.time, duration };
  };

  function triggerFor(event) {
    switch (event.type) {
      case 'cook':
        if (event.secretFound) return 'secret';
        if (event.customerSlot === null && !tips.has('counterSale')) {
          tips.add('counterSale');
          onTipSeen('counterSale');
          return 'counterSaleTip';
        }
        return event.chain >= 3 ? 'combo' : 'cook';
      case 'served':
        return event.justInTime ? 'closeCall' : null;
      case 'place':
        return countOccupied(engine.state.grid) >= balance.gridNearlyFullCells ? 'gridNearlyFull' : null;
      case 'perfect':
      case 'fever':
      case 'customerLeft':
      case 'burnt':
      case 'fullStove':
      case 'noRecipe':
      case 'overflow':
        return event.type;
      default:
        return null;
    }
  }

  function handle(events) {
    for (const event of events) {
      const trigger = triggerFor(event);
      if (trigger) say(trigger);
    }
  }

  // Current line while it is on screen, or null.
  const current = () => (line && engine.state.time - line.at < line.duration ? line : null);

  return { handle, say, show, current };
}

// Line for the results screen (spec 8.5): what really happened, the most remarkable thing first.
export function endTrigger(result, balance) {
  if (result.newRecord) return 'endRecord';
  if (result.endReason === 'overflow') return 'endOverflow';
  if (result.burntCount >= 2) return 'endBurnt';
  if (result.customersLost === 0 && result.ordersServed >= 6) return 'endNoLoss';
  if (result.feverCount >= 2) return 'endFever';
  return result.score < balance.weakLoopScore ? 'endWeak' : 'endNormal';
}
