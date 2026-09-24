// Analytics logger (spec 13.1): local counters and a console line in development.
// Never personal data: no player name, no free text.
const counters = {};
const DEV = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

export function track(event, props = {}) {
  counters[event] = (counters[event] ?? 0) + 1;
  if (DEV) console.info(`[analytics] ${event}`, props);
}

export const analyticsCounters = () => ({ ...counters });
