import { describe, it, expect } from 'vitest';
import { createDialogue } from '../src/systems/dialogue.js';
import { createPip, endTrigger } from '../src/systems/pip.js';
import { createEngine } from '../src/game/engine.js';
import { createRng } from '../src/utils/rng.js';
import { balance } from '../src/data/balance.js';
import { pipTriggers, storyScenes, secretHints } from '../src/data/dialogues.js';
import { recipes } from '../src/data/recipes.js';
import { t, hasKey } from '../src/utils/i18n.js';

const triggers = {
  normal: { expression: 'happy', lines: [1, 2, 3, 4, 5, 6].map((n) => ({ key: `k${n}` })) },
  urgent: { expression: 'surprised', priority: true, lines: [{ key: 'u1' }] },
};

describe('dialogue', () => {
  it('waits minInterval between lines unless the trigger has priority', () => {
    const d = createDialogue({ triggers, rng: createRng(1), minInterval: 4, historySize: 5 });
    expect(d.say('normal', 0)).not.toBeNull();
    expect(d.say('normal', 2)).toBeNull();
    expect(d.say('urgent', 2)).not.toBeNull();
    expect(d.say('normal', 6.5)).not.toBeNull();
  });

  it('never repeats one of the last 5 lines', () => {
    const d = createDialogue({ triggers, rng: createRng(7), minInterval: 0, historySize: 5 });
    const said = Array.from({ length: 30 }, (_, i) => d.say('normal', i).key);
    for (let i = 5; i < said.length; i++) expect(said.slice(i - 5, i)).not.toContain(said[i]);
  });
});

describe('pip director', () => {
  const setup = () => {
    const engine = createEngine({ balance, level: 1, seed: 1 });
    const seen = [];
    const pip = createPip({ engine, balance, rng: createRng(1), onTipSeen: (tip) => seen.push(tip) });
    return { engine, pip, seen };
  };

  it('explains the counter sale once, the first time it happens', () => {
    const { pip, seen } = setup();
    pip.handle([{ type: 'cook', customerSlot: null, patienceLeft: null, chain: 1 }]);
    expect(pip.current().key).toBe('pip.counterSaleTip.1');
    expect(seen).toEqual(['counterSale']);
    pip.handle([{ type: 'cook', customerSlot: null, patienceLeft: null, chain: 1 }]);
    expect(seen).toEqual(['counterSale']);
  });

  it('close call, secret and overflow lines', () => {
    const { pip, engine } = setup();
    pip.handle([{ type: 'cook', customerSlot: 0, patienceLeft: 0.05, chain: 1 }]);
    expect(pip.current().key).toMatch(/^pip\.closeCall/);
    engine.state.time += balance.pipLineInterval + 1;
    pip.handle([{ type: 'overflow' }]);
    expect(pip.current().expression).toBe('angry');
  });

  it('lines disappear after pipLineDuration', () => {
    const { pip, engine } = setup();
    pip.say('loopStart');
    expect(pip.current()).not.toBeNull();
    engine.state.time += balance.pipLineDuration + 0.1;
    expect(pip.current()).toBeNull();
  });

  it('end-of-loop trigger', () => {
    expect(endTrigger({ newRecord: true, score: 50 }, balance)).toBe('endRecord');
    expect(endTrigger({ newRecord: false, score: 50 }, balance)).toBe('endWeak');
    expect(endTrigger({ newRecord: false, score: 2000 }, balance)).toBe('endNormal');
  });
});

describe('dialogue content', () => {
  it('every line key exists; in-game lines are at most 60 characters', () => {
    for (const { lines } of Object.values(pipTriggers)) {
      for (const { key } of lines) {
        expect(hasKey(key), key).toBe(true);
        expect(t(key, { nombre: 'Aprendiz' }).length, key).toBeLessThanOrEqual(60);
      }
    }
  });

  it('story scenes have at most 3 bubbles and every secret recipe has a riddle', () => {
    for (const scene of Object.values(storyScenes)) {
      expect(scene.length).toBeLessThanOrEqual(3);
      for (const bubble of scene) expect(hasKey(bubble.key)).toBe(true);
    }
    for (const r of recipes.filter((r) => r.kind === 'secret')) expect(hasKey(secretHints[r.id].key)).toBe(true);
  });

  it('player-facing lines avoid gendered welcome/ready words', () => {
    const texts = [...Object.values(pipTriggers).flatMap((e) => e.lines), ...Object.values(storyScenes).flat()].map((l) => t(l.key));
    for (const text of texts) expect(text).not.toMatch(/\b(listo|lista|bienvenido|bienvenida)\b/i);
  });
});
