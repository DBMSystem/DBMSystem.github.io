import { particleTypes } from '../data/particles.js';

// Fixed-size particle pool: no allocation per frame (spec 9.2, 10.7).
export function createParticles(max) {
  const pool = Array.from({ length: max }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, gravity: 0, size: 1, color: '' }));
  let limit = max;

  function burst(typeId, x, y, count, rng = Math.random) {
    const type = particleTypes[typeId];
    let spawned = 0;
    for (let i = 0; i < limit && spawned < count; i++) {
      const p = pool[i];
      if (p.alive) continue;
      const angle = rng() * Math.PI * 2;
      const speed = type.speed * (0.4 + rng() * 0.8);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = p.life = type.life * (0.7 + rng() * 0.6);
      p.gravity = type.gravity;
      p.size = type.size;
      p.color = type.colors[Math.floor(rng() * type.colors.length)];
      spawned++;
    }
  }

  function update(dt) {
    for (const p of pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function draw(ctx) {
    for (const p of pool) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  const setLimit = (value) => {
    limit = Math.min(max, value);
  };

  return { burst, update, draw, setLimit };
}
