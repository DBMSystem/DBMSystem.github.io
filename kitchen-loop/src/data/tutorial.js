// First loop, guided by Pip (spec 8.2). The clock does not run until the `free` step.
// hint: what the view points at. allowedSlots / allowedCells: where the player may place.
export const tutorial = {
  level: 1,
  ingredientQueue: ['egg', 'bacon', 'cheese', 'bread', 'tomato'],
  order: { customer: 'calm', recipe: 'tomato_toast' },
  steps: [
    { id: 'dragEgg', key: 'tutorial.dragEgg', expression: 'happy', hint: { slot: 0, cell: 5 }, allowedSlots: [0], allowedCells: [5], until: 'place' },
    { id: 'dragBacon', key: 'tutorial.dragBacon', expression: 'happy', hint: { slot: 1, cell: 6 }, allowedSlots: [1], allowedCells: [6], until: 'place' },
    { id: 'cook', key: 'tutorial.cook', expression: 'surprised', hint: { glowing: true }, allowedSlots: [], allowedCells: [], until: 'cook' },
    { id: 'order', key: 'tutorial.order', expression: 'thinking', hint: { customer: true }, spawnsOrder: true, until: 'toPan' },
    { id: 'pan', key: 'tutorial.pan', expression: 'happy', allowedSlots: [], allowedCells: [], until: 'serve' },
    { id: 'free', key: 'tutorial.free', expression: 'thumbs_up', startsTimer: true },
  ],
};
