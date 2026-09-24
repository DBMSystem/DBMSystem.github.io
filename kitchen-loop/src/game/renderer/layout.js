// Screen layout in logical pixels (spec 2.1, 9.1): 360 wide, at least 640 tall.
export const LOGICAL_WIDTH = 360;
export const LOGICAL_MIN_HEIGHT = 640;
const CELL_SIZE = { 4: 64, 5: 48 };
const TRAY_SLOT = 72;
const PREVIEW = 48;
const HUD_HEIGHT = 44;
const CUSTOMER_HEIGHT = 152; // speech bubble + character behind the counter
const ABILITY_ROW = 34; // utensil abilities row, only when the player has abilities (spec 5.4)
const PIP_HEIGHT = 74;

export function computeLayout(cssWidth, cssHeight, gridSize, maxCustomers, traySlots, abilityCount = 0) {
  const abilityRow = abilityCount > 0 ? ABILITY_ROW : 0;
  const scale = Math.min(cssWidth / LOGICAL_WIDTH, cssHeight / LOGICAL_MIN_HEIGHT);
  const width = cssWidth / scale;
  const height = cssHeight / scale;
  const ox = (width - LOGICAL_WIDTH) / 2;

  const cell = CELL_SIZE[gridSize];
  const boardPad = 8;
  const boardSize = cell * gridSize + boardPad * 2;
  const fixed = HUD_HEIGHT + CUSTOMER_HEIGHT + boardSize + abilityRow + TRAY_SLOT + PIP_HEIGHT;
  const gap = Math.max(4, (height - fixed) / 6);

  let y = 0;
  const hud = { x: ox, y, w: LOGICAL_WIDTH, h: HUD_HEIGHT };
  const pause = { x: ox + 4, y, w: 44, h: 44 };
  const quick = { x: ox + 50, y, w: 44, h: 44 }; // Pip's orders and recipes during a service
  y += HUD_HEIGHT + gap;

  const slotW = (LOGICAL_WIDTH - 16) / maxCustomers;
  const customers = Array.from({ length: maxCustomers }, (_, i) => ({
    x: ox + 8 + i * slotW + 3,
    y,
    w: slotW - 6,
    h: CUSTOMER_HEIGHT,
  }));
  y += CUSTOMER_HEIGHT + gap;

  const board = { x: ox + (LOGICAL_WIDTH - boardSize) / 2, y, w: boardSize, h: boardSize };
  const grid = { x: board.x + boardPad, y: board.y + boardPad, cell, size: gridSize };
  y += boardSize + gap;

  const abilityW = abilityCount > 0 ? Math.min(110, (LOGICAL_WIDTH - 16) / abilityCount) : 0;
  const abilities = Array.from({ length: abilityCount }, (_, i) => ({
    x: ox + (LOGICAL_WIDTH - abilityW * abilityCount) / 2 + i * abilityW + 3,
    y,
    w: abilityW - 6,
    h: abilityRow,
  }));
  if (abilityRow) y += abilityRow + gap;

  const gapX = 12;
  const trayWidth = traySlots * TRAY_SLOT + (traySlots - 1) * gapX + 16 + PREVIEW;
  const trayX = ox + (LOGICAL_WIDTH - trayWidth) / 2;
  const tray = Array.from({ length: traySlots }, (_, i) => ({ x: trayX + i * (TRAY_SLOT + gapX), y, w: TRAY_SLOT, h: TRAY_SLOT }));
  const preview = { x: trayX + trayWidth - PREVIEW, y: y + (TRAY_SLOT - PREVIEW) / 2, w: PREVIEW, h: PREVIEW };
  y += TRAY_SLOT + gap;

  const pip = { x: ox + 6, y, w: LOGICAL_WIDTH - 12, h: PIP_HEIGHT };

  return { scale, width, height, ox, hud, pause, quick, customers, board, grid, abilities, tray, preview, pip };
}

export const inside = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function cellAt(layout, x, y) {
  const { grid } = layout;
  const col = Math.floor((x - grid.x) / grid.cell);
  const row = Math.floor((y - grid.y) / grid.cell);
  if (col < 0 || row < 0 || col >= grid.size || row >= grid.size) return -1;
  return row * grid.size + col;
}

export function cellRect(layout, index) {
  const { grid } = layout;
  return {
    x: grid.x + (index % grid.size) * grid.cell,
    y: grid.y + Math.floor(index / grid.size) * grid.cell,
    w: grid.cell,
    h: grid.cell,
  };
}

export const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
