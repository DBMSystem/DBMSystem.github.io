// Picks Pip's lines by trigger (spec 3.6): never one of the last `historySize` lines,
// at least `minInterval` seconds between lines unless the trigger has priority.
// `chapter`: the story chapter reached; lines with a later `fromChapter` do not exist yet (spec 6.3).
export const linesFor = (lines, chapter = 1) => lines.filter((line) => (line.fromChapter ?? 1) <= chapter);

export function createDialogue({ triggers, rng, minInterval, historySize, chapter = 1 }) {
  const history = [];
  let lastAt = -Infinity;

  function say(trigger, time) {
    const entry = triggers[trigger];
    if (!entry || (!entry.priority && time - lastAt < minInterval)) return null;
    const available = linesFor(entry.lines, chapter);
    const fresh = available.filter((line) => !history.includes(line.key));
    const line = rng.pick(fresh.length > 0 ? fresh : available);
    history.push(line.key);
    if (history.length > historySize) history.shift();
    lastAt = time;
    return { key: line.key, expression: entry.expression, at: time };
  }

  return { say };
}
