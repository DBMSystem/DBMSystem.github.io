// versionCode derived from package.json version: 1.1.0 → 10100. Same value in CI and in local builds,
// so any APK of a newer version installs over an older one.
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const [major, minor, patch] = version.split('.').map(Number);
console.log(major * 10000 + minor * 100 + patch);
