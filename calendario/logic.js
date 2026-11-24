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
  const total = Math.max(0, Math.min(h * 60 + m + minutes, 23 * 60 + 59));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Stable 31-bit integer id for a string (native notification ids must be ints). */
export function hashId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

const REMINDER_HOUR = '09:00';
const IAIOS_EVE_HOUR = '20:00';

/**
 * Alarms to schedule as phone notifications from `today` over `days` days.
 * All-day events ring at 09:00 on the reminder day; timed events on the same day ring 1 h before;
 * iaios days ring at 20:00 the evening before. `at` is local "YYYY-MM-DDTHH:MM".
 */
export function reminderSchedule(data, today, days) {
  const out = [];
  const end = addDays(today, days);
  for (const e of data.events) {
    if (e.remind === undefined || e.remind === null || e.remind === '' || e.remind < 0) continue;
    for (const k of occurrences(e, today, addDays(end, e.remind))) {
      const day = addDays(k, -e.remind);
      if (day > end) continue;
      let time = REMINDER_HOUR;
      if (e.remind === 0 && e.time) time = e.time >= '01:00' ? addMinutes(e.time, -60) : e.time;
      const left = e.remind;
      const when = left === 0 ? 'Hoy' : left === 1 ? 'Mañana' : `En ${left} días`;
      out.push({
        key: `e:${e.id}@${k}`,
        at: `${day}T${time}`,
        title: `${when}: ${e.title}`,
        body: [e.time, e.notes].filter(Boolean).join(' · '),
      });
    }
  }
  if (data.settings?.iaiosReminder) {
    for (const k of Object.keys(data.iaios)) {
      const eve = addDays(k, -1);
      if (eve < today || eve > end) continue;
      const i = data.iaios[k];
      out.push({
        key: `i:${k}`,
        at: `${eve}T${IAIOS_EVE_HOUR}`,
        title: 'Mañana las niñas van con los iaios',
        body: [i.sleep ? 'Duermen allí' : '', i.note].filter(Boolean).join(' · '),
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// ---------- compact labels ----------

/** "15:00" → "15", "13:30" → "13:30", "05:00" → "5". */
export function compactTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}:${m}`;
}

/** "15–23" for timed shifts, the name for the rest (Libre, Vacaciones…). */
export function shiftRange(s) {
  return s.start && s.end ? `${compactTime(s.start)}–${compactTime(s.end)}` : s.name;
}

const WD_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Jue 10 dic" */
export function shortDate(key) {
  const label = `${WD_SHORT[weekdayMon(key)]} ${Number(key.slice(8))} ${MONTH_SHORT[Number(key.slice(5, 7)) - 1]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---------- quick add ----------

const MONTHS = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4, mayo: 5, may: 5, junio: 6, jun: 6,
  julio: 7, jul: 7, agosto: 8, ago: 8, septiembre: 9, setiembre: 9, sept: 9, sep: 9, octubre: 10, oct: 10,
  noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};
const WEEKDAYS_ES = {
  lunes: 0, martes: 1, miércoles: 2, miercoles: 2, jueves: 3, viernes: 4, sábado: 5, sabado: 5, domingo: 6,
};
const B = '(?<![\\p{L}\\d])'; // word start, accent-aware
const E = '(?![\\p{L}\\d])'; // word end

/** Next date (from today, inclusive) that falls on day-of-month `d`. */
function nextDayOfMonth(today, d) {
  let [y, m] = today.split('-').map(Number);
  for (let i = 0; i < 13; i++) {
    const k = `${y}-${pad(m)}-${pad(d)}`;
    if (d <= daysInMonth(y, m - 1) && k >= today) return k;
    if (++m > 12) { m = 1; y++; }
  }
  return null;
}

const CAT_WORDS = [
  ['birthday', /cumple|santo\b|aniversario/i],
  ['doctor', /m[ée]dic|dentista|pediatra|hospital|vacuna|an[áa]lisis|revisi[óo]n|enfermer|fisio|oculista|ambulatorio|centro de salud/i],
  ['school', /\bcole|colegio|guarde|escuela|tutor[íi]a|excursi[óo]n|festival|funci[óo]n|reuni[óo]n.*(cole|clase)|extraescolar/i],
  ['family', /iaio|iaia|abuel|famil|comida|cena/i],
];

export function guessCategory(title) {
  return CAT_WORDS.find(([, re]) => re.test(title))?.[0] || 'important';
}

/**
 * Understands quick entries such as "15 dentista 11:00", "mañana cumple iaia",
 * "viernes 17:30 función del cole" or "22 dic evento cole". "por la mañana" is kept as text, not as tomorrow.
 * Returns { date, time, title, cat, dateFound }.
 */
export function parseQuick(text, today, defaultDate = today) {
  let s = ` ${text.trim()} `;
  let date = null;
  let time = '';
  const cut = (m) => { s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length); };
  const find = (re) => s.match(new RegExp(re, 'iu'));

  let m = find(`${B}(?:a\\s+las\\s+)?(\\d{1,2})[:.h](\\d{2})${E}`);
  if (m && Number(m[1]) < 24 && Number(m[2]) < 60) { time = `${pad(Number(m[1]))}:${m[2]}`; cut(m); }
  if (!time && (m = find(`${B}a\\s+las?\\s+(\\d{1,2})(?:\\s*h)?${E}`)) && Number(m[1]) < 24) { time = `${pad(Number(m[1]))}:00`; cut(m); }
  if (!time && (m = find(`${B}(\\d{1,2})\\s*h${E}`)) && Number(m[1]) < 24) { time = `${pad(Number(m[1]))}:00`; cut(m); }

  if ((m = find(`${B}pasado\\s+mañana${E}`))) { date = addDays(today, 2); cut(m); }
  else if ((m = find(`(?<!la\\s)${B}mañana${E}`))) { date = addDays(today, 1); cut(m); }
  else if ((m = find(`${B}hoy${E}`))) { date = today; cut(m); }

  if (!date && (m = find(`${B}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?${E}`))) {
    const d = Number(m[1]); const mo = Number(m[2]);
    let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(today.slice(0, 4));
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo - 1)) {
      let k = `${y}-${pad(mo)}-${pad(d)}`;
      if (!m[3] && k < today) k = `${++y}-${pad(mo)}-${pad(d)}`;
      date = k; cut(m);
    }
  }
  if (!date && (m = find(`${B}(?:el\\s+)?(?:día\\s+)?(\\d{1,2})\\s+(?:de\\s+)?(${Object.keys(MONTHS).join('|')})${E}`))) {
    const d = Number(m[1]); const mo = MONTHS[m[2].toLowerCase()];
    let y = Number(today.slice(0, 4));
    if (d >= 1 && d <= 31) {
      if (`${y}-${pad(mo)}-${pad(d)}` < today) y++;
      if (d <= daysInMonth(y, mo - 1)) { date = `${y}-${pad(mo)}-${pad(d)}`; cut(m); }
    }
  }
  if (!date && (m = find(`${B}(?:el\\s+)?(?:próximo\\s+|proximo\\s+)?(${Object.keys(WEEKDAYS_ES).join('|')})${E}`))) {
    const wd = WEEKDAYS_ES[m[1].toLowerCase()];
    date = addDays(today, (wd - weekdayMon(today) + 7) % 7); cut(m);
  }
  // A bare day number only counts at the start ("10 dentista") or after "el"/"día" ("el 10", "día 22").
  if (!date && (m = find(`^\\s*(?:el\\s+|día\\s+|dia\\s+)?(\\d{1,2})${E}`) || find(`${B}(?:el|día|dia)\\s+(\\d{1,2})${E}`))) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) { date = nextDayOfMonth(today, d); cut(m); }
  }

  const title = s.replace(/\s+/g, ' ').trim()
    .replace(/^(?:el|la|de|a|y|,|-)\s+/i, '').replace(/\s+(?:el|de|a|y|,|-)$/i, '').trim();
  const finalTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return { date: date || defaultDate, time, title: finalTitle, cat: guessCategory(finalTitle), dateFound: !!date };
}

// ---------- sticky reminders (Android) ----------

/**
 * Notifications that appear 2 days before (09:00) and cannot be dismissed until the event is over.
 * Timed events end at their end time (or 1 h after the start); all-day events at midnight;
 * nights with the iaios the next morning at 09:00.
 */
export function stickySchedule(data, today, days) {
  const st = data.settings || {};
  const out = [];
  const end = addDays(today, days);
  if (st.stickyEvents) {
    for (const e of data.events) {
      for (const k of occurrences(e, today, end)) {
        const until = e.time ? `${k}T${e.endTime && e.endTime > e.time ? e.endTime : addMinutes(e.time, 60)}` : `${addDays(k, 1)}T00:00`;
        out.push({
          key: `s:e:${e.id}@${k}`,
          at: `${addDays(k, -2)}T09:00`,
          until,
          title: `${shortDate(k)}${e.time ? ` · ${e.time}` : ''} — ${e.title}`,
          body: e.notes || 'Calendario familiar',
        });
      }
    }
  }
  if (st.stickyIaios) {
    for (const [k, i] of Object.entries(data.iaios)) {
      if (!i.sleep || k < today || k > end) continue;
      out.push({
        key: `s:i:${k}`,
        at: `${addDays(k, -2)}T09:00`,
        until: `${addDays(k, 1)}T09:00`,
        title: `${shortDate(k)} — Las niñas duermen con los iaios`,
        body: i.note || 'Calendario familiar',
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
