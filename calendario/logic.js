// Pure calendar logic: no DOM. Dates are handled as "YYYY-MM-DD" keys in UTC to avoid DST surprises.

export const pad = (n) => String(n).padStart(2, '0');

export function toKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

export function diffDays(fromK, toK) {
  return Math.round((fromKey(toK) - fromKey(fromK)) / 86400000);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon(key) {
  return (fromKey(key).getUTCDay() + 6) % 7;
}

export function daysInMonth(year, month0) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Weeks (Monday first) covering the month; each day is a key. */
export function monthGrid(year, month0) {
  const first = `${year}-${pad(month0 + 1)}-01`;
  let cursor = addDays(first, -weekdayMon(first));
  const last = `${year}-${pad(month0 + 1)}-${pad(daysInMonth(year, month0))}`;
  const weeks = [];
  while (cursor <= last) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export const NO_SHIFT = '-';

/** Shift type id for a person on a day: per-day override first, then weekly pattern. null = nothing. */
export function shiftIdFor(data, personId, key) {
  const override = data.shifts[key]?.[personId];
  if (override !== undefined) return override === NO_SHIFT ? null : override;
  return data.weekly?.[personId]?.[weekdayMon(key)] || null;
}

export function shiftFor(data, personId, key) {
  const id = shiftIdFor(data, personId, key);
  return id ? data.shiftTypes.find((s) => s.id === id) || null : null;
}

/** All occurrence keys of an event between fromK and toK (inclusive). */
export function occurrences(event, fromK, toK) {
  const out = [];
  const start = event.date;
  if (start > toK) return out;
  const repeat = event.repeat || 'none';
  if (repeat === 'none') {
    if (start >= fromK) out.push(start);
    return out;
  }
  if (repeat === 'weekly') {
    let k = start;
    if (k < fromK) k = addDays(k, Math.ceil(diffDays(k, fromK) / 7) * 7);
    for (; k <= toK; k = addDays(k, 7)) out.push(k);
    return out;
  }
  const [sy, sm, sd] = start.split('-').map(Number);
  const [fy, fm] = fromK.split('-').map(Number);
  const [ty, tm] = toK.split('-').map(Number);
  if (repeat === 'monthly') {
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++) {
      if (sd > daysInMonth(y, m - 1)) continue;
      const k = `${y}-${pad(m)}-${pad(sd)}`;
      if (k >= start && k >= fromK && k <= toK) out.push(k);
    }
    return out;
  }
  if (repeat === 'yearly') {
    for (let y = fy; y <= ty; y++) {
      if (sd > daysInMonth(y, sm - 1)) continue; // 29 Feb only on leap years
      const k = `${y}-${pad(sm)}-${pad(sd)}`;
      if (k >= start && k >= fromK && k <= toK) out.push(k);
    }
  }
  return out;
}

export function eventsOn(data, key) {
  return data.events
    .filter((e) => occurrences(e, key, key).length)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/** Upcoming items (events + iaios days) from today over `days` days, sorted. */
export function upcoming(data, today, days) {
  const end = addDays(today, days);
  const items = [];
  for (const e of data.events) {
    for (const k of occurrences(e, today, end)) items.push({ kind: 'event', key: k, event: e });
  }
  for (const k of Object.keys(data.iaios)) {
    if (k >= today && k <= end) items.push({ kind: 'iaios', key: k, info: data.iaios[k] });
  }
  return items.sort((a, b) => a.key.localeCompare(b.key) || (a.event?.time || '').localeCompare(b.event?.time || ''));
}

/** Reminders that should be showing today. Each has a stable id for "already notified" tracking. */
export function dueReminders(data, today) {
  const out = [];
  const horizon = addDays(today, 31);
  for (const e of data.events) {
    if (e.remind === undefined || e.remind === null || e.remind === '' || e.remind < 0) continue;
    for (const k of occurrences(e, today, horizon)) {
      const left = diffDays(today, k);
      if (left <= e.remind) out.push({ id: `e:${e.id}@${k}`, key: k, daysLeft: left, event: e });
    }
  }
  if (data.settings?.iaiosReminder) {
    const tomorrow = addDays(today, 1);
    for (const k of [today, tomorrow]) {
      if (data.iaios[k]) out.push({ id: `i:${k}`, key: k, daysLeft: diffDays(today, k), iaios: data.iaios[k] });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** Monthly counts: iaios days and shift days per person/type. */
export function monthSummary(data, year, month0) {
  const n = daysInMonth(year, month0);
  const summary = { iaios: 0, nights: 0, shifts: {} };
  for (const p of data.people) summary.shifts[p.id] = {};
  for (let d = 1; d <= n; d++) {
    const k = `${year}-${pad(month0 + 1)}-${pad(d)}`;
    if (data.iaios[k]) {
      summary.iaios++;
      if (data.iaios[k].sleep) summary.nights++;
    }
    for (const p of data.people) {
      const id = shiftIdFor(data, p.id, k);
      if (id) summary.shifts[p.id][id] = (summary.shifts[p.id][id] || 0) + 1;
    }
  }
  return summary;
}

// ---------- iCalendar export ----------

const icsEscape = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (key) => key.replace(/-/g, '');
const icsDateTime = (key, time) => `${icsDate(key)}T${time.replace(':', '')}00`;

function fold(line) {
  // RFC 5545: lines longer than 75 octets are folded. Approximate with characters.
  const parts = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

const RRULE = { weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };

/**
 * Builds an .ics file. Events are exported with their repetition and alarm; shifts and iaios days
 * are exported for [fromK, toK].
 */
export function buildICS(data, { fromK, toK, includeShifts, includeIaios, stamp }) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calendario familiar//ES', 'CALSCALE:GREGORIAN'];
  const dtstamp = stamp || '20260101T000000Z';
  const vevent = (uid, lines) => {
    L.push('BEGIN:VEVENT', `UID:${uid}@calendario-familiar`, `DTSTAMP:${dtstamp}`, ...lines, 'END:VEVENT');
  };
  const allDay = (key) => [`DTSTART;VALUE=DATE:${icsDate(key)}`, `DTEND;VALUE=DATE:${icsDate(addDays(key, 1))}`];

  for (const e of data.events) {
    const lines = [`SUMMARY:${icsEscape(e.title)}`];
    if (e.time) {
      const end = e.endTime && e.endTime > e.time ? e.endTime : addMinutes(e.time, 60);
      lines.push(`DTSTART:${icsDateTime(e.date, e.time)}`, `DTEND:${icsDateTime(e.date, end)}`);
    } else {
      lines.push(...allDay(e.date));
    }
    if (RRULE[e.repeat]) lines.push(`RRULE:${RRULE[e.repeat]}`);
    if (e.notes) lines.push(`DESCRIPTION:${icsEscape(e.notes)}`);
    if (e.remind >= 0 && e.remind !== '' && e.remind !== null && e.remind !== undefined) {
      // All-day: alarm at 09:00 that day. Timed: 1 h before (same day) or N days before.
      let trigger;
      if (e.time) trigger = e.remind ? `-P${e.remind}D` : '-PT1H';
      else trigger = e.remind ? `-PT${e.remind * 24 - 9}H` : 'PT9H';
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:${trigger}`, 'END:VALARM');
    }
    vevent(`ev-${e.id}`, lines);
  }

  for (let k = fromK; k <= toK; k = addDays(k, 1)) {
    if (includeIaios && data.iaios[k]) {
      const i = data.iaios[k];
      const title = `Niñas con los iaios${i.sleep ? ' (duermen allí)' : ''}`;
      const lines = [`SUMMARY:${icsEscape(title)}`, ...allDay(k)];
      if (i.note) lines.push(`DESCRIPTION:${icsEscape(i.note)}`);
      if (data.settings?.iaiosReminder) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(title)}`, 'TRIGGER:-PT4H', 'END:VALARM');
      }
      vevent(`iaios-${k}`, lines);
    }
    if (includeShifts) {
      for (const p of data.people) {
        const s = shiftFor(data, p.id, k);
        if (!s) continue;
        const lines = [`SUMMARY:${icsEscape(`${p.name}: ${s.name}`)}`];
        if (s.start && s.end) {
          const endKey = s.end <= s.start ? addDays(k, 1) : k;
          lines.push(`DTSTART:${icsDateTime(k, s.start)}`, `DTEND:${icsDateTime(endKey, s.end)}`);
        } else {
          lines.push(...allDay(k));
        }
        lines.push('TRANSP:TRANSPARENT');
        vevent(`shift-${p.id}-${k}`, lines);
      }
    }
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

export function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
