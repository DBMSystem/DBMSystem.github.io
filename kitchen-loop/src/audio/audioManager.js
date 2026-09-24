import { sfx } from './sfx.js';
import { onAppLifecycle } from '../utils/lifecycle.js';

// Plays synthesised effects. The AudioContext starts on the first touch (browser rule, spec 9.5)
// and is suspended while the app is in the background.
export function createAudioManager({ getVolume }) {
  let ctx = null;
  let noiseBuffer = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function play(name) {
    const volume = getVolume();
    const recipe = sfx[name];
    if (!recipe || volume <= 0 || !ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + 0.01;
    for (const part of recipe) {
      const gain = ctx.createGain();
      const peak = 0.25 * volume * part.gain;
      const t0 = start + part.at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + part.dur);
      let source;
      if (part.noise) {
        source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = part.filter;
        source.connect(filter).connect(gain);
      } else {
        source = ctx.createOscillator();
        source.type = part.wave;
        source.frequency.setValueAtTime(part.freq, t0);
        if (part.slideTo) source.frequency.exponentialRampToValueAtTime(part.slideTo, t0 + part.dur);
        source.connect(gain);
      }
      gain.connect(ctx.destination);
      source.start(t0);
      source.stop(t0 + part.dur + 0.02);
    }
  }

  const unlock = () => ensureContext()?.resume();
  window.addEventListener('pointerdown', unlock, { passive: true });
  onAppLifecycle({ hidden: () => ctx?.suspend(), shown: () => ctx?.resume() });

  return { play };
}
