// Small drawing helpers shared by the renderer modules.
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const font = (weight, size) => `${weight} ${size}px ${FONT}`;

export const COLORS = {
  bgTop: '#4a3326',
  bgBottom: '#2b1d14',
  cream: '#fff8e7',
  peach: '#ffcc80',
  orange: '#ff7043',
  purple: '#a78bfa',
  pink: '#f48fb1',
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

export const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function createCanvasKit(ctx) {
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
    const lines = [];
    let line = '';
    for (const word of value.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
    return lines;
  }

  // Rounded speech bubble with a tail pointing at (tailX, tailY), below/above or beside the box.
  function bubble(x, y, w, h, tailX, tailY, { fill = COLORS.cream, stroke = COLORS.ink, lineWidth = 2 } = {}) {
    const HALF = 6;
    let a;
    let b;
    let inward;
    if (tailX < x || tailX > x + w) {
      const sideX = tailX < x ? x : x + w;
      const midY = Math.min(y + h - 12, Math.max(y + 12, tailY));
      a = { x: sideX, y: midY - HALF };
      b = { x: sideX, y: midY + HALF };
      inward = { x: tailX < x ? 1 : -1, y: 0 };
    } else {
      const baseY = tailY > y + h ? y + h : y;
      const midX = Math.min(x + w - 12, Math.max(x + 12, tailX));
      a = { x: midX - HALF, y: baseY };
      b = { x: midX + HALF, y: baseY };
      inward = { x: 0, y: tailY > y + h ? -1 : 1 };
    }
    const tail = (p, q, tip) => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(q.x, q.y);
      ctx.closePath();
    };
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    tail(a, b, { x: tailX, y: tailY });
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    // Cover the box outline where the tail joins it.
    const d = lineWidth * 1.2;
    const along = inward.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
    tail(
      { x: a.x + inward.x * d + along.x * lineWidth * 0.6, y: a.y + inward.y * d + along.y * lineWidth * 0.6 },
      { x: b.x + inward.x * d - along.x * lineWidth * 0.6, y: b.y + inward.y * d - along.y * lineWidth * 0.6 },
      { x: tailX + inward.x * d * 1.6, y: tailY + inward.y * d * 1.6 },
    );
    ctx.fill();
  }

  return { roundRect, text, wrap, bubble };
}
