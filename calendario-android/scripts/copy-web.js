// The web app in ../calendario is the single source: copy it into www/ for Capacitor.
// The service worker and the tests are left out: inside the APK the files are already local.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, '..', 'calendario');
const out = join(root, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of readdirSync(src)) {
  if (f === 'sw.js' || f === 'tests') continue;
  cpSync(join(src, f), join(out, f), { recursive: true });
}
console.log('Copied', readdirSync(out).join(', '));
