import { musicTracks } from '../data/music.js';

// Provisional music (spec 9.5, D-3): plays the tracks of src/data/music.js with Web Audio, scheduling a little
// ahead of time so it keeps the beat. Soft keys, bass, a lead, light drums; the game track adds a layer in a
// fever and the Cocina Nocturna adds rain. It waits for the AudioContext (first touch) and stays silent at volume 0.
const LOOKAHEAD = 0.15; // s scheduled ahead
const TICK_MS = 40;
const MASTER = 0.3; // music sits under the effects
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

export function createMusic({ getContext, getNoise, getVolume }) {
  let ctx = null;
  let out = null;
  let tone = null;
  let rain = null;
  let trackId = null;
  let night = false;
  let step = 0;
  let nextAt = 0;
  const layers = new Set();

  function connect() {
    if (out) return true;
    ctx = getContext();
    if (!ctx) return false;
    out = ctx.createGain();
    out.gain.value = 0;
    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.connect(out);
    out.connect(ctx.destination);
    return true;
  }

  // One note: a quick attack and an exponential fade over its length.
  function note(freq, at, length, { wave = 'triangle', gain = 0.1, attack = 0.01, dest = tone } = {}) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + attack + length);
    osc.connect(env).connect(dest);
    osc.start(at);
    osc.stop(at + attack + length + 0.05);
  }

  function noise(at, length, frequency, gain) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = frequency;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(band).connect(env).connect(tone);
    src.start(at);
    src.stop(at + length + 0.02);
  }

  function kick(at) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.14);
    env.gain.setValueAtTime(0.5, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + 0.25);
  }

  function playStep(track, s, at, stepLength) {
    const bar = track.bars[Math.floor(s / 16) % track.bars.length];
    const inBar = s % 16;
    for (const [when, length] of track.keys) {
      if (when !== inBar) continue;
      bar.chord.forEach((n, i) => {
        note(hz(n), at + i * 0.012, length * stepLength, { gain: 0.045, attack: 0.02 }); // a soft strum
        note(hz(n + 12), at + i * 0.012, length * stepLength * 0.5, { wave: 'sine', gain: 0.015 });
      });
    }
    for (const [when, interval, length] of track.bass) {
      if (when === inBar) note(hz(bar.root + interval), at, length * stepLength, { gain: 0.13, attack: 0.008 });
    }
    for (const [when, n, length] of bar.melody) {
      if (when !== inBar) continue;
      note(hz(n), at, length * stepLength, { gain: 0.07, attack: 0.015 });
      note(hz(n) * 2.005, at, length * stepLength * 0.6, { wave: 'sine', gain: 0.012 }); // a little shine
    }
    const { kick: kicks, snare, hat } = track.drums;
    if (kicks.includes(inBar)) kick(at);
    if (snare.includes(inBar)) noise(at, 0.12, 1900, 0.09);
    if (hat.includes(inBar)) noise(at, 0.035, 8000, 0.035);
    if (track.fever && layers.has('fever')) {
      if (track.fever.arp) {
        const n = bar.chord[inBar % bar.chord.length] + 24;
        note(hz(n), at, stepLength * 0.9, { wave: 'square', gain: 0.018, attack: 0.004 });
      }
      if (track.fever.hat.includes(inBar)) noise(at, 0.03, 9500, 0.03);
    }
  }

  function startRain() {
    if (rain) return;
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1300;
    const env = ctx.createGain();
    env.gain.value = 0.05;
    src.connect(low).connect(env).connect(out);
    src.start();
    rain = src;
  }

  function stopRain() {
    rain?.stop();
    rain = null;
  }

  function tick() {
    if (!trackId || !connect() || ctx.state !== 'running') return;
    const track = musicTracks[trackId];
    const volume = getVolume();
    out.gain.setTargetAtTime(volume * MASTER, ctx.currentTime, 0.2);
    tone.frequency.setTargetAtTime(track.filter * (night ? 0.55 : 1), ctx.currentTime, 0.3);
    if ((track.rain || night) && volume > 0) startRain();
    else stopRain();
    if (volume <= 0) return;
    const stepLength = 60 / track.bpm / 4;
    if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05; // after a pause or on start
    while (nextAt < ctx.currentTime + LOOKAHEAD) {
      const swing = step % 2 === 1 ? stepLength * track.swing : 0;
      playStep(track, step, nextAt + swing, stepLength);
      nextAt += stepLength;
      step = (step + 1) % (track.bars.length * 16);
    }
  }

  setInterval(tick, TICK_MS);

  return {
    // `id`: menu | game | night. `options.night`: the Cocina Nocturna (darker sound and rain).
    play(id, options = {}) {
      if (id === trackId && Boolean(options.night) === night) return;
      if (id !== trackId) {
        step = 0;
        nextAt = 0;
        layers.clear();
      }
      trackId = id;
      night = Boolean(options.night);
    },
    setLayer(name, on) {
      if (on) layers.add(name);
      else layers.delete(name);
    },
    stop() {
      trackId = null;
      if (out) stopRain();
    },
  };
}
