import { useEffect, useRef } from 'react';

// Android Back button (spec 8.9). Overlays push a handler while they are open and the newest one answers;
// with none open, the root handler (App: the current screen) does.
const stack = [];
let root = null;

export function pushBackHandler(fn) {
  const entry = { fn };
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1);
  };
}

export function setRootBackHandler(fn) {
  root = fn;
  return () => {
    if (root === fn) root = null;
  };
}

// Returns false when nobody handled it (the app may then close).
export function handleBack() {
  const handler = stack.at(-1)?.fn ?? root;
  if (!handler) return false;
  handler();
  return true;
}

// While `active`, Back calls `handler` (the latest one passed).
export function useBackButton(handler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => (active ? pushBackHandler(() => ref.current()) : undefined), [active]);
}
