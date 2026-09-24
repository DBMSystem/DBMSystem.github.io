// Development tools (ad mock, FPS counter, test-level selector) exist only in dev
// and in the "playtest" build used to try the game on a phone. Never in production.
export const DEV_TOOLS = import.meta.env.DEV || import.meta.env.MODE === 'playtest';
