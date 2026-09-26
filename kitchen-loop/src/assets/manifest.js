// Every sprite goes through this manifest (spec 9.1, D-2). Keys: '<group>/<id>', e.g. 'ingredients/egg'.
// A missing key simply falls back to the procedural placeholder, so new art is just a new file.
import scales from './spriteScales.json';

const files = import.meta.glob('./sprites/**/*.{png,jpg}', { eager: true, query: '?url', import: 'default' });
// The cosmetic pans live in the project's assets/ folder (never modified): keys 'pans/<id>'.
const pans = import.meta.glob('../../assets/pan_*.png', { eager: true, query: '?url', import: 'default' });

export const manifest = Object.fromEntries([
  ...Object.entries(files).map(([path, url]) => [path.replace('./sprites/', '').replace(/\.\w+$/, ''), url]),
  ...Object.entries(pans).map(([path, url]) => [`pans/${path.match(/pan_(\w+)\.png$/)[1]}`, url]),
]);

const images = new Map();

// Preloads sprites (all the canvas ones by default: the card illustrations are plain <img> in the album).
// Never rejects: an image that fails keeps its placeholder.
export function loadSprites(keys = Object.keys(manifest).filter((key) => !key.startsWith('cards/'))) {
  return Promise.all(
    keys.map(
      (key) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(key, img);
            resolve();
          };
          img.onerror = resolve;
          img.src = manifest[key];
        }),
    ),
  );
}

export const getSprite = (key) => images.get(key) ?? null;
export const spriteUrl = (key) => manifest[key];

// Draw scale that gives round and long foods the same visual size (written by scripts/extract_sprites.py).
export const spriteScale = (key) => scales[key] ?? 1;
