// Provisional music (spec 9.5, D-3), synthesised by src/audio/music.js until there are final tracks. draft: true.
// Bass notes sit an octave higher than a real bass: phone speakers do not reproduce the lowest one.
// Steps are 16th notes, 16 per bar. Notes are MIDI numbers (60 = middle C).
// bars: { chord: notes of the keys, root: bass note, melody: [[step, note, length in steps]] }
// keys: [[step, length]] when the chord sounds · bass: [[step, semitones over the root, length]]
// drums: steps of kick, snare and hat · fever: extra layer while the kitchen is in a fever.
const bar = (chord, root, melody) => ({ chord, root, melody });

const C_MAJ7 = [60, 64, 67, 71];
const A_MIN7 = [57, 60, 64, 67];
const F_MAJ7 = [57, 60, 64, 65];
const G_SIX = [55, 59, 62, 64];

const F_MAJ7_LOW = [53, 57, 60, 64];
const D_MIN7 = [50, 53, 57, 60];
const BB_MAJ7 = [53, 57, 58, 62];
const C_SEVEN = [52, 55, 58, 60];

const A_MIN9 = [57, 60, 64, 67, 71];
const E_MIN7 = [52, 55, 59, 62];
const C_MAJ7_LOW = [55, 59, 60, 64];

// prettier-ignore
export const musicTracks = {
  // "Cocina tranquila": menus, album, warehouse. Lazy lo-fi in C major.
  menu: {
    draft: true,
    bpm: 86,
    swing: 0.14,
    filter: 2600,
    bars: [
      bar(C_MAJ7, 48, [[0, 76, 4], [6, 79, 2], [8, 81, 6]]),
      bar(A_MIN7, 45, [[0, 79, 4], [4, 76, 4], [10, 74, 6]]),
      bar(F_MAJ7, 41, [[2, 72, 2], [4, 74, 2], [6, 76, 6], [12, 79, 4]]),
      bar(G_SIX, 43, [[0, 76, 8], [10, 74, 2], [12, 72, 4]]),
      bar(C_MAJ7, 48, [[0, 84, 4], [4, 81, 4], [8, 79, 6], [14, 81, 2]]),
      bar(A_MIN7, 45, [[0, 79, 4], [6, 76, 2], [8, 74, 8]]),
      bar(F_MAJ7, 41, [[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 79, 4], [12, 81, 4]]),
      bar(G_SIX, 43, [[0, 79, 12]]),
    ],
    keys: [
      [0, 7],
      [8, 6],
    ],
    bass: [
      [0, 0, 6],
      [10, 7, 4],
    ],
    drums: { kick: [0], snare: [], hat: [4, 12] },
  },

  // "Servicio": the loop. Bouncy in F major; the fever adds a fast arpeggio and hats.
  game: {
    draft: true,
    bpm: 116,
    swing: 0.08,
    filter: 3400,
    bars: [
      bar(F_MAJ7_LOW, 41, [[0, 77, 2], [2, 79, 2], [4, 81, 4], [8, 84, 2], [10, 81, 2], [12, 79, 4]]),
      bar(D_MIN7, 38, [[0, 77, 2], [2, 74, 2], [4, 77, 6], [12, 81, 4]]),
      bar(BB_MAJ7, 34, [[0, 82, 4], [4, 81, 2], [6, 79, 2], [8, 77, 4], [12, 74, 4]]),
      bar(C_SEVEN, 36, [[0, 76, 2], [2, 77, 2], [4, 79, 8], [14, 72, 2]]),
      bar(F_MAJ7_LOW, 41, [[0, 77, 2], [2, 79, 2], [4, 81, 4], [8, 84, 2], [10, 81, 2], [12, 79, 4]]),
      bar(D_MIN7, 38, [[0, 77, 2], [2, 79, 2], [4, 81, 2], [6, 84, 2], [8, 86, 6]]),
      bar(BB_MAJ7, 34, [[0, 84, 2], [2, 82, 2], [4, 81, 4], [8, 79, 2], [10, 77, 2], [12, 74, 4]]),
      bar(C_SEVEN, 36, [[0, 77, 8], [8, 72, 2], [10, 74, 2], [12, 76, 2], [14, 77, 2]]),
    ],
    keys: [
      [2, 1.5],
      [6, 1.5],
      [10, 1.5],
      [14, 1.5],
    ],
    bass: [
      [0, 0, 3],
      [6, 7, 2],
      [8, 0, 3],
      [12, 12, 2],
      [14, 7, 2],
    ],
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    fever: { arp: true, hat: [1, 3, 5, 7, 9, 11, 13, 15] },
  },

  // "Lluvia en la cocina": the Cocina Nocturna of the Maestro Pass (spec 7.4). Slow, A minor, with rain.
  night: {
    draft: true,
    bpm: 72,
    swing: 0.16,
    filter: 1500,
    rain: true,
    bars: [
      bar(A_MIN9, 45, [[4, 76, 4], [8, 74, 8]]),
      bar(F_MAJ7_LOW, 41, [[0, 72, 8], [10, 69, 6]]),
      bar(C_MAJ7_LOW, 48, [[2, 72, 2], [4, 74, 2], [6, 76, 10]]),
      bar(E_MIN7, 40, [[0, 79, 6], [8, 76, 8]]),
      bar(A_MIN9, 45, [[4, 81, 4], [8, 79, 8]]),
      bar(F_MAJ7_LOW, 41, [[0, 76, 8], [10, 72, 6]]),
      bar(C_MAJ7_LOW, 48, [[0, 74, 4], [4, 72, 4], [8, 69, 8]]),
      bar(E_MIN7, 40, [[0, 71, 16]]),
    ],
    keys: [[0, 15]],
    bass: [
      [0, 0, 8],
      [8, 7, 8],
    ],
    drums: { kick: [0], snare: [8], hat: [] },
  },
};
