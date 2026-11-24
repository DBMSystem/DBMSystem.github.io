import {
  NO_SHIFT, addDays, buildICS, diffDays, dueReminders, eventsOn, fromKey, monthGrid,
  monthSummary, pad, shiftFor, todayKey, upcoming, weekdayMon,
} from './logic.js';

const STORAGE_KEY = 'calendario-familiar:v1';

const CATS = {
  important: { label: 'Importante', icon: '⭐' },
  birthday: { label: 'Cumpleaños', icon: '🎂' },
  doctor: { label: 'Médico', icon: '🩺' },
  school: { label: 'Cole', icon: '🎒' },
  family: { label: 'Familia', icon: '👨‍👩‍👧‍👧' },
  other: { label: 'Otro', icon: '📌' },
};

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function defaultData() {
  return {
    people: [
      { id: 'p1', name: 'Yo', color: '#2563eb' },
      { id: 'p2', name: 'Mi mujer', color: '#c026d3' },
    ],
    shiftTypes: [
      { id: 'm', name: 'Mañana', short: 'M', start: '07:00', end: '15:00', color: '#fcd34d' },
      { id: 't', name: 'Tarde', short: 'T', start: '15:00', end: '23:00', color: '#fdba74' },
      { id: 'n', name: 'Noche', short: 'N', start: '23:00', end: '07:00', color: '#818cf8' },
      { id: 'p', name: 'Partido', short: 'P', start: '09:00', end: '18:00', color: '#86efac' },
      { id: 'l', name: 'Libre', short: 'L', start: '', end: '', color: '#cbd5e1' },
      { id: 'v', name: 'Vacaciones', short: 'V', start: '', end: '', color: '#5eead4' },
    ],
    weekly: { p1: Array(7).fill(null), p2: Array(7).fill(null) },
    shifts: {},
    iaios: {},
    events: [],
    settings: { iaiosReminder: true },
    notified: {},
    seen: {},
  };
}

function load() {
  const base = defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* corrupted or unavailable storage: start fresh */ }
  return base;
}

function normalize(obj) {
  const base = defaultData();
  const data = { ...base, ...obj, settings: { ...base.settings, ...(obj.settings || {}) } };
  for (const p of data.people) if (!Array.isArray(data.weekly[p.id])) data.weekly[p.id] = Array(7).fill(null);
  return data;
}

let data = load();
const save = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { toast('No se ha podido guardar en este dispositivo'); }
};

const now = new Date();
const state = {
  year: now.getFullYear(),
  month: now.getMonth(),
  paint: { on: false, target: 'p1', value: 'm' },
  dayKey: null,
  editingEventId: null,
};

// ---------- helpers ----------

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => todayKey(new Date());
const personById = (id) => data.people.find((p) => p.id === id);

function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1b1b1b' : '#ffffff';
}

const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtShort = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function relDay(key) {
  const d = diffDays(today(), key);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  return cap(fmtShort.format(fromKey(key)));
}

function whenText(daysLeft) {
  if (daysLeft === 0) return 'Hoy';
  if (daysLeft === 1) return 'Mañana';
  return `En ${daysLeft} días`;
}

function shiftLabel(s) {
  return s.start && s.end ? `${s.name} (${s.start}–${s.end})` : s.name;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- main render ----------

function render() {
  const first = `${state.year}-${pad(state.month + 1)}-01`;
  $('#month-title').textContent = cap(fmtMonth.format(fromKey(first)));
  renderLegend();
  renderPaintBar();
  renderGrid();
  renderReminders();
  renderUpcoming();
  renderSummary();
}

function renderLegend() {
  $('#legend').innerHTML = data.people
    .map((p) => `<span class="legend-item"><i style="background:${esc(p.color)}"></i>${esc(p.name)}</span>`)
    .join('') + '<span class="legend-item"><i class="iaios-swatch"></i>Iaios</span>';
}

function renderGrid() {
  const t = today();
  const weeks = monthGrid(state.year, state.month);
  const monthPrefix = `${state.year}-${pad(state.month + 1)}`;
  $('#grid').innerHTML = weeks.flat().map((key) => {
    const inMonth = key.startsWith(monthPrefix);
    const iaios = data.iaios[key];
    const classes = ['cell', inMonth ? '' : 'out', key === t ? 'today' : '', iaios ? 'iaios' : ''].join(' ');
    const shifts = data.people.map((p) => {
      const s = shiftFor(data, p.id, key);
      if (!s) return '<span class="pill empty"></span>';
      const manual = data.shifts[key]?.[p.id] !== undefined;
      return `<span class="pill${manual ? ' manual' : ''}" style="background:${esc(s.color)};color:${textOn(s.color)};border-left-color:${esc(p.color)}" title="${esc(p.name)}: ${esc(shiftLabel(s))}">${esc(s.short)}</span>`;
    }).join('');
    const evs = eventsOn(data, key);
    const evHtml = evs.slice(0, 2).map((e) => `<span class="ev">${CATS[e.cat]?.icon || '📌'} ${esc(e.title)}</span>`).join('')
      + (evs.length > 2 ? `<span class="ev more">+${evs.length - 2}</span>` : '');
    return `<button class="${classes}" data-key="${key}" role="gridcell" aria-label="${esc(fmtLong.format(fromKey(key)))}">
      <span class="d-top"><span class="d-num">${Number(key.slice(8))}</span>${iaios ? `<span class="d-iaios">🏡${iaios.sleep ? '🌙' : ''}</span>` : ''}</span>
      <span class="d-shifts">${shifts}</span>
      <span class="d-evs">${evHtml}</span>
    </button>`;
  }).join('');
}

function renderReminders() {
  const t = today();
  const due = dueReminders(data, t).filter((r) => !data.seen[r.id]);
  $('#reminders').innerHTML = due.map((r) => {
    const title = r.event ? `${CATS[r.event.cat]?.icon || '📌'} ${esc(r.event.title)}${r.event.time ? ` · ${r.event.time}` : ''}`
      : `🏡 Las niñas van a casa de los iaios${r.iaios.sleep ? ' y duermen allí' : ''}`;
    const note = r.event?.notes || r.iaios?.note;
    return `<div class="reminder ${r.daysLeft === 0 ? 'now' : ''}">
      <div><strong>🔔 ${whenText(r.daysLeft)}</strong> · ${title}${note ? `<div class="hint">${esc(note)}</div>` : ''}</div>
      <button class="icon-btn small" data-seen="${esc(r.id)}" aria-label="Marcar como visto">✓</button>
    </div>`;
  }).join('');
}

function renderUpcoming() {
  const items = upcoming(data, today(), 30);
  if (!items.length) {
    $('#upcoming').innerHTML = '<li class="empty-msg">Nada en los próximos 30 días. Toca un día del calendario o «＋ Evento» para añadir algo.</li>';
    return;
  }
  $('#upcoming').innerHTML = items.map((it) => {
    if (it.kind === 'iaios') {
      return `<li><button class="item" data-day="${it.key}"><span class="when">${relDay(it.key)}</span>
        <span class="what">🏡 Niñas con los iaios${it.info.sleep ? ' 🌙' : ''}${it.info.note ? `<small>${esc(it.info.note)}</small>` : ''}</span></button></li>`;
    }
    const e = it.event;
    return `<li><button class="item" data-event="${esc(e.id)}" data-occ="${it.key}"><span class="when">${relDay(it.key)}${e.time ? `<small>${e.time}</small>` : ''}</span>
      <span class="what">${CATS[e.cat]?.icon || '📌'} ${esc(e.title)}${e.notes ? `<small>${esc(e.notes)}</small>` : ''}</span></button></li>`;
  }).join('');
}

function renderSummary() {
  const s = monthSummary(data, state.year, state.month);
  const people = data.people.map((p) => {
    const parts = data.shiftTypes
      .filter((st) => s.shifts[p.id][st.id])
      .map((st) => `<span class="pill inline" style="background:${esc(st.color)};color:${textOn(st.color)}">${esc(st.short)}</span> ${s.shifts[p.id][st.id]}`);
    return `<p><strong style="color:${esc(p.color)}">${esc(p.name)}:</strong> ${parts.join(' · ') || '<span class="hint">sin horarios este mes</span>'}</p>`;
  }).join('');
  $('#summary').innerHTML = `<p>🏡 Días con los iaios: <strong>${s.iaios}</strong>${s.nights ? ` (${s.nights} ${s.nights === 1 ? 'noche' : 'noches'})` : ''}</p>${people}`;
}

// ---------- paint mode ----------

function renderPaintBar() {
  const bar = $('#paint-bar');
  bar.hidden = !state.paint.on;
  $('#toggle-paint').setAttribute('aria-pressed', String(state.paint.on));
  $('#toggle-paint').classList.toggle('primary', state.paint.on);
  $('#grid').classList.toggle('painting', state.paint.on);
  if (!state.paint.on) return;
  const targets = [...data.people.map((p) => ({ id: p.id, label: p.name })), { id: 'iaios', label: '🏡 Iaios' }];
  $('#paint-target').innerHTML = targets
    .map((t) => `<button type="button" data-target="${esc(t.id)}" class="${state.paint.target === t.id ? 'on' : ''}">${esc(t.label)}</button>`).join('');
  if (state.paint.target === 'iaios') {
    $('#paint-values').innerHTML = '';
    $('#paint-hint').textContent = 'Toca o arrastra por los días en que las niñas se quedan con los iaios. Toca otra vez para quitarlo.';
    return;
  }
  const values = [
    ...data.shiftTypes.map((s) => ({ id: s.id, label: s.name, color: s.color })),
    { id: NO_SHIFT, label: 'Sin turno', color: '' },
    { id: 'default', label: 'Habitual', color: '' },
  ];
  $('#paint-values').innerHTML = values.map((v) => `<button type="button" data-value="${esc(v.id)}" class="chip ${state.paint.value === v.id ? 'on' : ''}"
    ${v.color ? `style="--chip:${esc(v.color)};--chip-fg:${textOn(v.color)}"` : ''}>${esc(v.label)}</button>`).join('');
  const who = personById(state.paint.target)?.name || '';
  $('#paint-hint').textContent = `Toca o arrastra por los días para poner el horario de ${who}. «Habitual» vuelve al horario semanal.`;
}

/** Decides from the first cell whether a drag sets or clears, then applies the same action to every cell. */
function paintAction(key) {
  const { target, value } = state.paint;
  if (target === 'iaios') return data.iaios[key] ? 'clear' : 'set';
  if (value === 'default') return 'clear';
  return data.shifts[key]?.[target] === value ? 'clear' : 'set';
}

function applyPaint(key, action) {
  const { target, value } = state.paint;
  if (target === 'iaios') {
    if (action === 'set') data.iaios[key] = data.iaios[key] || { sleep: false, note: '' };
    else delete data.iaios[key];
    return;
  }
  if (action === 'set') {
    data.shifts[key] = { ...(data.shifts[key] || {}), [target]: value };
  } else if (data.shifts[key]) {
    delete data.shifts[key][target];
    if (!Object.keys(data.shifts[key]).length) delete data.shifts[key];
  }
}

let drag = null;
function cellFromPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest('.cell');
}

$('#grid').addEventListener('pointerdown', (ev) => {
  const cell = ev.target.closest('.cell');
  if (!cell || !state.paint.on) return;
  ev.preventDefault();
  const key = cell.dataset.key;
  drag = { action: paintAction(key), visited: new Set([key]) };
  applyPaint(key, drag.action);
  renderGrid();
});
window.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const cell = cellFromPoint(ev.clientX, ev.clientY);
  if (!cell || drag.visited.has(cell.dataset.key)) return;
  drag.visited.add(cell.dataset.key);
  applyPaint(cell.dataset.key, drag.action);
  renderGrid();
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  save();
  render();
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

$('#grid').addEventListener('click', (ev) => {
  const cell = ev.target.closest('.cell');
  if (!cell || state.paint.on) return;
  openDay(cell.dataset.key);
});

$('#paint-bar').addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-target]');
  const v = ev.target.closest('[data-value]');
  if (t) state.paint.target = t.dataset.target;
  if (v) state.paint.value = v.dataset.value;
  if (t || v) renderPaintBar();
});

$('#toggle-paint').addEventListener('click', () => {
  state.paint.on = !state.paint.on;
  renderPaintBar();
});

// ---------- navigation ----------

function shiftMonth(delta) {
  const d = new Date(Date.UTC(state.year, state.month + delta, 1));
  state.year = d.getUTCFullYear();
  state.month = d.getUTCMonth();
  render();
}
$('#prev').addEventListener('click', () => shiftMonth(-1));
$('#next').addEventListener('click', () => shiftMonth(1));
$('#month-title').addEventListener('click', () => {
  const n = new Date();
  state.year = n.getFullYear();
  state.month = n.getMonth();
  render();
});

// Swipe left/right on the calendar to change month (not while painting).
let swipe = null;
$('#grid').addEventListener('touchstart', (e) => {
  if (!state.paint.on) swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
$('#grid').addEventListener('touchend', (e) => {
  if (!swipe) return;
  const dx = e.changedTouches[0].clientX - swipe.x;
  const dy = e.changedTouches[0].clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1);
});

$('#reminders').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-seen]');
  if (!b) return;
  data.seen[b.dataset.seen] = today();
  save();
  renderReminders();
});

$('#upcoming').addEventListener('click', (ev) => {
  const day = ev.target.closest('[data-day]');
  const evb = ev.target.closest('[data-event]');
  if (day) openDay(day.dataset.day);
  if (evb) openEvent(evb.dataset.event);
});

// ---------- day sheet ----------

function openDay(key) {
  state.dayKey = key;
  renderDay();
  $('#day-dialog').showModal();
}

function renderDay() {
  const key = state.dayKey;
  $('#day-title').textContent = cap(fmtLong.format(fromKey(key)));
  $('#day-shifts').innerHTML = data.people.map((p) => {
    const override = data.shifts[key]?.[p.id];
    const weeklyId = data.weekly[p.id]?.[weekdayMon(key)];
    const weeklyType = data.shiftTypes.find((s) => s.id === weeklyId);
    const current = override === undefined ? 'default' : override;
    const opts = [
      `<option value="default">Habitual${weeklyType ? ` (${esc(weeklyType.name)})` : ' (sin turno)'}</option>`,
      ...data.shiftTypes.map((s) => `<option value="${esc(s.id)}">${esc(shiftLabel(s))}</option>`),
      `<option value="${NO_SHIFT}">Sin turno</option>`,
    ].join('');
    return `<label class="person-row"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}
      <select data-person="${esc(p.id)}">${opts.replace(`value="${esc(current)}"`, `value="${esc(current)}" selected`)}</select></label>`;
  }).join('');
  const ia = data.iaios[key];
  $('#day-iaios').checked = !!ia;
  $('#day-iaios-extra').hidden = !ia;
  $('#day-iaios-sleep').checked = !!ia?.sleep;
  $('#day-iaios-note').value = ia?.note || '';
  const evs = eventsOn(data, key);
  $('#day-events').innerHTML = evs.length
    ? evs.map((e) => `<li><button type="button" class="item" data-event="${esc(e.id)}"><span class="when">${e.time || 'Todo el día'}</span>
        <span class="what">${CATS[e.cat]?.icon || '📌'} ${esc(e.title)}${e.repeat !== 'none' ? ' 🔁' : ''}${e.notes ? `<small>${esc(e.notes)}</small>` : ''}</span></button></li>`).join('')
    : '<li class="empty-msg">Sin eventos.</li>';
}

$('#day-shifts').addEventListener('change', (ev) => {
  const sel = ev.target.closest('select[data-person]');
  if (!sel) return;
  const key = state.dayKey;
  const pid = sel.dataset.person;
  if (sel.value === 'default') {
    if (data.shifts[key]) {
      delete data.shifts[key][pid];
      if (!Object.keys(data.shifts[key]).length) delete data.shifts[key];
    }
  } else {
    data.shifts[key] = { ...(data.shifts[key] || {}), [pid]: sel.value };
  }
  save();
  render();
});

$('#day-iaios').addEventListener('change', (ev) => {
  const key = state.dayKey;
  if (ev.target.checked) data.iaios[key] = data.iaios[key] || { sleep: false, note: '' };
  else delete data.iaios[key];
  save();
  renderDay();
  render();
});
$('#day-iaios-sleep').addEventListener('change', (ev) => {
  const ia = data.iaios[state.dayKey];
  if (!ia) return;
  ia.sleep = ev.target.checked;
  save();
  render();
});
$('#day-iaios-note').addEventListener('input', (ev) => {
  const ia = data.iaios[state.dayKey];
  if (!ia) return;
  ia.note = ev.target.value;
  save();
  render();
});
$('#day-events').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-event]');
  if (b) openEvent(b.dataset.event);
});
$('#day-add-event').addEventListener('click', () => openEvent(null, state.dayKey));

// ---------- event editor ----------

const eventForm = $('#event-form');
eventForm.elements.cat.innerHTML = Object.entries(CATS).map(([id, c]) => `<option value="${id}">${c.icon} ${c.label}</option>`).join('');

function openEvent(id, dateKey) {
  const e = id ? data.events.find((x) => x.id === id) : null;
  state.editingEventId = e?.id || null;
  $('#event-dialog-title').textContent = e ? 'Editar evento' : 'Nuevo evento';
  $('#event-delete').hidden = !e;
  const f = eventForm.elements;
  f.title.value = e?.title || '';
  f.date.value = e?.date || dateKey || today();
  f.time.value = e?.time || '';
  f.endTime.value = e?.endTime || '';
  f.cat.value = e?.cat || 'important';
  f.repeat.value = e?.repeat || 'none';
  f.remind.value = String(e?.remind ?? 1);
  f.notes.value = e?.notes || '';
  $('#event-dialog').showModal();
  if (!e) f.title.focus();
}

// Suggest the yearly repetition when a birthday is chosen for a new event.
eventForm.elements.cat.addEventListener('change', (ev) => {
  if (!state.editingEventId && ev.target.value === 'birthday') eventForm.elements.repeat.value = 'yearly';
});

eventForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const f = eventForm.elements;
  const title = f.title.value.trim();
  if (!title || !f.date.value) return;
  const ev2 = {
    id: state.editingEventId || uid(),
    title,
    date: f.date.value,
    time: f.time.value,
    endTime: f.time.value ? f.endTime.value : '',
    cat: f.cat.value,
    repeat: f.repeat.value,
    remind: Number(f.remind.value),
    notes: f.notes.value.trim(),
  };
  const i = data.events.findIndex((x) => x.id === ev2.id);
  if (i >= 0) data.events[i] = ev2;
  else data.events.push(ev2);
  save();
  $('#event-dialog').close();
  if ($('#day-dialog').open) renderDay();
  render();
  toast('Evento guardado');
  checkNotifications();
});

$('#event-delete').addEventListener('click', () => {
  const e = data.events.find((x) => x.id === state.editingEventId);
  if (!e || !confirm(`¿Borrar «${e.title}»${e.repeat !== 'none' ? ' y todas sus repeticiones' : ''}?`)) return;
  data.events = data.events.filter((x) => x.id !== e.id);
  save();
  $('#event-dialog').close();
  if ($('#day-dialog').open) renderDay();
  render();
  toast('Evento borrado');
});

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$('#add-event').addEventListener('click', () => openEvent(null));

// Close sheets when tapping the backdrop.
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (ev) => {
  if (ev.target === d) d.close();
}));

// ---------- settings ----------

function renderSettings() {
  $('#set-people').innerHTML = data.people.map((p) => `<div class="set-row">
      <input type="color" data-pcolor="${esc(p.id)}" value="${esc(p.color)}" aria-label="Color">
      <input type="text" data-pname="${esc(p.id)}" value="${esc(p.name)}" maxlength="20" aria-label="Nombre">
    </div>`).join('');

  $('#set-shifts').innerHTML = data.shiftTypes.map((s) => `<div class="shift-row" data-shift="${esc(s.id)}">
      <input type="color" data-f="color" value="${esc(s.color)}" aria-label="Color">
      <input type="text" data-f="name" value="${esc(s.name)}" maxlength="16" aria-label="Nombre">
      <input type="text" data-f="short" value="${esc(s.short)}" maxlength="2" aria-label="Letra">
      <button type="button" class="icon-btn small" data-del-shift="${esc(s.id)}" aria-label="Borrar ${esc(s.name)}">🗑</button>
      <span class="times">De <input type="time" data-f="start" value="${esc(s.start)}" aria-label="Entrada">
        a <input type="time" data-f="end" value="${esc(s.end)}" aria-label="Salida"></span>
    </div>`).join('');

  $('#set-weekly').innerHTML = data.people.map((p) => `<div class="weekly">
      <div class="weekly-name"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</div>
      <div class="weekly-days">${WEEKDAYS.map((w, i) => {
        const cur = data.weekly[p.id][i] || '';
        return `<label><span>${w}</span><select data-weekly="${esc(p.id)}" data-wd="${i}">
          <option value="">—</option>${data.shiftTypes.map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}
        </select></label>`;
      }).join('')}</div>
    </div>`).join('');

  $('#set-iaios-reminder').checked = !!data.settings.iaiosReminder;
  renderNotifStatus();
}

function renderNotifStatus() {
  const supported = 'Notification' in window;
  const perm = supported ? Notification.permission : 'unsupported';
  const msg = {
    granted: '✅ Avisos activados en este dispositivo. Saltan al abrir la app (o si está abierta en segundo plano). Para alarmas aunque la app esté cerrada, usa también «Descargar .ics».',
    denied: '⛔ Los avisos están bloqueados en el navegador. Actívalos en los ajustes del navegador para esta web.',
    default: 'Los avisos aparecen arriba del calendario. Si los activas, también te llegará una notificación al abrir la app.',
    unsupported: 'Este navegador no permite notificaciones. Los avisos aparecen arriba del calendario; para alarmas usa «Descargar .ics».',
  }[perm];
  $('#notif-status').textContent = msg;
  $('#enable-notif').hidden = perm !== 'default';
}

$('#open-settings').addEventListener('click', () => {
  renderSettings();
  $('#settings-dialog').showModal();
});

$('#settings-dialog').addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.pname) personById(t.dataset.pname).name = t.value.trim() || 'Sin nombre';
  else if (t.dataset.pcolor) personById(t.dataset.pcolor).color = t.value;
  else if (t.dataset.f) {
    const s = data.shiftTypes.find((x) => x.id === t.closest('[data-shift]').dataset.shift);
    s[t.dataset.f] = t.dataset.f === 'short' ? t.value.toUpperCase() : t.value;
  } else if (t.dataset.weekly) data.weekly[t.dataset.weekly][Number(t.dataset.wd)] = t.value || null;
  else if (t.id === 'set-iaios-reminder') data.settings.iaiosReminder = t.checked;
  else return;
  save();
  render();
});
// Weekly selects show the short letter, so refresh them when names/letters change.
$('#settings-dialog').addEventListener('change', (ev) => {
  if (ev.target.dataset.f === 'short' || ev.target.dataset.pname) renderSettings();
});

$('#set-shifts').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-del-shift]');
  if (!b) return;
  const id = b.dataset.delShift;
  const s = data.shiftTypes.find((x) => x.id === id);
  if (!confirm(`¿Borrar el tipo de turno «${s.name}»? Se quitará de todos los días donde esté puesto.`)) return;
  data.shiftTypes = data.shiftTypes.filter((x) => x.id !== id);
  for (const pid of Object.keys(data.weekly)) data.weekly[pid] = data.weekly[pid].map((v) => (v === id ? null : v));
  for (const [k, day] of Object.entries(data.shifts)) {
    for (const pid of Object.keys(day)) if (day[pid] === id) delete day[pid];
    if (!Object.keys(day).length) delete data.shifts[k];
  }
  if (state.paint.value === id) state.paint.value = data.shiftTypes[0]?.id || 'default';
  save();
  renderSettings();
  render();
});

$('#add-shift').addEventListener('click', () => {
  data.shiftTypes.push({ id: uid(), name: 'Nuevo', short: 'X', start: '08:00', end: '16:00', color: '#f9a8d4' });
  save();
  renderSettings();
  render();
});

$('#enable-notif').addEventListener('click', async () => {
  const perm = await Notification.requestPermission();
  renderNotifStatus();
  if (perm === 'granted') {
    toast('Avisos activados');
    checkNotifications();
  }
});

// ---------- export / import ----------

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#export-ics').addEventListener('click', () => {
  const months = Number($('#ics-months').value);
  const fromK = `${state.year}-${pad(state.month + 1)}-01`;
  const end = new Date(Date.UTC(state.year, state.month + months, 0));
  const toK = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = buildICS(data, { fromK, toK, includeShifts: $('#ics-shifts').checked, includeIaios: $('#ics-iaios').checked, stamp });
  download(`calendario-familiar-${fromK.slice(0, 7)}.ics`, ics, 'text/calendar');
  toast('Archivo .ics descargado: ábrelo para añadirlo al calendario');
});

$('#export-json').addEventListener('click', async () => {
  const { notified, seen, ...rest } = data;
  const json = JSON.stringify(rest, null, 1);
  const name = `calendario-familiar-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Calendario familiar' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  download(name, json, 'application/json');
  toast('Copia descargada');
});

$('#import-json').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    if (!Array.isArray(obj.events) || !Array.isArray(obj.people) || typeof obj.iaios !== 'object') throw new Error('bad');
    if (!confirm('Se sustituirán los datos de este dispositivo por los de la copia. ¿Seguir?')) return;
    data = normalize({ ...obj, notified: data.notified, seen: data.seen });
    save();
    renderSettings();
    render();
    toast('Copia cargada');
  } catch {
    toast('Ese archivo no es una copia válida del calendario');
  }
});

$('#reset-all').addEventListener('click', () => {
  if (!confirm('¿Borrar todos los eventos, horarios y días de los iaios de este dispositivo? No se puede deshacer.')) return;
  data = defaultData();
  save();
  renderSettings();
  render();
  toast('Datos borrados');
});

// ---------- notifications ----------

async function notify(title, body, tag) {
  const opts = { body, tag, icon: 'icon.svg', badge: 'icon.svg' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  } catch { /* fall back below */ }
  new Notification(title, opts);
}

function checkNotifications() {
  const t = today();
  // Forget tracking entries of past days so storage stays small.
  for (const store of [data.notified, data.seen]) {
    for (const [id, day] of Object.entries(store)) if (day < addDays(t, -2)) delete store[id];
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return save();
  for (const r of dueReminders(data, t)) {
    if (data.notified[r.id]) continue;
    data.notified[r.id] = t;
    if (r.event) {
      const e = r.event;
      notify(`${CATS[e.cat]?.icon || '📌'} ${whenText(r.daysLeft)}: ${e.title}`, [e.time, e.notes].filter(Boolean).join(' · '), r.id);
    } else {
      notify(`🏡 ${whenText(r.daysLeft)} las niñas van con los iaios`, [r.iaios.sleep ? 'Duermen allí' : '', r.iaios.note].filter(Boolean).join(' · '), r.id);
    }
  }
  save();
}

// Re-render when the day changes (app left open overnight) and re-check reminders.
let lastDay = today();
function tick() {
  if (today() !== lastDay) {
    lastDay = today();
    render();
  }
  checkNotifications();
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tick();
});

// Keep tabs in sync if the app is open twice.
window.addEventListener('storage', (ev) => {
  if (ev.key === STORAGE_KEY) {
    data = load();
    render();
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

render();
checkNotifications();
