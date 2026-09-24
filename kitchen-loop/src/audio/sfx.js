// Sound effects synthesised with Web Audio (spec 9.5) while there are no final sounds.
// Each recipe describes notes: [frequency, start (s), duration (s), wave, slideTo?] and noise bursts.
const NOTE = (freq, at, dur, wave = 'triangle', slideTo = null, gain = 1) => ({ freq, at, dur, wave, slideTo, gain });
const NOISE = (at, dur, filter, gain = 1) => ({ noise: true, at, dur, filter, gain });

const arpeggio = (freqs, step, dur, wave = 'triangle', gain = 1) => freqs.map((f, i) => NOTE(f, i * step, dur, wave, null, gain));

export const sfx = {
  tap: [NOTE(700, 0, 0.04, 'sine', null, 0.5)],
  place: [NOTE(520, 0, 0.08, 'sine', 260)],
  glow: [NOTE(880, 0, 0.12, 'triangle', null, 0.35), NOTE(1320, 0.06, 0.14, 'triangle', null, 0.3)],
  cook: [NOISE(0, 0.22, 2400, 0.6), NOTE(330, 0, 0.1, 'square', 520, 0.4)],
  noRecipe: [NOTE(140, 0, 0.09, 'sine', 90, 0.7)],
  serve: [NOTE(1047, 0, 0.12), NOTE(1319, 0.1, 0.18)],
  customerLeft: [NOTE(392, 0, 0.18, 'triangle', 330), NOTE(311, 0.16, 0.3, 'triangle', 247)],
  perfect: arpeggio([523, 659, 784, 1047, 1319], 0.06, 0.14, 'square', 0.5),
  fever: [NOTE(200, 0, 0.45, 'sawtooth', 820, 0.35), NOISE(0.05, 0.4, 1200, 0.3), ...arpeggio([659, 784, 988], 0.08, 0.12, 'square', 0.4)],
  overflow: [NOTE(110, 0, 0.55, 'sawtooth', 70, 0.5), NOISE(0, 0.3, 400, 0.4)],
  secret: arpeggio([784, 988, 1175, 1568, 1976], 0.07, 0.25, 'sine', 0.6),
  secondChance: arpeggio([392, 523, 659], 0.08, 0.15),
  levelUp: arpeggio([523, 659, 784, 1047, 784, 1047], 0.09, 0.16, 'square', 0.45),
  coin: [NOTE(1568, 0, 0.06, 'square', null, 0.35), NOTE(2093, 0.05, 0.12, 'square', null, 0.35)],
  packOpen: [NOISE(0, 0.25, 3000, 0.5), NOTE(262, 0.05, 0.2, 'triangle', 523)],
  cardCommon: [NOTE(600, 0, 0.08, 'sine', 900)],
  cardRare: [NOTE(1319, 0, 0.3, 'sine', null, 0.6), NOTE(1760, 0.08, 0.35, 'sine', null, 0.5)],
  cardEpic: [NOISE(0, 0.35, 1800, 0.35), NOTE(300, 0, 0.3, 'sawtooth', 1200, 0.25), NOTE(1568, 0.28, 0.35, 'sine', null, 0.6), NOTE(2093, 0.36, 0.4, 'sine', null, 0.5)],
  cardLegendary: [...arpeggio([523, 659, 784, 1047, 1319, 1568, 2093], 0.09, 0.35, 'sine', 0.55), NOISE(0.5, 0.6, 5000, 0.2)],
};
