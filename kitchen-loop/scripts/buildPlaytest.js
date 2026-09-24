// Playtest build for GitHub Pages (kitchen-loop/play/) that keeps the previous build's files.
// GitHub Pages caches pages for a few minutes: a page loaded just before a deploy keeps asking for the old
// hashed sprites. Deleting them showed broken images, so the files of the published build (the one committed
// in git) and of the last local build stay; the published ones come back from git if a local build removed them.
// Usage: npm run build:playtest
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'play');
const ASSETS = join(OUT, 'assets');

// Files in play/assets used by the build that play/index.html points to.
function referenced() {
  const index = join(OUT, 'index.html');
  if (!existsSync(index) || !existsSync(ASSETS)) return new Set();
  const files = readdirSync(ASSETS);
  const used = new Set();
  const pending = [readFileSync(index, 'utf8')];
  while (pending.length > 0) {
    const text = pending.pop();
    for (const file of files) {
      if (used.has(file) || !text.includes(file)) continue;
      used.add(file);
      if (/\.(js|css)$/.test(file)) pending.push(readFileSync(join(ASSETS, file), 'utf8'));
    }
  }
  return used;
}

// Files of the build committed in git (what GitHub Pages is serving), restored if they are missing.
function published() {
  const git = (path) => execSync(`git show HEAD:./play/${path}`, { cwd: join(OUT, '..'), encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] });
  let index;
  try {
    index = git('index.html').toString();
  } catch {
    return new Set(); // nothing published yet
  }
  const names = execSync('git ls-tree --name-only HEAD play/assets/', { cwd: join(OUT, '..'), encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((path) => path.replace('play/assets/', ''));
  const used = new Set();
  const pending = [index];
  while (pending.length > 0) {
    const text = pending.pop();
    for (const file of names) {
      if (used.has(file) || !text.includes(file)) continue;
      used.add(file);
      const content = git(`assets/${file}`);
      if (!existsSync(join(ASSETS, file))) writeFileSync(join(ASSETS, file), content);
      if (/\.(js|css)$/.test(file)) pending.push(content.toString());
    }
  }
  return used;
}

const previous = new Set([...referenced(), ...published()]);
execSync('npx vite build --mode playtest --outDir play --emptyOutDir false', { stdio: 'inherit' });
const current = referenced();
let removed = 0;
for (const file of readdirSync(ASSETS)) {
  if (previous.has(file) || current.has(file)) continue;
  rmSync(join(ASSETS, file));
  removed++;
}
console.log(`playtest: ${current.size} files in use, ${previous.size} kept from the previous build, ${removed} removed`);
