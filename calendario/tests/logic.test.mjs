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

test('quick add parser', () => {
  const t = '2026-11-24'; // Tuesday
  const p = (s) => { const r = L.parseQuick(s, t); return [r.date, r.time, r.title, r.cat]; };
  assert.deepEqual(p('15 dentista 11:00'), ['2026-12-15', '11:00', 'Dentista', 'doctor']);
  assert.deepEqual(p('revisión médica por la mañana el 4'), ['2026-12-04', '', 'Revisión médica por la mañana', 'doctor']);
  assert.deepEqual(p('mañana cumple de la iaia'), ['2026-11-25', '', 'Cumple de la iaia', 'birthday']);
  assert.deepEqual(p('viernes a las 17 función del cole'), ['2026-11-27', '17:00', 'Función del cole', 'school']);
  assert.deepEqual(p('22 dic evento cole'), ['2026-12-22', '', 'Evento cole', 'school']);
  assert.deepEqual(p('5/1 reyes'), ['2027-01-05', '', 'Reyes', 'important']);
  assert.deepEqual(p('llamar al seguro 9.30'), ['2026-11-24', '09:30', 'Llamar al seguro', 'important']);
  assert.equal(L.parseQuick('regalo', t).dateFound, false);
  assert.equal(L.parseQuick('el 24 cena familiar', t).date, '2026-11-24');
});

test('compact labels', () => {
  assert.equal(L.shiftRange({ start: '13:30', end: '22:00' }), '13:30–22');
  assert.equal(L.shiftRange({ start: '05:00', end: '13:15', name: 'x' }), '5–13:15');
  assert.equal(L.shiftRange({ start: '', end: '', name: 'Libre' }), 'Libre');
  assert.equal(L.shortDate('2026-12-10'), 'Jue 10 dic');
});

test('sticky reminders: 2 days before until the event is over', () => {
  const d = { ...data(), settings: { stickyEvents: true, stickyIaios: true } };
  const s = L.stickySchedule(d, '2026-11-24', 30);
  assert.deepEqual(s.map((x) => [x.key, x.at, x.until]), [
    ['s:i:2026-11-25', '2026-11-23T09:00', '2026-11-26T09:00'],
    ['s:e:b@2026-11-26', '2026-11-24T09:00', '2026-11-27T00:00'],
    ['s:e:d@2026-11-27', '2026-11-25T09:00', '2026-11-27T11:30'],
  ]);
  assert.equal(s[2].title, 'Vie 27 nov · 10:30 — Pediatra');
  assert.deepEqual(L.stickySchedule(data(), '2026-11-24', 30), []);
});
