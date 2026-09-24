// Picks Pip's lines by trigger (spec 3.6): never one of the last `historySize` lines,
// at least `minInterval` seconds between lines unless the trigger has priority.
export function createDialogue({ triggers, rng, minInterval, historySize }) {
  const history = [];
  let lastAt = -Infinity;

  function say(trigger, time) {
    const entry = triggers[trigger];
    if (!entry || (!entry.priority && time - lastAt < minInterval)) return null;
    const fresh = entry.lines.filter((line) => !history.includes(line.key));
    const line = rng.pick(fresh.length > 0 ? fresh : entry.lines);
    history.push(line.key);
    if (history.length > historySize) history.shift();
    lastAt = time;
    return { key: line.key, expression: entry.expression, at: time };
  }

  return { say };
}
