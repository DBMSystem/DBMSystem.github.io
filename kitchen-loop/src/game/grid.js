// Grid of cells. A cell holds an ingredient id (or null) and stays blocked while a dish cooks.
export function createGrid(size) {
  return {
    size,
    cells: Array.from({ length: size * size }, () => ({ ingredient: null, golden: false, placedSeq: 0, lockedUntil: 0 })),
  };
}

export const rowOf = (grid, index) => Math.floor(index / grid.size);
export const colOf = (grid, index) => index % grid.size;

export function neighbors(grid, index) {
  const { size } = grid;
  const row = rowOf(grid, index);
  const col = colOf(grid, index);
  const result = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

export const isCellFree = (grid, index, time) => grid.cells[index].ingredient === null && grid.cells[index].lockedUntil <= time;

// Full = every cell holds an ingredient. Cells that are cooking are about to be freed.
export const isFull = (grid) => grid.cells.every((cell) => cell.ingredient !== null);

export const countOccupied = (grid) => grid.cells.filter((cell) => cell.ingredient !== null).length;
