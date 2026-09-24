import { useEffect, useRef, useState } from 'react';

const CHARS_PER_SECOND = 45;
const TICK_MS = 30;

// Reveals `text` letter by letter and calls onDone when it is complete. `skip` shows it at once.
export function Typewriter({ text, skip = false, onDone }) {
  const [shown, setShown] = useState(skip ? text.length : 0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (skip) {
      setShown(text.length);
      return undefined;
    }
    setShown(0);
    const started = performance.now();
    const timer = setInterval(() => {
      const n = Math.min(text.length, Math.floor(((performance.now() - started) / 1000) * CHARS_PER_SECOND));
      setShown(n);
      if (n >= text.length) {
        clearInterval(timer);
        onDoneRef.current?.();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [text, skip]);

  return <span>{text.slice(0, shown)}</span>;
}
