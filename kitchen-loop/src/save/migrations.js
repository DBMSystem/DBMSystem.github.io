// migrations[n] turns a version n save into version n + 1. Applied in order on load.
export const migrations = {};

export function migrate(raw, targetVersion) {
  let data = raw;
  while (data.saveVersion < targetVersion) {
    const step = migrations[data.saveVersion];
    if (!step) return null;
    data = { ...step(data), saveVersion: data.saveVersion + 1 };
  }
  return data;
}
