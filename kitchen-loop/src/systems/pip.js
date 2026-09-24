import { pipTriggers } from '../data/dialogues.js';
import { createDialogue } from './dialogue.js';
import { countOccupied } from '../game/grid.js';

// Turns loop events into Pip's lines (spec 3.6). `tips` = tip ids already seen (shown once ever).
export function createPip({ engine, balance, rng, tips = new Set(), onTipSeen = () => {} }) {
  const dialogue = createDialogue({ triggers: pipTriggers, rng, minInterval: balance.pipLineInterval, historySize: balance.dialogueHistory });
  let line = null;

  const say = (trigger) => {
    const next = dialogue.say(trigger, engine.state.time);
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
        if (event.patienceLeft !== null && event.patienceLeft < balance.closeCallPatience) return 'closeCall';
        return event.chain >= 3 ? 'combo' : 'cook';
      case 'place':
        return countOccupied(engine.state.grid) >= balance.gridNearlyFullCells ? 'gridNearlyFull' : null;
      case 'perfect':
      case 'fever':
      case 'customerLeft':
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

// Line for the results screen (spec 8.5).
export function endTrigger(result, balance) {
  if (result.newRecord) return 'endRecord';
  return result.score < balance.weakLoopScore ? 'endWeak' : 'endNormal';
}
