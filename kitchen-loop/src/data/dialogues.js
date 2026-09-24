// Pip's lines by trigger (spec 3.6). Texts live in i18n/es.js under each `key`.
// draft: true = written by Claude Code, pending Daniel's review (docs/CONTENT_REVIEW.md).
// priority: shown even if Pip spoke less than pipLineInterval seconds ago.
const lines = (prefix, count, draftFrom = Infinity) => Array.from({ length: count }, (_, i) => ({ key: `${prefix}.${i + 1}`, draft: i + 1 >= draftFrom }));

export const pipTriggers = {
  loopStart: { expression: 'happy', lines: lines('pip.loopStart', 4, 4) },
  cook: { expression: 'thumbs_up', lines: lines('pip.cook', 5, 4) },
  combo: { expression: 'celebrating', lines: lines('pip.combo', 3, 3) },
  closeCall: { expression: 'surprised', priority: true, lines: lines('pip.closeCall', 4, 2) },
  fullStove: { expression: 'celebrating', lines: lines('pip.fullStove', 3, 1) },
  perfect: { expression: 'crying', priority: true, lines: lines('pip.perfect', 2) },
  fever: { expression: 'celebrating', priority: true, lines: lines('pip.fever', 2, 2) },
  customerLeft: { expression: 'worried', lines: lines('pip.customerLeft', 3, 3) },
  burnt: { expression: 'embarrassed', priority: true, lines: lines('pip.burnt', 3, 1) },
  gridNearlyFull: { expression: 'worried', lines: lines('pip.gridNearlyFull', 2) },
  noRecipe: { expression: 'confused', lines: lines('pip.noRecipe', 3, 2) },
  overflow: { expression: 'scared', priority: true, lines: lines('pip.overflow', 2) },
  endRecord: { expression: 'proud', lines: lines('pip.endRecord', 2) },
  endNormal: { expression: 'happy', lines: lines('pip.endNormal', 2) },
  endWeak: { expression: 'embarrassed', lines: lines('pip.endWeak', 2) },
  secret: { expression: 'surprised', priority: true, lines: lines('pip.secret', 1) },
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

// Brûlée's comments in the warehouse (spec 8.7). The first two are the spec's own lines.
export const warehouseLines = [
  { key: 'warehouse.brulee.1', draft: false },
  { key: 'warehouse.brulee.2', draft: false },
  { key: 'warehouse.brulee.3', draft: true },
  { key: 'warehouse.brulee.4', draft: true },
  { key: 'warehouse.brulee.5', draft: true },
];

// Riddles for undiscovered secret recipes (spec 3.2). Never the ingredients.
export const secretHints = {
  bacon_crown: { key: 'hint.bacon_crown', draft: false },
  impossible_omelette: { key: 'hint.impossible_omelette', draft: true },
  mystic_scramble: { key: 'hint.mystic_scramble', draft: true },
  master_soup: { key: 'hint.master_soup', draft: true },
  exploding_tomato: { key: 'hint.exploding_tomato', draft: true },
  lost_recipe: { key: 'hint.lost_recipe', draft: true },
};
