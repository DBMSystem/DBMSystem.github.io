import { createGrid } from '../src/game/grid.js';

// Builds a grid from rows of ingredient ids ('.' = empty), e.g. ['egg bacon . .', ...].
export function gridFrom(rows) {
  const grid = createGrid(rows.length);
  rows.forEach((row, r) =>
    row.split(/\s+/).forEach((id, c) => {
      grid.cells[r * rows.length + c].ingredient = id === '.' ? null : id;
    }),
  );
  return grid;
}
