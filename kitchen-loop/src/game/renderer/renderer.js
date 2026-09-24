import { t, formatNumber, formatDecimal } from '../../utils/i18n.js';
import { createParticles } from '../../systems/particles.js';
import { currentComboWindow } from '../combo.js';
import { TRAY_SLOTS } from '../engine.js';
import { computeLayout, cellRect, center } from './layout.js';
import { drawIngredient, clearPlaceholderCache } from './placeholders.js';
import { createCanvasKit, COLORS, font, ease, clamp01 } from './canvasKit.js';
import { createCharacters } from './characters.js';

// View layer of a loop: draws the engine state on a canvas and turns engine events into feedback.
// Presentation timings (s), all under the limits of spec 9.3.
const POP_TIME = 0.15;
const SQUASH_TIME = 0.28;
const WIGGLE_TIME = 0.25;
const RETURN_TIME = 0.15;
const TEXT_TIME = 0.8;
const BIG_TEXT_TIME = 1.2;
const SHAKE_TIME = 0.15;
const FLASH_TIME = 0.15;
const GLOW_JITTER_TIME = 0.2;
const HINT_CYCLE = 1.4;
const LOW_TIME = 10;
const TEXT_POOL = 24;
const FLYER_POOL = 32;
const CELL_SPRITE = 64;

export function createRenderer(canvas, engine, { balance, reducedMotion = false, showFps = false }) {
  const ctx = canvas.getContext('2d');
  const kit = createCanvasKit(ctx);
  const particles = createParticles(reducedMotion ? balance.maxParticlesReduced : balance.maxParticles);
  const bgLayer = document.createElement('canvas');
  const { state } = engine;
  const motion = reducedMotion ? 0 : 1;
  let layout;
  let pixelScale = 1;

  const view = {
    time: 0,
    drag: null, // { slot, pointerId, startX, startY, x, y, active }
    selectedSlot: null,
    targetCell: -1,
    returning: null, // { slot, x, y, at }
    cellFx: new Map(), // cell → { type: 'place' | 'wiggle', at }
    glowSince: new Map(),
    trayPopAt: Array(TRAY_SLOTS).fill(-1),
    customerSeen: new Map(),
    departures: [], // { slot, typeId, happy, at }
    pipLine: null, // { key, expression, vars, shownAt, persistent }
    hint: null, // tutorial hint
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
  const characters = createCharacters({ ctx, kit, view, state, getLayout: () => layout, getPixelScale: () => pixelScale, reducedMotion });

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
    g.fillText(t('hud.next'), p.x + p.w / 2, p.y + p.h + 14);
  }

  const customerHead = (slot) => {
    const r = layout.customers[slot];
    return { x: r.x + r.w / 2, y: r.y + r.h - 50 };
  };

  function handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'place': {
          view.cellFx.set(e.cell, { type: 'place', at: view.time });
          view.trayPopAt[e.slot] = view.time;
          const c = center(cellRect(layout, e.cell));
          particles.burst('crumb', c.x, c.y + 20, 6);
          break;
        }
        case 'cook': {
          const rects = e.cells.map((i) => cellRect(layout, i));
          const mid = rects.map(center).reduce((a, b) => ({ x: a.x + b.x / rects.length, y: a.y + b.y / rects.length }), { x: 0, y: 0 });
          const to = e.customerSlot !== null ? customerHead(e.customerSlot) : { x: layout.hud.x + layout.hud.w / 2, y: layout.hud.y + 22 };
          e.cells.forEach((cell, k) => {
            view.cellFx.delete(cell);
            addFlyer(e.ingredients[k], center(rects[k]), to);
          });
          particles.burst('spark', mid.x, mid.y, 14);
          particles.burst('steam', mid.x, mid.y, 4);
          const label = e.multiplier > 1 ? `+${formatNumber(e.points)}  x${formatDecimal(e.multiplier)}` : `+${formatNumber(e.points)}`;
          addText(label, mid.x, mid.y - 8, { color: COLORS.cream, size: 20 });
          if (e.customerSlot !== null) {
            const c = customerHead(e.customerSlot);
            addText(t('fx.served'), c.x, c.y - 20, { color: COLORS.ok, size: 15 });
            particles.burst('star', c.x, c.y, 12);
            view.departures.push({ slot: e.customerSlot, typeId: e.customerTypeId, happy: true, at: view.time });
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
          const c = customerHead(e.customer.slot);
          addText(t('fx.customerLeft'), c.x, c.y - 20, { color: COLORS.muted, size: 13 });
          particles.burst('smoke', c.x, c.y, 10);
          view.departures.push({ slot: e.customer.slot, typeId: e.customer.typeId, happy: false, at: view.time });
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

  // Pip's current line (from the Pip director or the tutorial). A new key restarts the typewriter.
  function setPipLine(line, { persistent = false, vars } = {}) {
    if (!line) {
      if (!persistent) view.pipLine = null;
      return;
    }
    if (view.pipLine?.key !== line.key || view.pipLine?.at !== line.at) {
      view.pipLine = { ...line, vars, persistent, shownAt: view.time };
    }
  }

  const setHint = (hint) => {
    view.hint = hint;
  };

  // ---------- drawing ----------

  // Ingredient anchored at the bottom centre of its box so squash and stretch look grounded.
  function drawIngredientAt(id, x, y, size, sx = 1, sy = 1) {
    ctx.save();
    ctx.translate(x + size / 2, y + size);
    ctx.scale(sx, sy);
    drawIngredient(ctx, id, -size / 2, -size, size, pixelScale);
    ctx.restore();
  }

  function drawHud() {
    const { hud, pause } = layout;
    kit.roundRect(pause.x + 6, pause.y + 6, pause.w - 12, pause.h - 12, 8, 'rgba(255, 248, 231, 0.15)');
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(pause.x + 17, pause.y + 15, 4, 14);
    ctx.fillRect(pause.x + 25, pause.y + 15, 4, 14);

    const seconds = Math.ceil(state.timeLeft);
    const low = state.timeLeft <= LOW_TIME && state.status === 'playing' && state.timerRunning;
    const pulse = low ? 1 + 0.08 * Math.sin(view.time * 10) : 1;
    const clockX = hud.x + 66;
    const cy = hud.y + 22;
    ctx.strokeStyle = low ? COLORS.bad : COLORS.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(clockX, cy, 8, 0, Math.PI * 2);
    ctx.moveTo(clockX, cy);
    ctx.lineTo(clockX, cy - 5);
    ctx.moveTo(clockX, cy);
    ctx.lineTo(clockX + 4, cy);
    ctx.stroke();
    kit.text(state.timerRunning ? String(seconds) : '–', clockX + 14, cy, { size: Math.round(22 * pulse), weight: 800, align: 'left', color: low ? COLORS.bad : COLORS.cream });

    kit.text(formatNumber(state.score), hud.x + hud.w / 2 + 10, cy, { size: 24, weight: 800 });

    const { chain } = state.combo;
    if (chain >= 2) {
      const pop = 1 + 0.25 * (1 - ease((view.time - view.comboPopAt) / POP_TIME));
      const right = hud.x + hud.w - 12;
      kit.text(t('hud.combo', { n: chain }), right, cy - 5, { size: Math.round(16 * pop), weight: 800, align: 'right', color: state.combo.fever.active ? COLORS.orange : COLORS.peach });
      const windowLeft = 1 - (state.time - state.combo.lastCookAt) / currentComboWindow(state.combo, balance);
      kit.roundRect(right - 70, cy + 8, 70, 5, 2, 'rgba(255, 248, 231, 0.2)');
      kit.roundRect(right - 70, cy + 8, 70 * Math.max(0, windowLeft), 5, 2, COLORS.peach);
    }
  }

  function drawGrid(paused) {
    const { grid, board } = layout;
    if (state.combo.fever.active) {
      const glow = 0.5 + 0.5 * Math.sin(view.time * 8);
      kit.roundRect(board.x - 3, board.y - 3, board.w + 6, board.h + 6, 14, null, `rgba(255, 112, 67, ${0.6 + 0.4 * glow})`, 4);
    }
    if (paused) {
      kit.roundRect(board.x, board.y, board.w, board.h, 12, COLORS.board);
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
          kit.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 6, i === view.targetCell ? 'rgba(102, 187, 106, 0.35)' : 'rgba(102, 187, 106, 0.12)', i === view.targetCell ? COLORS.target : null, 3);
        }
        continue;
      }
      let dx = 0;
      let sx = 1;
      let sy = 1;
      const fx = view.cellFx.get(i);
      if (fx?.type === 'place') {
        // Squash and stretch on landing.
        const k = clamp01((view.time - fx.at) / SQUASH_TIME);
        const wave = Math.sin(k * Math.PI * 2) * (1 - k) * 0.25 * motion;
        sy = 1 - wave;
        sx = 1 + wave;
      }
      if (fx?.type === 'wiggle' && view.time - fx.at < WIGGLE_TIME) dx = Math.sin((view.time - fx.at) * 60) * 4;
      if (state.glowing.has(i)) {
        const since = view.time - view.glowSince.get(i);
        if (since < GLOW_JITTER_TIME) dx += Math.sin(since * 80) * 2 * motion;
        const pulse = 0.55 + 0.45 * Math.sin(view.time * 6);
        kit.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 7, `rgba(255, 213, 79, ${0.25 + 0.2 * pulse})`, COLORS.glow, 3);
        const bounce = Math.abs(Math.sin(view.time * 5 + i)) * 0.06 * motion;
        sy *= 1 + bounce;
        sx *= 1 - bounce / 2;
      }
      drawIngredientAt(cell.ingredient, r.x + dx, r.y, r.w, sx, sy);
    }
  }

  function drawTray(paused) {
    if (paused) return;
    const { tray, preview } = layout;
    tray.forEach((r, i) => {
      const id = state.tray.slots[i];
      if (!id) return;
      const blocked = state.allowedSlots && !state.allowedSlots.has(i);
      if (view.selectedSlot === i) kit.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 14, 'rgba(102, 187, 106, 0.25)', COLORS.target, 3);
      const dragging = view.drag?.active && view.drag.slot === i;
      ctx.globalAlpha = dragging ? 0.25 : blocked ? 0.35 : 1;
      let x = r.x + 4;
      let y = r.y + 4;
      if (view.returning?.slot === i) {
        const k = ease((view.time - view.returning.at) / RETURN_TIME);
        x = view.returning.x + (x - view.returning.x) * k;
        y = view.returning.y + (y - view.returning.y) * k;
      }
      const pop = 0.6 + 0.4 * ease((view.time - view.trayPopAt[i]) / POP_TIME);
      const bob = Math.sin(view.time * 2.5 + i * 1.3) * 2 * motion;
      const size = CELL_SPRITE * pop;
      drawIngredientAt(id, x + (CELL_SPRITE - size) / 2, y + (CELL_SPRITE - size) + bob, size);
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
      const size = CELL_SPRITE * (1 - 0.6 * k);
      const x = f.from.x + (f.to.x - f.from.x) * k;
      const y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * 30;
      ctx.globalAlpha = 1 - k * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * Math.PI * 2 * motion);
      drawIngredient(ctx, f.id, -size / 2, -size / 2, size, pixelScale);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    for (const item of texts) {
      if (!item.alive) continue;
      const k = (view.time - item.at) / item.duration;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      kit.text(item.text, item.x, item.y - k * 24, { size: item.size, weight: 800, color: item.color, outline: 'rgba(43, 29, 20, 0.85)' });
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
    const tilt = Math.sin(view.time * 12) * 0.08 * motion;
    ctx.save();
    ctx.translate(d.x, d.y - balance.dragLiftOffset);
    ctx.rotate(tilt);
    drawIngredient(ctx, id, -CELL_SPRITE / 2, -CELL_SPRITE / 2, CELL_SPRITE, pixelScale);
    ctx.restore();
  }

  // Tutorial pointer: a finger that drags from a tray slot to a cell, or taps glowing cells.
  function drawFinger(x, y, pressed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(4, 22, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.cream;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-7, -4, 14, 30, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-11, 14, 24, 22, 8);
    ctx.fill();
    ctx.stroke();
    if (pressed) {
      ctx.strokeStyle = COLORS.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHint() {
    const hint = view.hint;
    if (!hint || view.drag?.active) return;
    const k = (view.time % HINT_CYCLE) / HINT_CYCLE;
    if (hint.slot !== undefined && hint.cell !== undefined) {
      const target = cellRect(layout, hint.cell);
      kit.roundRect(target.x + 3, target.y + 3, target.w - 6, target.h - 6, 6, `rgba(102, 187, 106, ${0.2 + 0.15 * Math.sin(view.time * 6)})`, COLORS.target, 3);
      const from = center(layout.tray[hint.slot]);
      const to = center(target);
      const m = ease(clamp01((k - 0.15) / 0.6));
      drawFinger(from.x + (to.x - from.x) * m, from.y + (to.y - from.y) * m, k < 0.15 || k > 0.75);
    } else if (hint.glowing) {
      const cells = [...state.glowing];
      if (cells.length === 0) return;
      const c = center(cellRect(layout, cells[0]));
      const press = k < 0.3;
      kit.roundRect(c.x - 36, c.y - 36, 72, 72, 10, null, COLORS.target, 3 + 2 * Math.sin(view.time * 8));
      drawFinger(c.x + 6, c.y + (press ? 4 : 12), press);
    } else if (hint.customer && state.customers.length > 0) {
      const slot = layout.customers[state.customers[0].slot];
      const bob = Math.sin(view.time * 6) * 4;
      const ax = slot.x + slot.w + 8;
      const ay = slot.y + 34 + bob;
      ctx.fillStyle = COLORS.glow;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax - 4, ay);
      ctx.lineTo(ax + 12, ay - 10);
      ctx.lineTo(ax + 12, ay + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawBanners() {
    const { board } = layout;
    const c = center(board);
    if (state.combo.fever.active) {
      const left = Math.max(0, (state.combo.fever.endsAt - state.time) / balance.feverDuration);
      const w = 230;
      kit.roundRect(c.x - w / 2, board.y - 12, w, 20, 10, COLORS.orange, COLORS.cream, 2);
      kit.roundRect(c.x - w / 2 + 3, board.y + 3, (w - 6) * left, 3, 2, COLORS.cream);
      kit.text(t('hud.fever'), c.x, board.y - 3, { size: 12, weight: 800 });
    }
    const sincePerfect = view.time - view.perfectAt;
    if (sincePerfect < BIG_TEXT_TIME) {
      const pop = 0.6 + 0.4 * ease(sincePerfect / POP_TIME);
      ctx.globalAlpha = 1 - Math.max(0, sincePerfect - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      kit.text(t('fx.perfect'), c.x, c.y - 40, { size: Math.round(34 * pop), weight: 900, color: COLORS.glow, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    const sinceSecret = view.time - view.secretAt;
    if (sinceSecret < BIG_TEXT_TIME) {
      ctx.globalAlpha = 1 - Math.max(0, sinceSecret - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      kit.text(t('fx.secret'), c.x, c.y + 20, { size: 22, weight: 900, color: COLORS.purple, outline: COLORS.ink });
      kit.text(t(`recipe.${view.secretRecipe}`), c.x, c.y + 48, { size: 18, weight: 800, color: COLORS.cream, outline: COLORS.ink });
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
    characters.drawCustomers();
    drawGrid(paused);
    drawTray(paused);
    characters.drawPip(view.pipLine, { persistent: view.pipLine?.persistent });
    if (!paused) {
      drawFlyers();
      particles.draw(ctx);
      drawTexts();
      drawHint();
      drawDrag();
    }
    drawBanners();
    if (showFps) kit.text(`${Math.round(view.fps)} FPS`, layout.ox + layout.hud.w - 4, layout.height - 8, { size: 10, weight: 600, color: 'rgba(255,248,231,0.5)', align: 'right' });
  }

  function returnDragged(slot, x, y) {
    view.returning = { slot, x: x - CELL_SPRITE / 2, y: y - balance.dragLiftOffset - CELL_SPRITE / 2, at: view.time };
  }

  return { resize, handleEvents, update, draw, view, getLayout: () => layout, returnDragged, setPipLine, setHint };
}
