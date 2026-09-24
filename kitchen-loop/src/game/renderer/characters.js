import { recipeById } from '../../data/recipes.js';
import { customerById } from '../../data/customers.js';
import { getSprite } from '../../assets/manifest.js';
import { t } from '../../utils/i18n.js';
import { COLORS, ease, clamp01 } from './canvasKit.js';
import { drawIngredient, drawSmooth } from './placeholders.js';

// Customers (character + speech bubble with the order) and Pip, with their animations.
const CHARACTER = 84;
const BUBBLE_HEIGHT = 60;
const COUNTER_HEIGHT = 16;
const ARRIVE_TIME = 0.45;
const BUBBLE_DELAY = 0.2;
const LEAVE_TIME = 0.7;
const PIP_SIZE = 70;
const ANGRY_SCALE = 0.8; // the angry art is a bust, drawn a bit smaller so heads match the full-body poses
const TYPE_SPEED = 45; // characters per second

export function createCharacters({ ctx, kit, view, state, getLayout, getPixelScale, reducedMotion }) {
  const motion = reducedMotion ? 0 : 1;

  // Customer sprite for a pose ('arrive' | 'idle' | 'happy'), falling back to idle and then to the portrait.
  const poseKey = (typeId, pose) =>
    [`customers/${typeId}_${pose}`, `customers/${typeId}_idle`, `customers/${typeId}`].find((key) => getSprite(key)) ?? `customers/${typeId}`;

  // Draws a character sprite standing on (cx, feetY), with squash (sy) and horizontal stretch (sx).
  function drawCharacter(spriteKey, fallbackColor, initial, cx, feetY, size, { sx = 1, sy = 1, alpha = 1, flip = false } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, feetY);
    ctx.scale(sx * (flip ? -1 : 1), sy);
    const sprite = getSprite(spriteKey);
    if (sprite) drawSmooth(ctx, sprite, -size / 2, -size, size, size);
    else {
      ctx.fillStyle = fallbackColor;
      ctx.beginPath();
      ctx.arc(0, -size / 2, size / 2 - 6, 0, Math.PI * 2);
      ctx.fill();
      kit.text(initial, 0, -size / 2, { size: 18, weight: 800 });
    }
    ctx.restore();
  }

  function drawOrderIcons(recipe, cx, cy, maxWidth) {
    const pixelScale = getPixelScale();
    const n = recipe.ingredients.length;
    if (recipe.pattern === 'square') {
      const s = 16;
      recipe.ingredients.forEach((id, k) => drawIngredient(ctx, id, cx - s + (k % 2) * s, cy - s + Math.floor(k / 2) * s, s, pixelScale));
      return;
    }
    const gap = recipe.pattern === 'group' ? 7 : 1;
    const s = Math.min(22, (maxWidth - gap * (n - 1)) / n);
    const total = n * s + gap * (n - 1);
    const left = cx - total / 2;
    if (recipe.pattern === 'line') kit.roundRect(left - 3, cy - s / 2 - 3, total + 6, s + 6, 6, 'rgba(255, 204, 128, 0.55)');
    recipe.ingredients.forEach((id, k) => {
      const x = left + k * (s + gap);
      drawIngredient(ctx, id, x, cy - s / 2, s, pixelScale);
      if (recipe.pattern === 'group' && k < n - 1) kit.text('+', x + s + gap / 2, cy, { size: 10, weight: 800, color: COLORS.muted });
    });
  }

  function drawOrderBubble(slot, recipe, ratio, pop, urgent) {
    const x = slot.x + 2;
    const w = slot.w - 4;
    const y = slot.y;
    const tailX = slot.x + slot.w / 2;
    const tailY = y + BUBBLE_HEIGHT + 8;
    ctx.save();
    ctx.translate(tailX, tailY);
    const wobble = urgent ? Math.sin(view.time * 14) * 0.04 * motion : 0;
    ctx.rotate(wobble);
    ctx.scale(pop, pop);
    ctx.translate(-tailX, -tailY);
    const stroke = ratio > 0.6 ? COLORS.ink : ratio > 0.3 ? '#c98a00' : COLORS.bad;
    kit.bubble(x, y, w, BUBBLE_HEIGHT, tailX, tailY, { stroke, lineWidth: urgent ? 3 : 2 });
    const lines = kit.wrap(t(`recipe.${recipe.id}`), w - 12, 10, 800).slice(0, 2);
    lines.forEach((line, k) => kit.text(line, x + w / 2, y + 9 + k * 11, { size: 10, weight: 800, color: COLORS.ink }));
    drawOrderIcons(recipe, x + w / 2, y + 37, w - 14);
    kit.roundRect(x + 8, y + BUBBLE_HEIGHT - 8, w - 16, 4, 2, '#eadbc4');
    kit.roundRect(x + 8, y + BUBBLE_HEIGHT - 8, (w - 16) * ratio, 4, 2, ratio > 0.6 ? COLORS.ok : ratio > 0.3 ? COLORS.warn : COLORS.bad);
    ctx.restore();
  }

  // Red "anger" mark next to an impatient customer's head.
  function drawAngerMark(x, y) {
    ctx.strokeStyle = COLORS.bad;
    ctx.lineWidth = 2.5;
    const r = 5 + Math.sin(view.time * 12) * 1.2;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, r * 0.8, 0, Math.PI * 2 * 0.3);
      ctx.stroke();
    }
  }

  function drawCustomers() {
    const layout = getLayout();
    for (const customer of state.customers) {
      const slot = layout.customers[customer.slot];
      const type = customerById[customer.typeId];
      const recipe = recipeById[customer.recipeId];
      const since = view.time - (view.customerSeen.get(customer.uid) ?? -10);
      const arrive = ease(since / ARRIVE_TIME);
      const ratio = clamp01(customer.patience / customer.maxPatience);
      const urgent = ratio < 0.3;
      const phase = customer.uid * 1.7;

      const cx = slot.x + slot.w / 2 + (1 - arrive) * 70 + (urgent ? Math.sin(view.time * 40) * 1.5 * motion : 0);
      const walkHop = since < ARRIVE_TIME ? Math.abs(Math.sin(since * 22)) * 6 * motion : 0;
      const feetY = slot.y + slot.h + 2 - walkHop;
      const breathe = 1 + Math.sin(view.time * 3 + phase) * 0.025 * motion;
      const pose = urgent ? 'angry' : since < ARRIVE_TIME * 2 ? 'arrive' : 'idle';
      const key = poseKey(type.id, pose);
      const angryArt = key.endsWith('_angry');
      drawCharacter(key, type.color, t(`customer.${type.id}`).charAt(0), cx, feetY, angryArt ? CHARACTER * ANGRY_SCALE : CHARACTER, {
        sy: breathe,
        sx: 2 - breathe,
        alpha: arrive,
      });
      if (urgent && !angryArt) drawAngerMark(cx + CHARACTER * 0.32, feetY - CHARACTER * 0.85);

      const pop = ease((since - BUBBLE_DELAY) / 0.25) * (1 + 0.15 * Math.sin(clamp01((since - BUBBLE_DELAY) / 0.25) * Math.PI));
      if (pop > 0.01) drawOrderBubble(slot, recipe, ratio, pop, urgent);
    }

    // Customers leaving: happy hop when served, grumpy shake when they gave up.
    for (const d of view.departures) {
      const k = (view.time - d.at) / LEAVE_TIME;
      if (k >= 1) continue;
      const slot = layout.customers[d.slot];
      const type = customerById[d.typeId];
      const cx = slot.x + slot.w / 2;
      const feetY = slot.y + slot.h + 2;
      if (d.happy) {
        const hop = Math.sin(clamp01(k * 1.4) * Math.PI) * 18 * motion;
        drawCharacter(poseKey(type.id, 'happy'), type.color, '', cx, feetY - hop, CHARACTER, { alpha: 1 - clamp01((k - 0.5) * 2), sy: 1 + 0.08 * Math.sin(k * 20) * motion });
      } else {
        const shake = k < 0.4 ? Math.sin(view.time * 50) * 3 * motion : 0;
        const key = poseKey(type.id, 'angry');
        const size = key.endsWith('_angry') ? CHARACTER * ANGRY_SCALE : CHARACTER;
        drawCharacter(key, type.color, '', cx + shake + ease((k - 0.4) / 0.6) * 60, feetY, size, { alpha: 1 - clamp01((k - 0.4) / 0.6), flip: k > 0.4 });
      }
    }
    view.departures = view.departures.filter((d) => view.time - d.at < LEAVE_TIME);

    // Service counter in front of the customers' legs.
    const first = layout.customers[0];
    const counterY = first.y + first.h - COUNTER_HEIGHT + 4;
    ctx.fillStyle = '#6d4530';
    ctx.fillRect(0, counterY, layout.width, COUNTER_HEIGHT);
    ctx.fillStyle = '#a0694a';
    ctx.fillRect(0, counterY, layout.width, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, counterY + COUNTER_HEIGHT, layout.width, 3);
  }

  // Pip in the bottom corner with a typewriter speech bubble (spec 2.1: never over the grid or tray).
  function drawPip(line, { persistent = false } = {}) {
    const { pip } = getLayout();
    const expression = line?.expression ?? 'neutral';
    const since = line ? view.time - line.shownAt : 10;
    const talkHop = since < 0.3 ? Math.sin((since / 0.3) * Math.PI) * 6 * motion : 0;
    const breathe = 1 + Math.sin(view.time * 2.4) * 0.03 * motion;
    const cx = pip.x + PIP_SIZE / 2;
    const feetY = pip.y + pip.h - 2;
    drawCharacter(`pip/${expression}`, COLORS.cream, 'P', cx, feetY - talkHop, PIP_SIZE, { sy: breathe, sx: 2 - breathe });
    if (!line) return;

    const full = t(line.key, line.vars);
    const shown = full.slice(0, Math.max(1, Math.floor(since * TYPE_SPEED)));
    const bx = pip.x + PIP_SIZE + 10;
    const bw = pip.x + pip.w - bx;
    const lines = kit.wrap(full, bw - 18, 12, 700).slice(0, 3);
    const bh = Math.max(34, lines.length * 15 + 14);
    const by = pip.y + (pip.h - bh) / 2;
    const pulse = persistent ? 1 + Math.sin(view.time * 4) * 0.01 * motion : 1;
    ctx.save();
    ctx.translate(bx, by + bh / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-bx, -(by + bh / 2));
    kit.bubble(bx, by, bw, bh, bx - 9, pip.y + pip.h * 0.45, { stroke: persistent ? COLORS.orange : COLORS.ink, lineWidth: persistent ? 3 : 2 });
    // Typewriter: draw the wrapped lines, cut at the number of characters shown.
    let left = shown.length;
    lines.forEach((text, k) => {
      const visible = text.slice(0, Math.max(0, left));
      left -= text.length + 1;
      kit.text(visible, bx + 10, by + 14 + k * 15, { size: 12, weight: 700, color: COLORS.ink, align: 'left' });
    });
    ctx.restore();
  }

  return { drawCustomers, drawPip };
}
