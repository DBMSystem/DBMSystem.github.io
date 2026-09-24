// Pip's lines by trigger (spec 3.6). Texts live in i18n/es.js under each `key`.
// draft: true = written by Claude Code, pending Daniel's review (docs/CONTENT_REVIEW.md).
// priority: shown even if Pip spoke less than pipLineInterval seconds ago.
const lines = (prefix, count, draftFrom = Infinity) =>
  Array.from({ length: count }, (_, i) => ({ key: `${prefix}.${i + 1}`, draft: i + 1 >= draftFrom }));

export const pipTriggers = {
  loopStart: { expression: 'happy', lines: lines('pip.loopStart', 4, 4) },
  cook: { expression: 'thumbs_up', lines: lines('pip.cook', 5, 4) },
  combo: { expression: 'happy', lines: lines('pip.combo', 3, 3) },
  closeCall: { expression: 'surprised', lines: lines('pip.closeCall', 2, 2) },
  perfect: { expression: 'surprised', priority: true, lines: lines('pip.perfect', 2) },
  fever: { expression: 'happy', priority: true, lines: lines('pip.fever', 2, 2) },
  customerLeft: { expression: 'worried', lines: lines('pip.customerLeft', 3, 3) },
  gridNearlyFull: { expression: 'worried', lines: lines('pip.gridNearlyFull', 2) },
  noRecipe: { expression: 'thinking', lines: lines('pip.noRecipe', 3, 2) },
  overflow: { expression: 'angry', priority: true, lines: lines('pip.overflow', 2) },
  endRecord: { expression: 'thumbs_up', lines: lines('pip.endRecord', 2) },
  endNormal: { expression: 'happy', lines: lines('pip.endNormal', 2) },
  endWeak: { expression: 'worried', lines: lines('pip.endWeak', 2) },
  secret: { expression: 'surprised', priority: true, lines: lines('pip.secret', 1) },
  counterSaleTip: { expression: 'thinking', priority: true, lines: lines('pip.counterSaleTip', 1, 1) },
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

// Riddles for undiscovered secret recipes (spec 3.2). Never the ingredients.
export const secretHints = {
  bacon_crown: { key: 'hint.bacon_crown', draft: false },
  impossible_omelette: { key: 'hint.impossible_omelette', draft: true },
  mystic_scramble: { key: 'hint.mystic_scramble', draft: true },
  master_soup: { key: 'hint.master_soup', draft: true },
  exploding_tomato: { key: 'hint.exploding_tomato', draft: true },
  lost_recipe: { key: 'hint.lost_recipe', draft: true },
};
