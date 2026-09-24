// Seeded RNG (mulberry32) so tests and simulations are reproducible.
export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  const pick = (list) => list[int(list.length)];
  const weighted = (list, weightOf) => {
    const total = list.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = next() * total;
    for (const item of list) {
      roll -= weightOf(item);
      if (roll < 0) return item;
    }
    return list[list.length - 1];
  };
  return { next, int, pick, weighted };
}
