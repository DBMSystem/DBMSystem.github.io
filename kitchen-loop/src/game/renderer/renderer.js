import { t, formatNumber, formatDecimal } from '../../utils/i18n.js';
import { createParticles } from '../../systems/particles.js';
import { currentComboWindow } from '../combo.js';
import { TRAY_SLOTS } from '../engine.js';
import { computeLayout, cellRect, center } from './layout.js';
import { drawIngredient, drawSmooth, clearPlaceholderCache } from './placeholders.js';
import { createCanvasKit, COLORS, font, ease, clamp01 } from './canvasKit.js';
import { createCharacters } from './characters.js';
import { getSprite, spriteScale } from '../../assets/manifest.js';
import { panById } from '../../data/products.js';
import { recipeById } from '../../data/recipes.js';

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
const TOAST_TIME = 2.2;
const TEXT_POOL = 24;
const FLYER_POOL = 32;
const VFX_POOL = 12;
const CELL_SPRITE = 64;
const DISH_FLYER = 72;
const PAN_SIZZLE = 0.45; // s of the hop after food lands
const PAN_GLOW_TIME = 0.8;
const BURNT_TIME = 1.4; // the charred dish stays in the pan this long
const BOWL_OFFSET = 0.15; // the pan sprites' bowl sits left of centre (the handle points right)
const BOWL_RADIUS = 0.31; // of the pan's width
const STEAM_EVERY = 0.55;
const FEVER_SPARK_EVERY = 0.18;
const RAIN_DROPS = 36;
const REACTION_LINES = 2; // react.<customer>.1–2 in es.js
const FULL_STOVE_TIME = 1.4;
const HAND_HEIGHT = 52; // tutorial hand (ui/tutorial_hand, scripts/extract_sprites.py)
const HAND_TIP = { x: 0.4, y: 0.03 }; // its fingertip, in fractions of the sprite
export const ABILITIES = ['move', 'discard', 'freeze'];

// `cosmetics`: { pan, night } — the equipped pan seen when cooking and the Maestro Pass's night kitchen (spec 7.4, 7.5).
export function createRenderer(canvas, engine, { balance, reducedMotion = false, showFps = false, cosmetics = {} }) {
  const pan = panById[cosmetics.pan] ?? panById.default;
  const night = Boolean(cosmetics.night);
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
    drag: null, // { slot | fromCell, pointerId, startX, startY, x, y, active, downAt }
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
    toast: null, // { title, text, color, at }
    pans: [], // per customer slot: { landAt, burntAt, burntRecipe }
    fullStoveAt: -10,
    nextSteamAt: 0,
    nextFeverSparkAt: 0,
    holdProgress: 0, // 0–1 while holding an ingredient to discard it
    fps: 60,
  };
  const texts = Array.from({ length: TEXT_POOL }, () => ({ alive: false }));
  const flyers = Array.from({ length: FLYER_POOL }, () => ({ alive: false }));
  const vfx = Array.from({ length: VFX_POOL }, () => ({ alive: false }));
  const characters = createCharacters({ ctx, kit, view, state, getLayout: () => layout, getPixelScale: () => pixelScale, reducedMotion });

  function addText(text, x, y, { color = COLORS.cream, size = 16, duration = TEXT_TIME } = {}) {
    const slot = texts.find((item) => !item.alive) ?? texts[0];
    Object.assign(slot, { alive: true, text, x, y, color, size, at: view.time, duration });
  }

  // `delay` and `duration` in seconds; a flyer waits unseen until its delay has passed.
  function addFlyer(id, from, to, { delay = 0, duration = balance.cookDuration } = {}) {
    const slot = flyers.find((item) => !item.alive);
    if (slot) Object.assign(slot, { alive: true, id, from, to, at: view.time + delay, duration });
  }

  // Sprite effects (vfx sheet): pop in, drift, fade out. `spin` in turns over the effect's life.
  function addVfx(key, x, y, size, duration, { spin = 0, rise = 0 } = {}) {
    if (!getSprite(`vfx/${key}`)) return;
    const slot = vfx.find((item) => !item.alive) ?? vfx[0];
    Object.assign(slot, { alive: true, key, x, y, size, duration, spin: spin * motion, rise, at: view.time });
  }

  const panFx = (slot) => (view.pans[slot] ??= { landAt: -10, burntAt: -10, burntRecipe: null });
  const cookingIn = (slot) => state.customers.find((c) => c.slot === slot && c.cooking) ?? null;
  // A counter sale goes through a pan nobody is using, the one nearest the middle.
  function freePan() {
    const order = layout.pans.map((_, i) => i).sort((a, b) => Math.abs(a - (layout.pans.length - 1) / 2) - Math.abs(b - (layout.pans.length - 1) / 2));
    const slot = order.find((i) => !cookingIn(i));
    return slot === undefined ? null : slot;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    layout = computeLayout(rect.width, rect.height, state.grid.size, state.rules.maxCustomers, TRAY_SLOTS, abilityList().length);
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

    // Kitchen behind the customers, bottom-aligned with the counter; darker at the top for the HUD.
    const kitchen = getSprite(night ? 'ui/kitchen_night' : 'ui/kitchen_day');
    if (kitchen) {
      const first = layout.customers[0];
      const bottom = first.y + first.h;
      const h = Math.max(bottom, (layout.width * kitchen.height) / kitchen.width);
      const w = (h * kitchen.width) / kitchen.height;
      drawSmooth(g, kitchen, (layout.width - w) / 2, bottom - h, w, h);
      const shade = g.createLinearGradient(0, 0, 0, bottom);
      shade.addColorStop(0, 'rgba(43, 29, 20, 0.85)');
      shade.addColorStop(0.35, 'rgba(43, 29, 20, 0.25)');
      shade.addColorStop(1, 'rgba(43, 29, 20, 0.1)');
      g.fillStyle = shade;
      g.fillRect(0, 0, layout.width, bottom);
    }

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

  const abilityList = () => ABILITIES.filter((a) => a in state.abilities);

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
          for (const cell of e.cells) view.cellFx.delete(cell);
          // Board → pan (spec 2.6, 7.5): an order jumps into its customer's pan and sizzles there until it is
          // served; a counter sale passes through a free pan and goes straight to the score.
          const flight = balance.cookDuration;
          const slot = e.customerSlot ?? freePan();
          const panPos = slot !== null ? layout.pans[slot] : null;
          const toPan = panPos ?? layout.hud;
          e.cells.forEach((cell, k) => addFlyer(e.ingredients[k], center(rects[k]), toPan, { duration: e.customerSlot !== null ? flight : flight / 2 }));
          if (panPos) {
            panFx(slot).landAt = view.time + (e.customerSlot !== null ? flight : flight / 2);
            particles.burst(pan.particle, panPos.x, panPos.y - 6, 12);
            particles.burst('steam', panPos.x, panPos.y - 10, 4);
          }
          particles.burst('spark', mid.x, mid.y, 14);
          if (e.customerSlot === null) {
            const score = { x: layout.hud.x + layout.hud.w / 2 + 34, y: layout.hud.y + 22 };
            if (panPos) {
              if (getSprite(`dishes/${e.recipeId}`)) addFlyer(`dish:${e.recipeId}`, panPos, score, { delay: flight / 2, duration: flight / 2 });
              else e.ingredients.forEach((id) => addFlyer(id, panPos, score, { delay: flight / 2, duration: flight / 2 }));
            }
            const label = e.multiplier > 1 ? `+${formatNumber(e.points)}  x${formatDecimal(e.multiplier)}` : `+${formatNumber(e.points)}`;
            addText(label, mid.x, mid.y - 8, { color: e.golden ? COLORS.glow : COLORS.cream, size: e.golden ? 24 : 20 });
            addText(t('fx.counterSale'), mid.x, mid.y + 16, { color: COLORS.peach, size: 12 });
          } else {
            addText(e.multiplier > 1 ? `${t('fx.toPan')}  x${formatDecimal(e.multiplier)}` : t('fx.toPan'), mid.x, mid.y - 8, {
              color: COLORS.peach,
              size: 16,
            });
          }
          if (e.golden) addVfx('coins', mid.x, mid.y, 110, 0.7, { rise: 20 });
          if (e.chain >= 3) addVfx('sparkle', mid.x, mid.y, 110, 0.5, { spin: 0.4 });
          if (e.secretFound) {
            view.secretAt = view.time;
            view.secretRecipe = e.recipeId;
            particles.burst('star', mid.x, mid.y, 30);
            const b = center(layout.board);
            addVfx('rainbow', b.x, b.y + 30, 220, BIG_TEXT_TIME, { spin: 1 });
          }
          if (e.chain >= 2) view.comboPopAt = view.time;
          if (!reducedMotion) view.shakeAt = view.time;
          break;
        }
        case 'served': {
          // The dish leaves the pan for the customer (spec 2.6).
          const from = layout.pans[e.slot];
          const c = customerHead(e.slot);
          const hop = balance.cookDuration;
          if (getSprite(`dishes/${e.recipeId}`)) addFlyer(`dish:${e.recipeId}`, from, c, { duration: hop });
          else recipeById[e.recipeId]?.ingredients.forEach((id) => addFlyer(id, from, c, { duration: hop }));
          particles.burst(pan.particle, from.x, from.y - 6, 10);
          const label = e.multiplier > 1 ? `+${formatNumber(e.points)}  x${formatDecimal(e.multiplier)}` : `+${formatNumber(e.points)}`;
          addText(label, c.x, c.y - 40, { color: e.golden ? COLORS.glow : COLORS.cream, size: e.golden ? 22 : 18 });
          // Served in the last moments: "¡Justo a tiempo!" instead of "¡Servido!", with stars, so a near miss feels like a win.
          const tx = Math.min(layout.ox + 300, Math.max(layout.ox + 60, c.x));
          if (e.justInTime) addText(t('fx.justInTime'), tx, c.y - 20, { color: COLORS.glow, size: 12, duration: BIG_TEXT_TIME });
          else addText(t('fx.served'), c.x, c.y - 20, { color: COLORS.ok, size: 15 });
          if (e.fragments > 0) addText(t('fx.fragments', { n: e.fragments }), c.x, c.y, { color: COLORS.purple, size: 14 });
          addVfx('hearts', c.x, c.y - 10, 80, 0.6, { rise: 30 });
          view.departures.push({
            slot: e.slot,
            typeId: e.customerTypeId,
            happy: true,
            at: view.time,
            line: `react.${e.customerTypeId}.${1 + Math.floor(Math.random() * REACTION_LINES)}`,
          });
          if (e.justInTime) {
            addVfx('star', c.x, c.y - 44, 60, 0.7, { spin: 0.3 });
            particles.burst('star', c.x, c.y - 10, 24);
            view.flashAt = reducedMotion ? view.flashAt : view.time;
          }
          break;
        }
        case 'fullStove':
          view.fullStoveAt = view.time;
          for (const p of layout.pans) particles.burst('fire', p.x, p.y + 8, reducedMotion ? 2 : 6);
          break;
        case 'burnt': {
          // Patience ran out before the dish was ready: it burns in the pan and the customer leaves.
          const p = layout.pans[e.customer.slot];
          Object.assign(panFx(e.customer.slot), { burntAt: view.time, burntRecipe: e.recipeId });
          particles.burst('smoke', p.x, p.y - 8, 18);
          addVfx('smoke', p.x, p.y - 18, 90, 0.9, { rise: 26 });
          addText(t('fx.burnt'), p.x, p.y - 26, { color: COLORS.bad, size: 16 });
          const c = customerHead(e.customer.slot);
          addText(t('fx.customerLeft'), c.x, c.y - 20, { color: COLORS.muted, size: 13 });
          view.departures.push({ slot: e.customer.slot, typeId: e.customer.typeId, happy: false, at: view.time });
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
          addVfx('star', c.x, c.y - 40, 150, 0.9, { spin: 0.15 });
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
          addVfx('smoke', c.x + 20, c.y - 10, 60, 0.5, { rise: 20 });
          particles.burst('smoke', c.x, c.y, 10);
          view.departures.push({ slot: e.customer.slot, typeId: e.customer.typeId, happy: false, at: view.time });
          break;
        }
        case 'overflow': {
          const b = center(layout.board);
          addVfx('smoke', b.x, b.y, 260, BIG_TEXT_TIME, { rise: 30 });
          if (!reducedMotion) view.shakeAt = view.time;
          break;
        }
        case 'customerArrived':
          view.customerSeen.set(e.customer.uid, view.time);
          if (e.category !== 'common') {
            showToast(
              t(e.category === 'legendary' ? 'fx.legendaryArrived' : 'fx.specialArrived'),
              t(`customer.${e.customer.typeId}`),
              e.category === 'legendary' ? COLORS.glow : COLORS.purple,
            );
            const c = customerHead(e.customer.slot);
            addVfx(e.category === 'legendary' ? 'rainbow' : 'sparkle', c.x, c.y, 120, 0.8, { spin: 0.3 });
          }
          break;
        case 'clock': {
          const c = center(cellRect(layout, e.cell));
          addVfx('sparkle', c.x, c.y, 80, 0.5);
          addText(t('fx.clock', { s: e.seconds }), layout.hud.x + 120, layout.hud.y + 56, { color: COLORS.ok, size: 18 });
          break;
        }
        case 'move':
          view.cellFx.set(e.to, { type: 'place', at: view.time });
          break;
        case 'discard': {
          const c = center(cellRect(layout, e.cell));
          particles.burst('smoke', c.x, c.y, 8);
          addText(t('fx.discard'), c.x, c.y - 10, { color: COLORS.muted, size: 13 });
          break;
        }
        case 'freeze':
          for (const r of layout.customers) particles.burst('spark', r.x + r.w / 2, r.y + 30, 6);
          addText(t('fx.freeze'), center(layout.board).x, layout.board.y - 8, { color: '#81d4fa', size: 18 });
          break;
        case 'pipPlaced': {
          view.cellFx.set(e.cell, { type: 'place', at: view.time });
          const c = center(cellRect(layout, e.cell));
          addVfx('sparkle', c.x, c.y, 70, 0.5);
          break;
        }
        case 'crazyKitchen': {
          const c = center(layout.preview);
          addVfx('star', c.x, c.y, 70, 0.6, { spin: 0.3 });
          break;
        }
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
    for (const item of flyers) if (item.alive && view.time - item.at > item.duration) item.alive = false;
    // Pans breathe a little steam; the ones cooking steam a lot; in a fever they spark with the pan's particles.
    if (layout && view.time >= view.nextSteamAt) {
      view.nextSteamAt = view.time + (reducedMotion ? STEAM_EVERY * 3 : STEAM_EVERY) / 2;
      layout.pans.forEach((p, slot) => {
        const cooking = cookingIn(slot);
        if (cooking || Math.random() < 0.25) particles.burst('steam', p.x + (Math.random() - 0.5) * p.w * 0.4, p.y - 10, cooking ? 2 : 1);
        if (cooking && !reducedMotion) particles.burst('crumb', p.x + (Math.random() - 0.5) * p.w * 0.3, p.y - 4, 1);
      });
    }
    if (layout && state.combo.fever.active && view.time >= view.nextFeverSparkAt) {
      view.nextFeverSparkAt = view.time + FEVER_SPARK_EVERY;
      const p = layout.pans[Math.floor(Math.random() * layout.pans.length)];
      particles.burst(pan.particle, p.x, p.y - 8, reducedMotion ? 1 : 3);
    }
    for (const item of vfx) if (item.alive && view.time - item.at > item.duration) item.alive = false;
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

  const showToast = (title, text, color = COLORS.ok) => {
    view.toast = { title, text, color, at: view.time };
  };

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

  // Golden ingredient (spec 2.13): pulsing gold ring behind the sprite.
  function drawGoldenGlow(x, y, size) {
    const pulse = 0.5 + 0.5 * Math.sin(view.time * 5);
    ctx.save();
    ctx.shadowColor = COLORS.glow;
    ctx.shadowBlur = 10 + 6 * pulse * motion;
    kit.roundRect(x + 4, y + 4, size - 8, size - 8, 10, `rgba(255, 213, 79, ${0.25 + 0.2 * pulse})`, COLORS.glow, 2);
    ctx.restore();
  }

  function drawAbilities() {
    abilityList().forEach((ability, i) => {
      const r = layout.abilities[i];
      const left = state.abilities[ability];
      const active = ability === 'freeze' && state.time < state.frozenUntil;
      const usable = left > 0 && state.status === 'playing';
      kit.roundRect(
        r.x,
        r.y + 2,
        r.w,
        r.h - 4,
        10,
        active ? 'rgba(129, 212, 250, 0.4)' : usable ? 'rgba(255, 248, 231, 0.14)' : 'rgba(255, 248, 231, 0.05)',
        ability === 'freeze' && usable ? '#81d4fa' : null,
        2,
      );
      ctx.globalAlpha = usable || active ? 1 : 0.45;
      kit.text(t(`ability.${ability}`, { n: left }), r.x + r.w / 2, r.y + r.h / 2, { size: 11, weight: 800 });
      ctx.globalAlpha = 1;
    });
  }

  function drawHud() {
    const { hud, pause, quick } = layout;
    kit.roundRect(pause.x + 6, pause.y + 6, pause.w - 12, pause.h - 12, 8, 'rgba(255, 248, 231, 0.15)');
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(pause.x + 17, pause.y + 15, 4, 14);
    ctx.fillRect(pause.x + 25, pause.y + 15, 4, 14);
    kit.roundRect(quick.x + 6, quick.y + 6, quick.w - 12, quick.h - 12, 8, 'rgba(255, 248, 231, 0.15)');
    const book = getSprite('ui/icon_recipe');
    if (book) drawSmooth(ctx, book, quick.x + 11, quick.y + 11, quick.w - 22, quick.h - 22);

    const seconds = Math.ceil(state.timeLeft);
    const low = state.timeLeft <= LOW_TIME && state.status === 'playing' && state.timerRunning;
    const pulse = low ? 1 + 0.08 * Math.sin(view.time * 10) : 1;
    const clockX = hud.x + 112;
    const cy = hud.y + 22;
    const timerIcon = getSprite('ui/icon_timer');
    const iconSize = 22 * pulse;
    if (timerIcon) drawSmooth(ctx, timerIcon, clockX - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
    else {
      ctx.strokeStyle = low ? COLORS.bad : COLORS.cream;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clockX, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    kit.text(state.timerRunning ? String(seconds) : '–', clockX + 14, cy, {
      size: Math.round(22 * pulse),
      weight: 800,
      align: 'left',
      color: low ? COLORS.bad : COLORS.cream,
    });

    kit.text(formatNumber(state.score), hud.x + hud.w / 2 + 34, cy, { size: 24, weight: 800 });

    const { chain } = state.combo;
    if (chain >= 2) {
      const pop = 1 + 0.25 * (1 - ease((view.time - view.comboPopAt) / POP_TIME));
      const right = hud.x + hud.w - 12;
      kit.text(t('hud.combo', { n: chain }), right, cy - 5, {
        size: Math.round(16 * pop),
        weight: 800,
        align: 'right',
        color: state.combo.fever.active ? COLORS.orange : COLORS.peach,
      });
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
          kit.roundRect(
            r.x + 3,
            r.y + 3,
            r.w - 6,
            r.h - 6,
            6,
            i === view.targetCell ? 'rgba(102, 187, 106, 0.35)' : 'rgba(102, 187, 106, 0.12)',
            i === view.targetCell ? COLORS.target : null,
            3,
          );
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
      if (view.drag?.active && view.drag.fromCell === i) continue;
      if (cell.golden) drawGoldenGlow(r.x, r.y, r.w);
      if (night) kit.roundRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 10, 'rgba(255, 200, 120, 0.16)'); // glowing ingredients
      drawIngredientAt(cell.ingredient, r.x + dx, r.y, r.w, sx, sy);
      if (view.drag && !view.drag.active && view.drag.fromCell === i && view.holdProgress > 0) {
        const c = center(r);
        ctx.strokeStyle = COLORS.bad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r.w / 2 - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * view.holdProgress);
        ctx.stroke();
      }
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
      if (state.tray.golden[i]) drawGoldenGlow(x + (CELL_SPRITE - size) / 2, y + (CELL_SPRITE - size) + bob, size);
      drawIngredientAt(id, x + (CELL_SPRITE - size) / 2, y + (CELL_SPRITE - size) + bob, size);
      ctx.globalAlpha = 1;
    });
    if (state.tray.preview) {
      if (state.tray.previewGolden) drawGoldenGlow(preview.x - 4, preview.y - 4, preview.w + 8);
      ctx.globalAlpha = 0.5;
      drawIngredient(ctx, state.tray.preview, preview.x, preview.y, preview.w, pixelScale);
      ctx.globalAlpha = 1;
    }
  }

  function drawFlyers() {
    for (const f of flyers) {
      if (!f.alive) continue;
      if (view.time < f.at) continue;
      const k = ease((view.time - f.at) / f.duration);
      const size = CELL_SPRITE * (1 - 0.6 * k);
      const x = f.from.x + (f.to.x - f.from.x) * k;
      const y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * 30;
      ctx.globalAlpha = 1 - k * 0.5;
      ctx.save();
      ctx.translate(x, y);
      if (f.id.startsWith('dish:')) {
        const dishSize = DISH_FLYER * spriteScale(f.id.replace('dish:', 'dishes/')) * (1 + 0.3 * Math.sin(k * Math.PI));
        drawSmooth(ctx, getSprite(`dishes/${f.id.slice(5)}`), -dishSize / 2, -dishSize / 2, dishSize, dishSize);
      } else {
        ctx.rotate(k * Math.PI * 2 * motion);
        drawIngredient(ctx, f.id, -size / 2, -size / 2, size, pixelScale);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // The ingredients of a dish sizzling together in a pan's bowl (the plated dish only appears when served).
  function drawFood(recipeId, x, y, bowl) {
    const ids = recipeById[recipeId]?.ingredients ?? [];
    const size = bowl * (ids.length > 2 ? 0.5 : 0.58);
    const spread = ids.length > 1 ? bowl * 0.2 : 0;
    ids.forEach((id, k) => {
      const a = (k / ids.length) * Math.PI * 2 + 0.6;
      const bob = Math.sin(view.time * 14 + k * 2) * 1.2 * motion;
      drawIngredient(ctx, id, x + Math.cos(a) * spread - size / 2, y + Math.sin(a) * spread * 0.8 - size / 2 + bob, size, pixelScale);
    });
  }

  // The stove between the customers and the board: a pan per customer, with the equipped pan's art
  // (spec 2.1, 2.6, 7.5). An order sizzles in its customer's pan with a ring showing how long is left.
  function drawStove() {
    const { stove, pans } = layout;
    const fever = state.combo.fever.active;
    const perfect = clamp01(1 - (view.time - view.perfectAt) / PAN_GLOW_TIME);
    const sprite = getSprite(pan.sprite);
    const frozen = state.time < state.frozenUntil;
    // Range top: a long steel plate with a knob at each end.
    const topY = stove.y + stove.h - 18;
    const left = stove.x + 8;
    const width = stove.w - 16;
    // Every pan busy: the range glows (and a banner says so for a moment).
    const busy = pans.every((_, slot) => cookingIn(slot));
    if (busy) {
      ctx.save();
      ctx.shadowColor = COLORS.orange;
      ctx.shadowBlur = 14 + 6 * Math.sin(view.time * 10) * motion;
      kit.roundRect(left, topY, width, 16, 6, '#6a4a3a');
      ctx.restore();
    }
    kit.roundRect(left, topY, width, 16, 6, busy ? '#5a4f4a' : '#4a4f55', busy ? COLORS.orange : '#2d3136', 2);
    kit.roundRect(left + 8, topY + 5, 7, 7, 3, '#c9ced4');
    kit.roundRect(left + width - 15, topY + 5, 7, 7, 3, '#c9ced4');

    pans.forEach((p, slot) => {
      const fx = panFx(slot);
      const customer = cookingIn(slot);
      const cooking = customer?.cooking ?? null;
      const landed = cooking && view.time >= fx.landAt;
      const hopK = clamp01(1 - (view.time - fx.landAt) / PAN_SIZZLE);
      // Flame under the pan: small at rest, high while cooking, big in a fever.
      const flame = (fever || cooking ? 1 : 0.35 + 0.5 * hopK) * (1 + 0.15 * Math.sin(view.time * 20 + slot) * motion);
      for (let i = -2; i <= 2; i++) {
        const h = (9 + (2 - Math.abs(i)) * 3) * flame * (1 + 0.2 * Math.sin(view.time * 17 + i + slot) * motion);
        ctx.fillStyle = Math.abs(i) % 2 === 0 ? '#ff9f43' : '#ffd54f';
        ctx.beginPath();
        ctx.moveTo(p.x + i * 10 - 4, topY + 2);
        ctx.lineTo(p.x + i * 10, topY + 2 - h);
        ctx.lineTo(p.x + i * 10 + 4, topY + 2);
        ctx.fill();
      }
      // Glow of the pan's own colour on ¡En su punto! and in a fever.
      const glow = Math.max(perfect, fever ? 0.55 + 0.25 * Math.sin(view.time * 8 + slot) : 0);
      if (glow > 0.01) {
        const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.w * 0.8);
        const alpha = Math.round(glow * 200)
          .toString(16)
          .padStart(2, '0');
        g.addColorStop(0, `${pan.glow}${alpha}`);
        g.addColorStop(1, `${pan.glow}00`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.w, p.y - p.w, p.w * 2, p.w * 2);
      }
      // The pan: a gentle sway at rest, a hop when food lands, a shiver while it sizzles, a jump on ¡En su punto!
      const hop = (Math.sin(hopK * Math.PI) * 5 + Math.sin(perfect * Math.PI) * 8) * motion;
      const sizzle = landed ? Math.sin(view.time * 45 + slot) * 0.025 * motion : 0;
      const sway = Math.sin(view.time * 1.6 + slot * 0.9) * 0.03 * motion + sizzle;
      ctx.save();
      ctx.translate(p.x, p.y - hop);
      ctx.rotate(sway);
      if (sprite) {
        const h = (p.w * sprite.height) / sprite.width;
        drawSmooth(ctx, sprite, -p.w / 2 + p.w * BOWL_OFFSET, -h / 2, p.w, h);
      }
      const bowl = p.w * BOWL_RADIUS * 2;
      if (landed) {
        const k = clamp01((state.time - cooking.startedAt) / balance.panCookTime);
        const jiggle = Math.sin(view.time * 30) * 1.2 * motion;
        ctx.save();
        ctx.globalAlpha = 0.75 + 0.25 * k;
        drawFood(cooking.recipeId, jiggle * 0.5, -2, bowl);
        // It browns as it cooks.
        if (k > 0.3) {
          ctx.globalAlpha = 0.25 * (k - 0.3);
          ctx.fillStyle = '#8d5524';
          ctx.beginPath();
          ctx.arc(0, -2, bowl * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      const burnt = view.time - fx.burntAt;
      if (burnt < BURNT_TIME && fx.burntRecipe) {
        ctx.save();
        ctx.globalAlpha = 1 - clamp01((burnt - BURNT_TIME * 0.6) / (BURNT_TIME * 0.4));
        ctx.filter = 'brightness(0.25) sepia(0.6)';
        drawFood(fx.burntRecipe, 0, -2, bowl);
        ctx.filter = 'none';
        ctx.restore();
      }
      ctx.restore();
      // Progress ring: green while the dish will be ready in time, red and blinking when patience runs out first.
      if (cooking) {
        const k = clamp01((state.time - cooking.startedAt) / balance.panCookTime);
        const late = !frozen && customer.patience < cooking.readyAt - state.time;
        const r = p.w * BOWL_RADIUS + 5;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(43, 29, 20, 0.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y - hop, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = late ? (Math.sin(view.time * 16) > 0 ? COLORS.bad : COLORS.warn) : COLORS.ok;
        ctx.beginPath();
        ctx.arc(p.x, p.y - hop, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();
      }
    });
  }

  // Night kitchen: warm lights over the counter and rain running down behind the customers.
  function drawNight() {
    const first = layout.customers[0];
    const bottom = first.y + first.h;
    const glow = ctx.createRadialGradient(layout.width / 2, 0, 10, layout.width / 2, 0, layout.width * 0.8);
    glow.addColorStop(0, 'rgba(255, 196, 120, 0.22)');
    glow.addColorStop(1, 'rgba(255, 196, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, layout.width, bottom);
    if (reducedMotion) return;
    ctx.strokeStyle = 'rgba(170, 200, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < RAIN_DROPS; i++) {
      const x = ((i * 53.7 + view.time * 40) % (layout.width + 20)) - 10;
      const y = (i * 97.3 + view.time * 260) % bottom;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 9);
    }
    ctx.stroke();
  }

  function drawVfx() {
    for (const item of vfx) {
      if (!item.alive) continue;
      const k = (view.time - item.at) / item.duration;
      const scale = 0.5 + 0.5 * ease(k / 0.3);
      ctx.save();
      ctx.globalAlpha = 1 - clamp01((k - 0.55) / 0.45);
      ctx.translate(item.x, item.y - item.rise * k);
      ctx.rotate(item.spin * k * Math.PI * 2);
      const size = item.size * scale;
      drawSmooth(ctx, getSprite(`vfx/${item.key}`), -size / 2, -size / 2, size, size);
      ctx.restore();
    }
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
    const id = d.fromCell !== undefined ? state.grid.cells[d.fromCell].ingredient : state.tray.slots[d.slot];
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

  // Tutorial pointer: Pip's hand drags the ingredient from its tray slot to a cell, or taps glowing cells.
  function drawFinger(x, y, pressed, carrying = null) {
    ctx.save();
    if (pressed) {
      ctx.strokeStyle = COLORS.glow;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 16 + 4 * Math.sin(view.time * 10), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (carrying) {
      ctx.globalAlpha = 0.9;
      const s = CELL_SPRITE * 0.8;
      drawIngredient(ctx, carrying, x - s / 2, y - s * 0.75, s, pixelScale);
      ctx.globalAlpha = 1;
    }
    const hand = getSprite('ui/tutorial_hand');
    const h = HAND_HEIGHT * (pressed ? 0.92 : 1);
    const w = hand ? (h * hand.width) / hand.height : h * 0.8;
    const left = x - w * HAND_TIP.x;
    const top = y - h * HAND_TIP.y;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(left + w * 0.55, top + h + 3, w * 0.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (hand) ctx.drawImage(hand, left, top, w, h);
    else kit.roundRect(left, top, w, h, 8, COLORS.cream, COLORS.ink, 2.5);
    ctx.restore();
  }

  function drawHint() {
    const hint = view.hint;
    if (!hint || view.drag?.active) return;
    const k = (view.time % HINT_CYCLE) / HINT_CYCLE;
    if (hint.slot !== undefined && hint.cell !== undefined) {
      const target = cellRect(layout, hint.cell);
      kit.roundRect(
        target.x + 3,
        target.y + 3,
        target.w - 6,
        target.h - 6,
        6,
        `rgba(102, 187, 106, ${0.2 + 0.15 * Math.sin(view.time * 6)})`,
        COLORS.target,
        3,
      );
      const from = center(layout.tray[hint.slot]);
      const to = center(target);
      const m = ease(clamp01((k - 0.15) / 0.6));
      const carrying = k < 0.8 ? state.tray.slots[hint.slot] : null;
      drawFinger(from.x + (to.x - from.x) * m, from.y + (to.y - from.y) * m, k < 0.15 || k > 0.75, carrying);
    } else if (hint.glowing) {
      const cells = [...state.glowing];
      if (cells.length === 0) return;
      const c = center(cellRect(layout, cells[0]));
      const press = k < 0.3;
      kit.roundRect(c.x - 36, c.y - 36, 72, 72, 10, null, COLORS.target, 3 + 2 * Math.sin(view.time * 8));
      drawFinger(c.x + 4, c.y + (press ? 2 : 10), press);
    }
    if (hint.customer && state.customers.length > 0) {
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
      const firePan = getSprite('vfx/fire_pan');
      if (firePan) {
        const s = 34 + Math.sin(view.time * 12) * 2 * motion;
        drawSmooth(ctx, firePan, c.x - w / 2 - s + 8, board.y - 3 - s / 2 - 4, s, s);
        drawSmooth(ctx, firePan, c.x + w / 2 - 8, board.y - 3 - s / 2 - 4, s, s);
      }
    }
    const sincePerfect = view.time - view.perfectAt;
    if (sincePerfect < BIG_TEXT_TIME) {
      const pop = 0.6 + 0.4 * ease(sincePerfect / POP_TIME);
      ctx.globalAlpha = 1 - Math.max(0, sincePerfect - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      kit.text(t('fx.perfect'), c.x, c.y - 40, { size: Math.round(34 * pop), weight: 900, color: COLORS.glow, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    const sinceFull = view.time - view.fullStoveAt;
    if (sinceFull < FULL_STOVE_TIME) {
      const pop = 0.6 + 0.4 * ease(sinceFull / POP_TIME);
      ctx.globalAlpha = 1 - Math.max(0, sinceFull - FULL_STOVE_TIME * 0.7) / (FULL_STOVE_TIME * 0.3);
      kit.text(t('fx.fullStove'), c.x, layout.stove.y - 4, { size: Math.round(22 * pop), weight: 900, color: COLORS.orange, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    const sinceSecret = view.time - view.secretAt;
    if (sinceSecret < BIG_TEXT_TIME) {
      ctx.globalAlpha = 1 - Math.max(0, sinceSecret - BIG_TEXT_TIME * 0.7) / (BIG_TEXT_TIME * 0.3);
      kit.text(t('fx.secret'), c.x, c.y + 20, { size: 22, weight: 900, color: COLORS.purple, outline: COLORS.ink });
      kit.text(t(`recipe.${view.secretRecipe}`), c.x, c.y + 48, { size: 18, weight: 800, color: COLORS.cream, outline: COLORS.ink });
      ctx.globalAlpha = 1;
    }
    if (view.toast && view.time - view.toast.at < TOAST_TIME) {
      const k = (view.time - view.toast.at) / TOAST_TIME;
      const pop = 0.7 + 0.3 * ease(k / 0.1);
      ctx.globalAlpha = 1 - clamp01((k - 0.8) / 0.2);
      const y = board.y + 34;
      kit.roundRect(c.x - 150 * pop, y - 22, 300 * pop, 46, 14, 'rgba(59, 42, 32, 0.92)', view.toast.color, 3);
      kit.text(view.toast.title, c.x, y - 8, { size: 15, weight: 900, color: view.toast.color });
      kit.text(view.toast.text, c.x, y + 11, { size: 11, weight: 700, color: COLORS.cream });
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
    if (night) drawNight();
    drawHud();
    characters.drawCustomers();
    drawStove();
    drawGrid(paused);
    drawTray(paused);
    if (!paused) drawAbilities();
    characters.drawPip(view.pipLine, { persistent: view.pipLine?.persistent });
    if (!paused) {
      drawVfx();
      drawFlyers();
      particles.draw(ctx);
      drawTexts();
      drawHint();
      drawDrag();
    }
    drawBanners();
    if (showFps)
      kit.text(`${Math.round(view.fps)} FPS`, layout.ox + layout.hud.w - 4, layout.height - 8, {
        size: 10,
        weight: 600,
        color: 'rgba(255,248,231,0.5)',
        align: 'right',
      });
  }

  function returnDragged(slot, x, y) {
    view.returning = { slot, x: x - CELL_SPRITE / 2, y: y - balance.dragLiftOffset - CELL_SPRITE / 2, at: view.time };
  }

  return { resize, handleEvents, update, draw, view, getLayout: () => layout, abilityList, returnDragged, setPipLine, setHint, showToast };
}
