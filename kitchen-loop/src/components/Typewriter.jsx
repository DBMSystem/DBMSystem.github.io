import { useEffect, useRef, useState } from 'react';
import { uiSound } from '../audio/audioManager.js';

const CHARS_PER_SECOND = 45;
const TICK_MS = 30;
const LETTERS_PER_BLIP = 4;

// Reveals `text` letter by letter and calls onDone when it is complete. `skip` shows it at once.
// `voice`: 'pip' | 'brulee' | null — a soft blip every few letters while it types.
export function Typewriter({ text, skip = false, onDone, voice = null }) {
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
    let blips = 0;
    const timer = setInterval(() => {
      const n = Math.min(text.length, Math.floor(((performance.now() - started) / 1000) * CHARS_PER_SECOND));
      if (voice && Math.floor(n / LETTERS_PER_BLIP) > blips) {
        blips = Math.floor(n / LETTERS_PER_BLIP);
        uiSound(voice === 'brulee' ? 'voiceLow' : 'voice');
      }
      setShown(n);
      if (n >= text.length) {
        clearInterval(timer);
        onDoneRef.current?.();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [text, skip, voice]);

  return <span>{text.slice(0, shown)}</span>;
}
