// Local calendar date as YYYY-MM-DD (daily caps and calendar use local dates).
export function localDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "Now" for cooldowns, daily caps and the calendar: if the clock went back more than the tolerance,
// the last time seen is used until real time catches up (spec 11.4).
export function effectiveNow(save, now, toleranceSeconds) {
  return now < save.lastSeenTimestamp - toleranceSeconds * 1000 ? save.lastSeenTimestamp : now;
}
