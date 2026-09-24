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
// Special and legendary customers are full-body chibis: drawn bigger and sunk behind the counter so their
// heads are the size of the common customers' heads (Daniel: consistent sizes).
const PORTRAIT_SCALE = 1.25;
const PORTRAIT_SINK = 0.2; // share of the sprite hidden behind the counter
const TYPE_SPEED = 45; // characters per second
const REACTION_DELAY = 0.5; // after the points and "¡Servido!" have floated away
const REACTION_TIME = 1.5; // a served customer's line stays this long (they keep it while leaving)

export function createCharacters({ ctx, kit, view, state, getLayout, getPixelScale, reducedMotion }) {
  const motion = reducedMotion ? 0 : 1;

  // Customer sprite for a pose ('arrive' | 'idle' | 'happy'), falling back to idle and then to the portrait.
  const poseKey = (typeId, pose) =>
    [`customers/${typeId}_${pose}`, `customers/${typeId}_idle`, `customers/${typeId}`].find((key) => getSprite(key)) ?? `customers/${typeId}`;

  // Draws a character sprite `size` tall standing on (cx, feetY), with squash (sy) and horizontal stretch (sx).
  function drawCharacter(spriteKey, fallbackColor, initial, cx, feetY, size, { sx = 1, sy = 1, alpha = 1, flip = false } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, feetY);
    ctx.scale(sx * (flip ? -1 : 1), sy);
    const sprite = getSprite(spriteKey);
    // `size` is the height; wide sprites (poses with props) keep their proportions so heads match.
    const width = sprite ? (size * sprite.width) / sprite.height : size;
    if (sprite) drawSmooth(ctx, sprite, -width / 2, -size, width, size);
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
    // Narrow bubbles (4 customers on the Runic Counter) use a smaller font before cutting the name.
    const name = t(`recipe.${recipe.id}`);
    const size = kit.wrap(name, w - 12, 10, 800).length > 2 ? 8 : 10;
    const lines = kit.wrap(name, w - 12, size, 800).slice(0, 2);
    lines.forEach((line, k) => kit.text(line, x + w / 2, y + 9 + k * (size + 1), { size, weight: 800, color: COLORS.ink }));
    drawOrderIcons(recipe, x + w / 2, y + 37, w - 14);
    kit.roundRect(x + 8, y + BUBBLE_HEIGHT - 8, w - 16, 4, 2, '#eadbc4');
    kit.roundRect(x + 8, y + BUBBLE_HEIGHT - 8, (w - 16) * ratio, 4, 2, ratio > 0.6 ? COLORS.ok : ratio > 0.3 ? COLORS.warn : COLORS.bad);
    ctx.restore();
  }

  // A served customer's reaction, in a small bubble where their order was (content: react.<type>.n).
  function drawReaction(slot, text, k) {
    if (k >= 1) return;
    const pop = ease(k / 0.12) * (1 - clamp01((k - 0.8) / 0.2));
    const x = slot.x + 4;
    const w = slot.w - 8;
    const size = kit.wrap(text, w - 10, 10, 800).length > 2 ? 8 : 10;
    const lines = kit.wrap(text, w - 10, size, 800).slice(0, 2);
    const h = 12 + lines.length * (size + 2);
    const y = slot.y + 18;
    const tailX = slot.x + slot.w / 2;
    ctx.save();
    ctx.globalAlpha *= pop;
    ctx.translate(tailX, y + h);
    ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
    ctx.translate(-tailX, -(y + h));
    kit.bubble(x, y, w, h, tailX, y + h + 7, { stroke: COLORS.ok, lineWidth: 2 });
    lines.forEach((line, i) => kit.text(line, x + w / 2, y + 6 + size / 2 + i * (size + 2), { size, weight: 800, color: COLORS.ink }));
    ctx.restore();
  }

  // Red "anger" mark next to an impatient customer's head.
  function drawAngerMark(x, y) {
    ctx.strokeStyle = COLORS.bad;
    ctx.lineWidth = 2.5;
    const r = 5 + Math.sin(view.time * 12) * 1.2;
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, r * 0.8, 0, Math.PI * 2 * 0.3);
      ctx.stroke();
    }
  }

  // Special and legendary customers: every pose is their full-body portrait (happy with hearts, angry flushed).
  const fromPortrait = (typeId) => !getSprite(`customers/${typeId}_idle`);

  // Height and extra depth (below the feet line) of a customer sprite.
  function customerArt(typeId, key) {
    if (fromPortrait(typeId)) return { size: CHARACTER * PORTRAIT_SCALE, sink: CHARACTER * PORTRAIT_SCALE * PORTRAIT_SINK };
    if (key.endsWith('_angry')) return { size: CHARACTER * ANGRY_SCALE, sink: 0 };
    return { size: CHARACTER, sink: 0 };
  }

  function drawCustomers() {
    const layout = getLayout();
    const frozen = state.time < state.frozenUntil;
    const first = layout.customers[0];
    const counterY = first.y + first.h - COUNTER_HEIGHT + 4;
    // Nothing of the customers shows below the counter.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, layout.width, counterY + COUNTER_HEIGHT);
    ctx.clip();
    for (const customer of state.customers) {
      const slot = layout.customers[customer.slot];
      const type = customerById[customer.typeId];
      const recipe = recipeById[customer.recipeId];
      const since = view.time - (view.customerSeen.get(customer.uid) ?? -10);
      const arrive = ease(since / ARRIVE_TIME);
      const ratio = clamp01(customer.patience / customer.maxPatience);
      const phase = customer.uid * 1.7;
      // Their dish in the pan (spec 2.6): happy and bouncing while it will be ready in time, angry if it will burn.
      const cooking = customer.cooking;
      const late = Boolean(cooking) && !frozen && customer.patience < cooking.readyAt - state.time;
      const expecting = Boolean(cooking) && !late && view.time >= (view.pans[customer.slot]?.landAt ?? 0);
      const urgent = late || (!cooking && ratio < 0.3 && !frozen);

      const cx = slot.x + slot.w / 2 + (1 - arrive) * 70 + (urgent ? Math.sin(view.time * 40) * 1.5 * motion : 0);
      const walkHop = since < ARRIVE_TIME ? Math.abs(Math.sin(since * 22)) * 6 * motion : 0;
      const eagerHop = expecting ? Math.abs(Math.sin(view.time * 6 + phase)) * 4 * motion : 0;
      const feetY = slot.y + slot.h + 2 - walkHop - eagerHop;
      const breathe = 1 + Math.sin(view.time * 3 + phase) * 0.025 * motion;
      const pose = urgent ? 'angry' : expecting ? 'happy' : since < ARRIVE_TIME * 2 ? 'arrive' : 'idle';
      const key = poseKey(type.id, pose);
      const angryArt = key.endsWith('_angry') && !fromPortrait(type.id); // the portrait poses still get the mark
      const art = customerArt(type.id, key);
      drawCharacter(key, type.color, t(`customer.${type.id}`).charAt(0), cx, feetY + art.sink, art.size, {
        sy: breathe,
        sx: 2 - breathe,
        alpha: arrive,
      });
      if (urgent && !angryArt) drawAngerMark(cx + CHARACTER * 0.32, feetY - CHARACTER * 0.85);
      if (expecting) {
        const heart = getSprite('vfx/hearts');
        const s = 20 + Math.sin(view.time * 5 + phase) * 3 * motion;
        if (heart) drawSmooth(ctx, heart, cx + CHARACTER * 0.3 - s / 2, feetY - CHARACTER * 0.95 - s / 2, s, s);
      }
      // Special customers wear a star, legendary ones a crown (spec 3.3: own visual personality).
      const badge = getSprite(type.category === 'legendary' ? 'ui/icon_legendary' : type.category === 'special' ? 'ui/icon_rare' : '');
      if (badge) {
        const s = 22 + Math.sin(view.time * 4 + phase) * 2 * motion;
        drawSmooth(ctx, badge, cx - CHARACTER * 0.42 - s / 2, feetY - CHARACTER * 0.9 - s / 2, s, s);
      }

      const pop = ease((since - BUBBLE_DELAY) / 0.25) * (1 + 0.15 * Math.sin(clamp01((since - BUBBLE_DELAY) / 0.25) * Math.PI));
      if (pop > 0.01) drawOrderBubble(slot, recipe, ratio, pop, urgent);
      // Their dish is already in the pan (spec 2.6).
      if (customer.cooking && pop > 0.01) kit.roundRect(slot.x + 2, slot.y, slot.w - 4, BUBBLE_HEIGHT, 10, 'rgba(102, 187, 106, 0.22)', COLORS.ok, 2);
      if (frozen) kit.roundRect(slot.x + 2, slot.y, slot.w - 4, BUBBLE_HEIGHT, 10, 'rgba(129, 212, 250, 0.35)', '#81d4fa', 2);
    }

    // Customers leaving: happy hop when served, grumpy shake when they gave up.
    for (const d of view.departures) {
      const k = (view.time - d.at) / LEAVE_TIME;
      const slot = layout.customers[d.slot];
      if (d.line && view.time - d.at >= REACTION_DELAY) drawReaction(slot, t(d.line), (view.time - d.at - REACTION_DELAY) / REACTION_TIME);
      if (k >= 1) continue;
      const type = customerById[d.typeId];
      const cx = slot.x + slot.w / 2;
      const feetY = slot.y + slot.h + 2;
      if (d.happy) {
        const hop = Math.sin(clamp01(k * 1.4) * Math.PI) * 18 * motion;
        const key = poseKey(type.id, 'happy');
        const art = customerArt(type.id, key);
        drawCharacter(key, type.color, '', cx, feetY - hop + art.sink, art.size, {
          alpha: 1 - clamp01((k - 0.5) * 2),
          sy: 1 + 0.08 * Math.sin(k * 20) * motion,
        });
      } else {
        const shake = k < 0.4 ? Math.sin(view.time * 50) * 3 * motion : 0;
        const key = poseKey(type.id, 'angry');
        const art = customerArt(type.id, key);
        drawCharacter(key, type.color, '', cx + shake + ease((k - 0.4) / 0.6) * 60, feetY + art.sink, art.size, {
          alpha: 1 - clamp01((k - 0.4) / 0.6),
          flip: k > 0.4,
        });
      }
    }
    view.departures = view.departures.filter((d) => view.time - d.at < Math.max(LEAVE_TIME, d.line ? REACTION_DELAY + REACTION_TIME : 0));
    ctx.restore();

    // Service counter in front of the customers' legs.
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
