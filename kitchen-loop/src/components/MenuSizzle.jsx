// Life over the pan cooking at the bottom of the menu art (Daniel: "quiero que se vea más, con más chispas y
// partículas"): a flickering warm glow, embers rising, golden twinkles and steam. Pure CSS animations, laid out once.
const EMBERS = 26;
const TWINKLES = 10;
const STEAM = 4;

// Fixed pseudo-random spread (same layout on every visit, no re-render needed).
const spread = (i, seed) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const items = (count, seed, make) => Array.from({ length: count }, (_, i) => make(i, (k) => spread(i, seed + k)));

const embers = items(EMBERS, 1, (i, r) => ({
  left: `${8 + r(0) * 82}%`,
  '--rise': `${55 + r(1) * 90}%`,
  '--drift': `${(r(2) - 0.5) * 40}px`,
  '--size': `${4 + Math.round(r(3) * 3)}px`,
  '--dur': `${1.2 + r(4) * 1.4}s`,
  '--delay': `${-r(5) * 3}s`,
  '--color': i % 3 === 0 ? '#ffe082' : i % 3 === 1 ? '#ffb74d' : '#ff7043',
}));

const twinkles = items(TWINKLES, 7, (i, r) => ({
  left: `${10 + r(0) * 78}%`,
  top: `${r(1) * 70}%`,
  '--size': `${16 + Math.round(r(2) * 14)}px`,
  '--dur': `${1.6 + r(3) * 1.4}s`,
  '--delay': `${-r(4) * 3}s`,
}));

const steam = items(STEAM, 13, (i, r) => ({
  left: `${18 + i * 18 + r(0) * 8}%`,
  '--dur': `${3.2 + r(1) * 1.6}s`,
  '--delay': `${-i * 0.9}s`,
}));

export function MenuSizzle() {
  return (
    <div className="sizzle" aria-hidden="true">
      <span className="sizzle-glow" />
      {steam.map((style, i) => (
        <span key={`s${i}`} className="sizzle-steam" style={style} />
      ))}
      {embers.map((style, i) => (
        <span key={`e${i}`} className="sizzle-ember" style={style} />
      ))}
      {twinkles.map((style, i) => (
        <span key={`t${i}`} className="sizzle-twinkle" style={style} />
      ))}
    </div>
  );
}
