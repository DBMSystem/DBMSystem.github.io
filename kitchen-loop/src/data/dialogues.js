// Pip's lines by trigger (spec 3.6). Texts live in i18n/es.js under each `key`.
// draft: true = written by Claude Code, pending Daniel's review (docs/CONTENT_REVIEW.md, docs/HISTORIA.md).
// priority: shown even if Pip spoke less than pipLineInterval seconds ago.
// fromChapter: the line only exists from that story chapter on (spec 6.3: every chapter unlocks dialogue).
// Chapter 8 = after the epilogue. `lines(prefix, count, draftFrom)` builds `prefix.1…count`; `from` adds gated ones.
const lines = (prefix, count, draftFrom = Infinity) => Array.from({ length: count }, (_, i) => ({ key: `${prefix}.${i + 1}`, draft: i + 1 >= draftFrom }));
const from = (chapter, prefix, numbers) => numbers.map((n) => ({ key: `${prefix}.${n}`, draft: true, fromChapter: chapter }));

export const AFTER_FINALE = 8;

export const pipTriggers = {
  loopStart: {
    expression: 'happy',
    lines: [...lines('pip.loopStart', 7, 4), ...from(3, 'pip.loopStart', [8]), ...from(5, 'pip.loopStart', [9]), ...from(AFTER_FINALE, 'pip.loopStart', [10])],
  },
  cook: {
    expression: 'thumbs_up',
    lines: [...lines('pip.cook', 8, 4), ...from(3, 'pip.cook', [9]), ...from(5, 'pip.cook', [10]), ...from(AFTER_FINALE, 'pip.cook', [11])],
  },
  combo: { expression: 'celebrating', lines: [...lines('pip.combo', 5, 3), ...from(3, 'pip.combo', [6])] },
  closeCall: { expression: 'surprised', priority: true, lines: lines('pip.closeCall', 5, 2) },
  fullStove: { expression: 'celebrating', lines: lines('pip.fullStove', 3, 1) },
  perfect: { expression: 'crying', priority: true, lines: [...lines('pip.perfect', 3, 3), ...from(3, 'pip.perfect', [4])] },
  fever: { expression: 'celebrating', priority: true, lines: lines('pip.fever', 3, 2) },
  customerLeft: { expression: 'worried', lines: lines('pip.customerLeft', 4, 3) },
  burnt: { expression: 'embarrassed', priority: true, lines: lines('pip.burnt', 4, 1) },
  gridNearlyFull: { expression: 'worried', lines: lines('pip.gridNearlyFull', 3, 3) },
  noRecipe: { expression: 'confused', lines: lines('pip.noRecipe', 3, 2) },
  overflow: { expression: 'scared', priority: true, lines: lines('pip.overflow', 3, 3) },
  // Results screen (spec 8.5): what really happened, chosen by endTrigger() in systems/pip.js.
  endRecord: { expression: 'proud', lines: lines('pip.endRecord', 3, 3) },
  endNormal: { expression: 'happy', lines: lines('pip.endNormal', 3, 3) },
  endWeak: { expression: 'embarrassed', lines: lines('pip.endWeak', 3, 3) },
  endBurnt: { expression: 'embarrassed', lines: lines('pip.endBurnt', 2, 1) },
  endNoLoss: { expression: 'celebrating', lines: lines('pip.endNoLoss', 2, 1) },
  endFever: { expression: 'celebrating', lines: lines('pip.endFever', 2, 1) },
  endOverflow: { expression: 'scared', lines: lines('pip.endOverflow', 2, 1) },
  secret: { expression: 'surprised', priority: true, lines: lines('pip.secret', 2, 2) },
  counterSaleTip: { expression: 'winking', priority: true, lines: lines('pip.counterSaleTip', 1, 1) },
  pass: { expression: 'winking', lines: lines('pip.pass', 15, 1) }, // Maestro Pass: special lines (spec 7.4)
};

// Story scenes: at most 3 bubbles each (spec 6.3), skippable. All draft until D-1 is approved.
export const storyScenes = {
  intro: [
    { speaker: 'pip', expression: 'surprised', key: 'story.intro.1', draft: true },
    { speaker: 'pip', expression: 'happy', key: 'story.intro.2', draft: true },
    { speaker: 'pip', expression: 'thinking', key: 'story.intro.3', draft: true },
  ],
  premise: [
    { speaker: 'pip', expression: 'happy', key: 'story.premise.1', draft: true },
    { speaker: 'pip', expression: 'thinking', key: 'story.premise.2', draft: true },
    { speaker: 'pip', expression: 'thumbs_up', key: 'story.premise.3', draft: true },
  ],
};

// Chapter scenes 2–7 and the finale (spec 6.3). speaker: 'pip' | 'brulee'. `night`: night kitchen backdrop.
const scene = (id, bubbles, extra = {}) => ({
  ...extra,
  bubbles: bubbles.map(([speaker, expression], i) => ({ speaker, expression, key: `story.${id}.${i + 1}`, draft: true })),
});
export const chapterScenes = {
  chapter2: scene('chapter2', [
    ['pip', 'proud'],
    ['pip', 'thinking'],
    ['pip', 'embarrassed'],
  ]),
  chapter3: scene('chapter3', [
    ['brulee', 'explaining'],
    ['pip', 'scared'],
    ['brulee', 'proud'],
  ]),
  chapter4: scene('chapter4', [
    ['brulee', 'explaining'],
    ['pip', 'worried'],
    ['brulee', 'laughing'],
  ]),
  chapter5: scene(
    'chapter5',
    [
      ['pip', 'thinking'],
      ['brulee', 'explaining'],
      ['brulee', 'surprised'],
    ],
    { night: true },
  ),
  chapter6: scene('chapter6', [
    ['brulee', 'proud'],
    ['pip', 'embarrassed'],
    ['brulee', 'explaining'],
  ]),
  chapter7: scene(
    'chapter7',
    [
      ['brulee', 'explaining'],
      ['pip', 'crying'],
      ['brulee', 'happy'],
    ],
    { night: true },
  ),
  finale: scene('finale', [
    ['brulee', 'happy'],
    ['brulee', 'proud'],
    ['pip', 'crying'],
  ]),
};

// The story in the order it is told, for replaying it from Settings (only the scenes already seen play).
export const storyOrder = ['intro', 'premise', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6', 'chapter7', 'finale'];

// Brûlée's comments in the warehouse (spec 8.7), by chapter. The first two are the spec's own lines.
export const warehouseLines = [
  { key: 'warehouse.brulee.1', draft: false },
  { key: 'warehouse.brulee.2', draft: false },
  { key: 'warehouse.brulee.3', draft: true },
  { key: 'warehouse.brulee.4', draft: true },
  { key: 'warehouse.brulee.5', draft: true },
  { key: 'warehouse.brulee.6', draft: true },
  ...from(4, 'warehouse.brulee', [7, 8]),
  ...from(5, 'warehouse.brulee', [9, 10]),
  ...from(6, 'warehouse.brulee', [11]),
  ...from(7, 'warehouse.brulee', [12]),
  ...from(AFTER_FINALE, 'warehouse.brulee', [13, 14]),
];

// Pip's greeting on the menu, by time of day (spec 8.3: Pip at rest in the kitchen).
export const menuGreetings = {
  morning: lines('menu.greeting.morning', 3, 1),
  afternoon: lines('menu.greeting.afternoon', 3, 1),
  night: lines('menu.greeting.night', 3, 1),
};

// Riddles for undiscovered secret recipes (spec 3.2). Never the ingredients.
export const secretHints = {
  bacon_crown: { key: 'hint.bacon_crown', draft: false },
  impossible_omelette: { key: 'hint.impossible_omelette', draft: true },
  mystic_scramble: { key: 'hint.mystic_scramble', draft: true },
  master_soup: { key: 'hint.master_soup', draft: true },
  exploding_tomato: { key: 'hint.exploding_tomato', draft: true },
  lost_recipe: { key: 'hint.lost_recipe', draft: true },
};
