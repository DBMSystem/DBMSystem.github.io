import { recipeById } from '../../data/recipes.js';
import { customerById } from '../../data/customers.js';
import { t, formatNumber, formatDecimal } from '../../utils/i18n.js';
import { createParticles } from '../../systems/particles.js';
import { currentComboWindow } from '../combo.js';
import { TRAY_SLOTS } from '../engine.js';
import { computeLayout, cellRect, center } from './layout.js';
import { drawIngredient, drawSmooth, clearPlaceholderCache } from './placeholders.js';
import { getSprite } from '../../assets/manifest.js';

// View layer of a loop: draws the engine state on a canvas and turns engine events into feedback.
const COLORS = {
  bgTop: '#4a3326',
  bgBottom: '#2b1d14',
  cream: '#fff8e7',
  peach: '#ffcc80',
  orange: '#ff7043',
  purple: '#a78bfa',
  ink: '#3b2a20',
  muted: '#8a735f',
  cellA: '#fff8e7',
  cellB: '#fbe9cc',
  board: '#8d5a3b',
  boardEdge: '#5d3a26',
  glow: '#ffd54f',
  target: '#66bb6a',
  ok: '#66bb6a',
  warn: '#ffca28',
  bad: '#ef5350',
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FONT}`;

// Presentation timings (s), all under the limits of spec 9.3.
const POP_TIME = 0.15;
const WIGGLE_TIME = 0.25;
const ARRIVE_TIME = 0.25;
const RETURN_TIME = 0.15;
const TEXT_TIME = 0.8;
const BIG_TEXT_TIME = 1.2;
const SHAKE_TIME = 0.15;
const FLASH_TIME = 0.15;
const GLOW_JITTER_TIME = 0.2;
const LOW_TIME = 10;
const PORTRAIT = 44;
const TEXT_POOL = 24;
const FLYER_POOL = 32;

const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

export function createRenderer(canvas, engine, { balance, reducedMotion = false, showFps = false }) {
  const ctx = canvas.getContext('2d');
  const particles = createParticles(reducedMotion ? balance.maxParticlesReduced : balance.maxParticles);
  const bgLayer = document.createElement('canvas');
  const { state } = engine;
  let layout;
  let pixelScale = 1;

  const view = {
    time: 0,
    drag: null, // { slot, pointerId, startX, startY, x, y, active }
    selectedSlot: null,
    targetCell: -1,
    returning: null, // { slot, x, y, at }
    cellFx: new Map(), // cell → { type: 'pop' | 'wiggle', at }
    glowSince: new Map(),
    trayPopAt: Array(TRAY_SLOTS).fill(-1),
    customerSeen: new Map(),
    shakeAt: -1,
    flashAt: -10,
    perfectAt: -10,
    secretAt: -10,
    secretRecipe: null,
    comboPopAt: -10,
    fps: 60,
  };
  const texts = Array.from({ length: TEXT_POOL }, () => ({ alive: false }));
  const flyers = Array.from({ length: FLYER_POOL }, () => ({ alive: false }));

  function addText(text, x, y, { color = COLORS.cream, size = 16, duration = TEXT_TIME } = {}) {
    const slot = texts.find((item) => !item.alive) ?? texts[0];
    Object.assign(slot, { alive: true, text, x, y, color, size, at: view.time, duration });
  }

  function addFlyer(id, from, to) {
    const slot = flyers.find((item) => !item.alive);
    if (slot) Object.assign(slot, { alive: true, id, from, to, at: view.time });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    layout = computeLayout(rect.width, rect.height, state.grid.size, balance.maxCustomers, TRAY_SLOTS);
    pixelScale = dpr * layout.scale;
    clearPlaceholderCache();
    drawBackground();
  }

  const setTransform = (target) => {
    target.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    target.imageSmoothingEnabled = false;
  };

  // Static layer, redrawn only on resize (spec 10.7).
  function drawBackground() {
    bgLayer.width = canvas.width;
    bgLayer.height = canvas.height;
    const g = bgLayer.getContext('2d');
    setTransform(g);
    const gradient = g.createLinearGradient(0, 0, 0, layout.height);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(1, COLORS.bgBottom);
    g.fillStyle = gradient;
    g.fillRect(0, 0, layout.width, layout.height);

    for (const slot of layout.customers) {
      g.strokeStyle = 'rgba(255, 248, 231, 0.18)';
      g.setLineDash([6, 6]);
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(slot.x, slot.y, slot.w, slot.h, 10);
      g.stroke();
    }
    g.setLineDash([]);

    const { board, grid } = layout;
    g.fillStyle = COLORS.boardEdge;
    g.beginPath();
    g.roundRect(board.x, board.y + 4, board.w, board.h, 12);
    g.fill();
    g.fillStyle = COLORS.board;
    g.beginPath();
    g.roundRect(board.x, board.y, board.w, board.h, 12);
    g.fill();
    for (let i = 0; i < grid.size * grid.size; i++) {
      const r = cellRect(layout, i);
      const odd = (Math.floor(i / grid.size) + (i % grid.size)) % 2;
      g.fillStyle = odd ? COLORS.cellB : COLORS.cellA;
      g.beginPath();
      g.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 6);
      g.fill();
    }

    for (const r of layout.tray) {
      g.fillStyle = 'rgba(255, 248, 231, 0.12)';
      g.beginPath();
      g.roundRect(r.x, r.y, r.w, r.h, 12);
      g.fill();
    }
    const p = layout.preview;
    g.fillStyle = 'rgba(255, 248, 231, 0.06)';
    g.beginPath();
    g.roundRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 10);
    g.fill();
    g.font = font(600, 10);
    g.fillStyle = 'rgba(255, 248, 231, 0.55)';
    g.textAlign = 'center';
    g.fillText(t('hud.next'), p.x + p.w / 2, p.y + p.h + 16);
  }

  function customerCenter(slot) {
    return center(layout.customers[slot]);
  }

  function handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'place': {
          view.cellFx.set(e.cell, { type: 'pop', at: view.time });
          view.trayPopAt[e.slot] = view.time;
          const c = center(cellRect(layout, e.cell));
          particles.burst('crumb', c.x, c.y, 5);
          break;
        }
        case 'cook': {
          const rects = e.cells.map((i) => cellRect(layout, i));
          const mid = rects.map(center).reduce((a, b) => ({ x: a.x + b.x / rects.length, y: a.y + b.y / rects.length }), { x: 0, y: 0 });
          const to = e.customerSlot !== null ? customerCenter(e.customerSlot) : { x: layout.hud.x + layout.hud.w / 2, y: layout.hud.y + 24 };
          e.cells.forEach((cell, k) => {
            view.cellFx.delete(cell);
            addFlyer(e.ingredients[k], center(rects[k]), to);
          });
          particles.burst('spark', mid.x, mid.y, 14);
          particles.burst('steam', mid.x, mid.y, 4);
          const label = e.multiplier > 1 ? `+${formatNumber(e.points)}  x${formatDecimal(e.multiplier)}` : `+${formatNumber(e.points)}`;
          addText(label, mid.x, mid.y - 8, { color: COLORS.cream, size: 20 });
          if (e.customerSlot !== null) {
            const c = customerCenter(e.customerSlot);
            addText(t('fx.served'), c.x, c.y, { color: COLORS.ok, size: 15 });
          } else {
            addText(t('fx.counterSale'), mid.x, mid.y + 16, { color: COLORS.peach, size: 12 });
          }
          if (e.secretFound) {
            view.secretAt = view.time;
            view.secretRecipe = e.recipeId;
            particles.burst('star', mid.x, mid.y, 30);
          }
          if (e.chain >= 2) view.comboPopAt = view.time;
          if (!reducedMotion) view.shakeAt = view.time;
          break;
        }
        case 'noRecipe':
          view.cellFx.set(e.cell, { type: 'wiggle', at: view.time });
          break;
        case 'perfect': {
          view.perfectAt = view.time;
          if (!reducedMotion && view.time - view.flashAt >= balance.perfectFlashMinInterval) view.flashAt = view.time;
          const c = center(layout.board);
          particles.burst('star', c.x, c.y, 40);
          break;
        }
        case 'fever': {
          const { board } = layout;
          for (let k = 0; k < 4; k++) particles.burst('fire', board.x + (board.w * (k + 0.5)) / 4, board.y + board.h, 8);
          break;
        }
        case 'customerLeft': {
          const c = customerCenter(e.customer.slot);
          addText(t('fx.customerLeft'), c.x, c.y, { color: COLORS.muted, size: 13 });
          particles.burst('smoke', c.x, c.y, 10);
          break;
        }
        case 'customerArrived':
          view.customerSeen.set(e.customer.uid, view.time);
          break;
        case 'secondChance':
          for (const cell of e.cells) {
            const c = center(cellRect(layout, cell));
            particles.burst('smoke', c.x, c.y, 6);
          }
          addText(t('fx.secondChance', { s: balance.secondChanceTime }), layout.hud.x + 100, layout.hud.y + 60, { color: COLORS.ok, size: 18 });
          break;
        default:
      }
    }
  }

  function update(dt) {
    view.time += dt;
    view.fps = view.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
    particles.update(dt);
    for (const item of texts) if (item.alive && view.time - item.at > item.duration) item.alive = false;
    for (const item of flyers) if (item.alive && view.time - item.at > balance.cookDuration) item.alive = false;
    if (view.returning && view.time - view.returning.at > RETURN_TIME) view.returning = null;
  }

  // ---------- drawing ----------

  function roundRect(x, y, w, h, r, fill, stroke, lineWidth = 2) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function text(value, x, y, { size = 14, weight = 700, color = COLORS.cream, align = 'center', baseline = 'middle', outline = null } = {}) {
    ctx.font = font(weight, size);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (outline) {
      ctx.lineWidth = Math.max(3, size / 5);
      ctx.strokeStyle = outline;
      ctx.lineJoin = 'round';
      ctx.strokeText(value, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }

  function wrap(value, maxWidth, size, weight) {
    ctx.font = font(weight, size);
    const words = value.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
    return lines;
  }

  function drawHud() {
    const { hud, pause } = layout;
    roundRect(pause.x + 6, pause.y + 6, pause.w - 12, pause.h - 12, 8, 'rgba(255, 248, 231, 0.15)');
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(pause.x + 17, pause.y + 15, 4, 14);
    ctx.fillRect(pause.x + 25, pause.y + 15, 4, 14);

    const seconds = Math.ceil(state.timeLeft);
    const low = state.timeLeft <= LOW_TIME && state.status === 'playing';
    const pulse = low ? 1 + 0.08 * Math.sin(view.time * 10) : 1;
    const clockX = hud.x + 66;
    const cy = hud.y + 24;
    ctx.strokeStyle = low ? COLORS.bad : COLORS.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(clockX, cy, 8, 0, Math.PI * 2);
    ctx.moveTo(clockX, cy);
    ctx.lineTo(clockX, cy - 5);
    ctx.moveTo(clockX, cy);
    ctx.lineTo(clockX + 4, cy);
    ctx.stroke();
    text(String(seconds), clockX + 14, cy, { size: Math.round(22 * pulse), weight: 800, align: 'left', color: low ? COLORS.bad : COLORS.cream });

    text(formatNumber(state.score), hud.x + hud.w / 2 + 10, cy, { size: 24, weight: 800 });

    const { chain } = state.combo;
    if (chain >= 2) {
      const pop = 1 + 0.25 * (1 - ease((view.time - view.comboPopAt) / POP_TIME));
      const right = hud.x + hud.w - 12;
      text(t('hud.combo', { n: chain }), right, cy - 5, { size: Math.round(16 * pop), weight: 800, align: 'right', color: state.combo.fever.active ? COLORS.orange : COLORS.peach });
      const windowLeft = 1 - (state.time - state.combo.lastCookAt) / currentComboWindow(state.combo, balance);
      roundRect(right - 70, cy + 8, 70, 5, 2, 'rgba(255, 248, 231, 0.2)');
      roundRect(right - 70, cy + 8, 70 * Math.max(0, windowLeft), 5, 2, COLORS.peach);
    }
  }

  function drawCustomers() {
    for (const customer of state.customers) {
      const slot = layout.customers[customer.slot];
      const seen = view.customerSeen.get(customer.uid) ?? -10;
      const arrive = ease((view.time - seen) / ARRIVE_TIME);
      const { x, w, h } = slot;
      const y = slot.y - (1 - arrive) * 16;
      const ratio = Math.max(0, customer.patience / customer.maxPatience);
      const type = customerById[customer.typeId];
      const recipe = recipeById[customer.recipeId];

      ctx.globalAlpha = arrive;
      const urgent = ratio < 0.3;
      roundRect(x, y, w, h, 10, COLORS.cream, urgent ? COLORS.bad : COLORS.peach, urgent ? 3 : 2);

      const lines = wrap(t(`recipe.${recipe.id}`), w - 10, 11, 700).slice(0, 2);
      lines.forEach((line, k) => text(line, x + w / 2, y + 13 + k * 13, { size: 11, weight: 700, color: COLORS.ink }));

      const n = recipe.ingredients.length;
      const size = Math.min(26, (w - 12) / n - 2);
      const rowWidth = n * (size + 2) - 2;
      recipe.ingredients.forEach((id, k) => drawIngredient(ctx, id, x + (w - rowWidth) / 2 + k * (size + 2), y + 36, size, pixelScale));

      const portrait = { x: x + 3 + (urgent ? Math.sin(view.time * 30) * 1.5 : 0), y: y + h - PORTRAIT - 3 };
      const sprite = getSprite(`customers/${type.id}`);
      if (sprite) drawSmooth(ctx, sprite, portrait.x, portrait.y, PORTRAIT, PORTRAIT);
      else {
        ctx.fillStyle = type.color;
        ctx.beginPath();
        ctx.arc(portrait.x + PORTRAIT / 2, portrait.y + PORTRAIT / 2, PORTRAIT / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        text(t(`customer.${type.id}`).charAt(0), portrait.x + PORTRAIT / 2, portrait.y + PORTRAIT / 2 + 1, { size: 16, weight: 800 });
      }

      const barX = portrait.x + PORTRAIT + 2;
      const barW = x + w - 8 - barX;
      if (recipe.pattern !== 'group') text(t(`pattern.${recipe.pattern}`), barX + barW / 2, y + h - 30, { size: 10, weight: 600, color: COLORS.muted });
      roundRect(barX, y + h - 18, barW, 8, 4, '#eadbc4');
      const barColor = ratio > 0.6 ? COLORS.ok : ratio > 0.3 ? COLORS.warn : COLORS.bad;
      roundRect(barX, y + h - 18, Math.max(0, barW * ratio), 8, 4, barColor);
      ctx.globalAlpha = 1;
    }
  }

  function drawGrid(paused) {
    const { grid, board } = layout;
    const fever = state.combo.fever.active;
    if (fever) {
      const glow = 0.5 + 0.5 * Math.sin(view.time * 8);
      roundRect(board.x - 3, board.y - 3, board.w + 6, board.h + 6, 14, null, `rgba(255, 112, 67, ${0.6 + 0.4 * glow})`, 4);
    }
    if (paused) {
      roundRect(board.x, board.y, board.w, board.h, 12, COLORS.board);
      return;
    }

    for (const cell of [...view.glowSince.keys()]) if (!state.glowing.has(cell)) view.glowSince.delete(cell);
    for (const cell of state.glowing) {
      if (!view.glowSince.has(cell)) {
        view.glowSince.set(cell, view.time);
        const c = center(cellRect(layout, cell));
        particles.burst('spark', c.x, c.y, 3);
      }
    }

    const tapTarget = view.selectedSlot !== null;
    for (let i = 0; i < grid.size * grid.size; i++) {
      const r = cellRect(layout, i);
      const cell = state.grid.cells[i];
      if (!cell.ingredient) {
        const free = cell.lockedUntil <= state.time;
        if (i === view.targetCell || (tapTarget && free)) {
          roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 6, i === view.targetCell ? 'rgba(102, 187, 106, 0.35)' : 'rgba(102, 187, 106, 0.12)', i === view.targetCell ? COLORS.target : null, 3);
        }
        continue;
      }
      let dx = 0;
      let scale = 1;
      const fx = view.cellFx.get(i);
      if (fx?.type === 'pop') scale = 0.7 + 0.3 * ease((view.time - fx.at) / POP_TIME);
      if (fx?.type === 'wiggle' && view.time - fx.at < WIGGLE_TIME) dx = Math.sin((view.time - fx.at) * 60) * 4;
      const glowing = state.glowing.has(i);
      if (glowing) {
        const since = view.time - view.glowSince.get(i);
        if (since < GLOW_JITTER_TIME && !reducedMotion) dx += Math.sin(since * 80) * 2;
        const pulse = 0.55 + 0.45 * Math.sin(view.time * 6);
        roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 7, `rgba(255, 213, 79, ${0.25 + 0.2 * pulse})`, COLORS.glow, 3);
      }
      const s = r.w * scale;
      drawIngredient(ctx, cell.ingredient, r.x + (r.w - s) / 2 + dx, r.y + (r.h - s) / 2, s, pixelScale);
    }
  }

  function drawTray(paused) {
    if (paused) return;
    const { tray, preview } = layout;
    tray.forEach((r, i) => {
      const id = state.tray.slots[i];
      if (!id) return;
      if (view.selectedSlot === i) roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 14, 'rgba(102, 187, 106, 0.25)', COLORS.target, 3);
      const dragging = view.drag?.active && view.drag.slot === i;
      ctx.globalAlpha = dragging ? 0.25 : 1;
      let x = r.x + 4;
      let y = r.y + 4;
      if (view.returning?.slot === i) {
        const k = ease((view.time - view.returning.at) / RETURN_TIME);
        x = view.returning.x + (x - view.returning.x) * k;
        y = view.returning.y + (y - view.returning.y) * k;
      }
      const pop = 0.6 + 0.4 * ease((view.time - view.trayPopAt[i]) / POP_TIME);
      const size = 64 * pop;
      drawIngredient(ctx, id, x + (64 - size) / 2, y + (64 - size) / 2, size, pixelScale);
      ctx.globalAlpha = 1;
    });
    if (state.tray.preview) {
      ctx.globalAlpha = 0.5;
      drawIngredient(ctx, state.tray.preview, preview.x, preview.y, preview.w, pixelScale);
      ctx.globalAlpha = 1;
    }
  }

  function drawFlyers() {
    for (const f of flyers) {
      if (!f.alive) continue;
      const k = ease((view.time - f.at) / balance.cookDuration);
      const size = 64 * (1 - 0.6 * k);
      const x = f.from.x + (f.to.x - f.from.x) * k;
      const y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * 30;
      ctx.globalAlpha = 1 - k * 0.5;
      drawIngredient(ctx, f.id, x - size / 2, y - size / 2, size, pixelScale);
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    for (const item of texts) {
      if (!item.alive) continue;
      const k = (view.time - item.at) / item.duration;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      text(item.text, item.x, item.y - k * 24, { size: item.size, weight: 800, color: item.color, outline: 'rgba(43, 29, 20, 0.85)' });
    }
    ctx.globalAlpha = 1;
  }

  function drawDrag() {
    const d = view.drag;
    if (!d?.active) return;
    const id = state.tray.slots[d.slot];
    if (!id) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawIngredient(ctx, id, d.x - 32, d.y - balance.dragLiftOffset - 32, 64, pixelScale);
  }

  function drawBanners() {
    const { board } = layout;
    const c = center(board);
    if (state.combo.fever.active) {
      const left = Math.max(0, (state.combo.fever.endsAt - state.time) / balance.feverDuration);
      const w = 230;
      roundRect(c.x - w / 2, board.y - 12, w, 20, 10, COLORS.orange, COLORS.cream, 2);
      roundRect(c.x - w / 2 + 3, board.y + 3, (w - 6) * left, 3, 2, COLORS.cream);
      text(t('hud.fever'), c.x, board.y - 3, { size: 12, weight: 800 });
    }
    const sincePerfect = view.time - view.perfectAt;
    if (sincePerfect < BIG_TEXT_TIME) {
      const pop = 0.6 + 0.4 * ease(sincePerfect / POP_TIME);
      ctx.globalAlpha = 1 - Math.max(0, sincePerfect - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      text(t('fx.perfect'), c.x, c.y - 40, { size: Math.round(34 * pop), weight: 900, color: COLORS.glow, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    const sinceSecret = view.time - view.secretAt;
    if (sinceSecret < BIG_TEXT_TIME) {
      ctx.globalAlpha = 1 - Math.max(0, sinceSecret - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      text(t('fx.secret'), c.x, c.y + 20, { size: 22, weight: 900, color: COLORS.purple, outline: COLORS.ink });
      text(t(`recipe.${view.secretRecipe}`), c.x, c.y + 48, { size: 18, weight: 800, color: COLORS.cream, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    const sinceFlash = view.time - view.flashAt;
    if (sinceFlash < FLASH_TIME) {
      ctx.fillStyle = `rgba(255, 255, 255, ${balance.perfectFlashMaxOpacity * (1 - sinceFlash / FLASH_TIME)})`;
      ctx.fillRect(0, 0, layout.width, layout.height);
    }
  }

  function draw(paused) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgLayer, 0, 0);
    setTransform(ctx);
    const sinceShake = view.time - view.shakeAt;
    if (sinceShake < SHAKE_TIME) {
      const amp = 3 * (1 - sinceShake / SHAKE_TIME);
      ctx.translate(Math.sin(view.time * 90) * amp, Math.cos(view.time * 70) * amp);
    }
    drawHud();
    drawCustomers();
    drawGrid(paused);
    drawTray(paused);
    if (!paused) {
      drawFlyers();
      particles.draw(ctx);
      drawTexts();
      drawDrag();
    }
    drawBanners();
    if (showFps) text(`${Math.round(view.fps)} FPS`, layout.ox + layout.hud.w - 4, layout.height - 8, { size: 10, weight: 600, color: 'rgba(255,248,231,0.5)', align: 'right' });
  }

  function returnDragged(slot, x, y) {
    view.returning = { slot, x: x - 32, y: y - balance.dragLiftOffset - 32, at: view.time };
  }

  return { resize, handleEvents, update, draw, view, getLayout: () => layout, returnDragged };
}
