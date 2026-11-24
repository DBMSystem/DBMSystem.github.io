import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../logic.js';

const data = () => ({
  people: [{ id: 'p1', name: 'Yo' }],
  shiftTypes: [
    { id: 'm', name: 'Mañana', short: 'M', start: '07:00', end: '15:00' },
    { id: 'n', name: 'Noche', short: 'N', start: '23:00', end: '07:00' },
  ],
  weekly: { p1: ['m', 'm', 'm', 'm', 'm', null, null] },
  shifts: { '2026-11-25': { p1: '-' }, '2026-11-28': { p1: 'n' } },
  iaios: { '2026-11-25': { sleep: true, note: 'x' } },
  events: [
    { id: 'b', title: 'Cumple, iaia', date: '2020-11-26', repeat: 'yearly', remind: 2, cat: 'birthday' },
    { id: 'd', title: 'Pediatra', date: '2026-11-27', time: '10:30', repeat: 'none', remind: 0 },
  ],
  settings: { iaiosReminder: true },
});

test('month grid starts on Monday and covers the month', () => {
  const g = L.monthGrid(2026, 10);
  assert.equal(g[0][0], '2026-10-26');
  assert.equal(g.length, 6);
  assert.equal(g.at(-1).at(-1), '2026-12-06');
});

test('repetitions', () => {
  assert.deepEqual(L.occurrences({ date: '2024-02-29', repeat: 'yearly' }, '2025-01-01', '2028-12-31'), ['2028-02-29']);
  assert.deepEqual(L.occurrences({ date: '2026-01-31', repeat: 'monthly' }, '2026-01-01', '2026-05-31'), ['2026-01-31', '2026-03-31', '2026-05-31']);
  assert.deepEqual(L.occurrences({ date: '2026-11-02', repeat: 'weekly' }, '2026-11-20', '2026-12-01'), ['2026-11-23', '2026-11-30']);
  assert.deepEqual(L.occurrences({ date: '2026-12-01', repeat: 'none' }, '2026-11-01', '2026-11-30'), []);
});

test('shifts: manual override wins over the weekly pattern', () => {
  const d = data();
  assert.equal(L.shiftIdFor(d, 'p1', '2026-11-24'), 'm');
  assert.equal(L.shiftIdFor(d, 'p1', '2026-11-25'), null);
  assert.equal(L.shiftIdFor(d, 'p1', '2026-11-28'), 'n');
  assert.equal(L.shiftIdFor(d, 'p1', '2026-11-29'), null);
});

test('reminders due today', () => {
  assert.deepEqual(L.dueReminders(data(), '2026-11-24').map((r) => r.id), ['i:2026-11-25', 'e:b@2026-11-26']);
});

test('phone notification schedule', () => {
  const s = L.reminderSchedule(data(), '2026-11-24', 30);
  assert.deepEqual(s.map((r) => [r.key, r.at]), [
    ['e:b@2026-11-26', '2026-11-24T09:00'],
    ['i:2026-11-25', '2026-11-24T20:00'],
    ['e:d@2026-11-27', '2026-11-27T09:30'],
  ]);
  assert.equal(s[0].title, 'En 2 días: Cumple, iaia');
  assert.ok(L.hashId('e:b@2026-11-26') > 0);
});

test('month summary', () => {
  assert.deepEqual(L.monthSummary(data(), 2026, 10), { iaios: 1, nights: 1, shifts: { p1: { m: 20, n: 1 } } });
});

test('ics export', () => {
  const ics = L.buildICS(data(), { fromK: '2026-11-24', toK: '2026-11-30', includeShifts: true, includeIaios: true });
  assert.match(ics, /SUMMARY:Cumple\\, iaia\r\n/);
  assert.match(ics, /RRULE:FREQ=YEARLY/);
  assert.match(ics, /TRIGGER:-PT39H/);
  assert.match(ics, /DTSTART:20261128T230000\r\nDTEND:20261129T070000/); // night shift ends next day
  assert.match(ics, /SUMMARY:Niñas con los iaios \(duermen allí\)/);
});
