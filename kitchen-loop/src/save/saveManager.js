import { createDefaultSave, validateSave, SAVE_VERSION } from './schema.js';
import { migrate } from './migrations.js';

const MAIN_KEY = 'kitchenloop.save';
const TEMP_KEY = 'kitchenloop.save.tmp';
const BACKUP_KEY = 'kitchenloop.save.backup';

function parse(text) {
  if (!text) return null;
  try {
    const raw = JSON.parse(text);
    const migrated = raw && Number.isInteger(raw.saveVersion) ? migrate(raw, SAVE_VERSION) : null;
    return migrated && validateSave(migrated);
  } catch {
    return null;
  }
}

// Owns the save in memory; everything else reads it with get() and changes it with update().
export function createSaveManager(storage, { now = Date.now, onEvent = () => {} } = {}) {
  let data = null;

  async function load() {
    data = parse(await storage.get(MAIN_KEY));
    if (!data) {
      data = parse(await storage.get(BACKUP_KEY));
      if (data) onEvent('save_recovered');
      else {
        const existed = (await storage.get(MAIN_KEY)) !== null;
        data = createDefaultSave(now());
        if (existed) onEvent('save_reset');
      }
    }
    data.lastSeenTimestamp = Math.max(data.lastSeenTimestamp, now());
    return data;
  }

  // Safe write: temp key, keep the last valid save as backup, then the main key.
  async function persist() {
    data.lastSavedAt = now();
    data.lastSeenTimestamp = Math.max(data.lastSeenTimestamp, data.lastSavedAt);
    const text = JSON.stringify(data);
    await storage.set(TEMP_KEY, text);
    const previous = await storage.get(MAIN_KEY);
    if (parse(previous)) await storage.set(BACKUP_KEY, previous);
    await storage.set(MAIN_KEY, text);
    await storage.remove(TEMP_KEY);
  }

  async function update(change) {
    change(data);
    await persist();
    return data;
  }

  // Deletes the game (settings "Borrar partida"): a brand-new save, backup included.
  async function reset() {
    data = createDefaultSave(now());
    await storage.remove(BACKUP_KEY);
    await persist();
    await storage.remove(BACKUP_KEY);
    return data;
  }

  return { load, get: () => data, update, persist, reset };
}
