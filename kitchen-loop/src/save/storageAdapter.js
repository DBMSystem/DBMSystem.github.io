import { Preferences } from '@capacitor/preferences';

// Async key/value storage (spec 11.2). Browser: localStorage (development). Android: @capacitor/preferences,
// which survives the WebView clearing its data and forced closes.
export const preferencesAdapter = {
  async get(key) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

export const localStorageAdapter = {
  async get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
  },
  async remove(key) {
    window.localStorage.removeItem(key);
  },
};

export function createMemoryAdapter(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
  };
}
