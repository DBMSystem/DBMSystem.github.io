import { ingredientById } from '../../data/ingredients.js';
import { t } from '../../utils/i18n.js';

// Procedural placeholder art (D-2): a distinctive shape and colour per ingredient plus its initial.
// Each sprite is drawn once per pixel size into an offscreen canvas and reused.
const cache = new Map();

function shape(ctx, def, s) {
  const c = s / 2;
  ctx.fillStyle = def.color;
  ctx.strokeStyle = 'rgba(40, 24, 16, 0.55)';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  switch (def.shape) {
    case 'egg':
      ctx.ellipse(c, c, s * 0.36, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(c, c, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'strip':
      ctx.moveTo(s * 0.12, s * 0.3);
      ctx.bezierCurveTo(s * 0.35, s * 0.18, s * 0.6, s * 0.42, s * 0.88, s * 0.3);
      ctx.lineTo(s * 0.88, s * 0.62);
      ctx.bezierCurveTo(s * 0.6, s * 0.74, s * 0.35, s * 0.5, s * 0.12, s * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(s * 0.16, s * 0.46);
      ctx.bezierCurveTo(s * 0.38, s * 0.34, s * 0.6, s * 0.58, s * 0.84, s * 0.46);
      ctx.stroke();
      return;
    case 'loaf':
      ctx.roundRect(s * 0.16, s * 0.2, s * 0.68, s * 0.6, s * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.roundRect(s * 0.26, s * 0.34, s * 0.48, s * 0.36, s * 0.08);
      ctx.fill();
      return;
    case 'round':
      ctx.arc(c, c + s * 0.04, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.ellipse(c, c - s * 0.26, s * 0.14, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'wedge':
      ctx.moveTo(s * 0.14, s * 0.74);
      ctx.lineTo(s * 0.86, s * 0.74);
      ctx.lineTo(s * 0.86, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.accent;
      for (const [x, y, r] of [[0.66, 0.58, 0.06], [0.76, 0.42, 0.04], [0.5, 0.66, 0.04]]) {
        ctx.beginPath();
        ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    case 'cap':
      ctx.fillStyle = def.accent;
      ctx.roundRect(s * 0.4, s * 0.46, s * 0.2, s * 0.32, s * 0.06);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(c, s * 0.5, s * 0.32, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    case 'oval':
      ctx.ellipse(c, c, s * 0.34, s * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.accent;
      for (const [x, y] of [[0.4, 0.44], [0.58, 0.56], [0.62, 0.4]]) {
        ctx.beginPath();
        ctx.arc(s * x, s * y, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    case 'bulb':
      ctx.moveTo(c, s * 0.14);
      ctx.bezierCurveTo(s * 0.62, s * 0.3, s * 0.84, s * 0.4, s * 0.8, s * 0.6);
      ctx.bezierCurveTo(s * 0.74, s * 0.84, s * 0.26, s * 0.84, s * 0.2, s * 0.6);
      ctx.bezierCurveTo(s * 0.16, s * 0.4, s * 0.38, s * 0.3, c, s * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.accent;
      ctx.beginPath();
      ctx.moveTo(c, s * 0.3);
      ctx.quadraticCurveTo(s * 0.4, s * 0.55, c, s * 0.78);
      ctx.stroke();
      return;
    case 'leaf':
      for (const angle of [-0.7, 0, 0.7]) {
        ctx.save();
        ctx.translate(c, s * 0.72);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.24, s * 0.1, s * 0.24, 0, 0, Math.PI * 2);
        ctx.fillStyle = angle === 0 ? def.color : def.accent;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      return;
    case 'fish':
      ctx.moveTo(s * 0.7, c);
      ctx.lineTo(s * 0.9, s * 0.3);
      ctx.lineTo(s * 0.9, s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.44, c, s * 0.3, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.arc(s * 0.28, s * 0.46, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      return;
    default:
      ctx.arc(c, c, s * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }
}

function render(id, px) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d');
  const def = ingredientById[id];
  shape(ctx, def, px);
  if (px >= 32) {
    const initial = t(`ingredient.${id}`).charAt(0);
    ctx.font = `800 ${Math.round(px * 0.24)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = px * 0.06;
    ctx.strokeStyle = '#fff8e7';
    ctx.strokeText(initial, px * 0.94, px * 0.98);
    ctx.fillStyle = '#3b2a20';
    ctx.fillText(initial, px * 0.94, px * 0.98);
  }
  return canvas;
}

// Sprites are cached in 16 px steps so animated sizes reuse a few entries instead of one per frame.
const CACHE_STEP = 16;

// Draws ingredient `id` in a logical box (x, y, size). `pixelScale` = device pixels per logical pixel.
export function drawIngredient(ctx, id, x, y, size, pixelScale) {
  const px = Math.max(CACHE_STEP, Math.ceil((size * pixelScale) / CACHE_STEP) * CACHE_STEP);
  const key = `${id}:${px}`;
  if (!cache.has(key)) cache.set(key, render(id, px));
  ctx.drawImage(cache.get(key), x, y, size, size);
}

export function clearPlaceholderCache() {
  cache.clear();
}
