import { createRenderer } from './renderer.js';
import { cellAt, inside } from './layout.js';
import { isCellFree } from '../grid.js';
import { createPip } from '../../systems/pip.js';
import { createTutorialRunner } from '../../systems/tutorial.js';
import { createRng } from '../../utils/rng.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const DRAG_START_DISTANCE = 8;

// Runs a loop on a canvas: fixed-step engine updates, rendering, touch input (spec 10.3),
// Pip's lines and, for the first loop, the tutorial.
export function createGameController({ canvas, engine, balance, settings, showFps, tutorial, pipOptions, onPauseRequest, onEvents }) {
  const renderer = createRenderer(canvas, engine, { balance, reducedMotion: settings.reducedMotion, showFps });
  const { view } = renderer;
  const pip = createPip({ engine, balance, rng: createRng(), ...pipOptions });
  const runner = tutorial ? createTutorialRunner(engine, tutorial, balance) : null;
  const nameVars = { nombre: pipOptions.playerName };
  let paused = false;
  let running = true;
  let last = performance.now();
  let accumulator = 0;

  function syncTutorial() {
    const step = runner?.step;
    renderer.setHint(step?.hint ?? null);
    if (step && !step.until) pip.show(step.key, step.expression, balance.tutorialLineDuration);
  }

  function updatePipLine() {
    const step = runner?.step;
    if (step?.until) renderer.setPipLine({ key: step.key, expression: step.expression, at: step.id }, { persistent: true, vars: nameVars });
    else renderer.setPipLine(pip.current(), { vars: nameVars });
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (!paused) {
      accumulator += dt;
      while (accumulator >= STEP) {
        engine.step(STEP);
        accumulator -= STEP;
      }
      renderer.update(dt);
    }
    const events = engine.drainEvents();
    if (runner?.handle(events)) syncTutorial();
    else if (!runner?.step?.until) pip.handle(events);
    renderer.handleEvents(events);
    if (events.length > 0) onEvents?.(events);
    updatePipLine();
    renderer.draw(paused);
    requestAnimationFrame(frame);
  }

  const toLogical = (e) => {
    const rect = canvas.getBoundingClientRect();
    const { scale } = renderer.getLayout();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };
  const canAct = () => !paused && engine.state.status === 'playing';

  function onPointerDown(e) {
    const p = toLogical(e);
    const layout = renderer.getLayout();
    if (inside(layout.pause, p.x, p.y)) {
      if (engine.state.status === 'playing') onPauseRequest();
      return;
    }
    if (!canAct() || view.drag) return;
    const slot = layout.tray.findIndex((r) => inside(r, p.x, p.y));
    if (slot !== -1 && engine.state.tray.slots[slot]) {
      canvas.setPointerCapture?.(e.pointerId);
      view.drag = { slot, pointerId: e.pointerId, startX: p.x, startY: p.y, x: p.x, y: p.y, active: false };
      return;
    }
    const cell = cellAt(layout, p.x, p.y);
    if (cell === -1) return;
    if (engine.state.grid.cells[cell].ingredient) engine.cookAt(cell);
    else if (settings.tapToPlace && view.selectedSlot !== null && engine.placeIngredient(view.selectedSlot, cell)) view.selectedSlot = null;
  }

  function onPointerMove(e) {
    const d = view.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toLogical(e);
    d.x = p.x;
    d.y = p.y;
    if (!d.active && Math.hypot(p.x - d.startX, p.y - d.startY) > DRAG_START_DISTANCE) {
      d.active = true;
      view.selectedSlot = null;
    }
    if (d.active) {
      const cell = cellAt(renderer.getLayout(), p.x, p.y - balance.dragLiftOffset);
      const allowed = !engine.state.allowedCells || engine.state.allowedCells.has(cell);
      view.targetCell = cell !== -1 && allowed && isCellFree(engine.state.grid, cell, engine.state.time) ? cell : -1;
    }
  }

  function onPointerUp(e) {
    const d = view.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    view.drag = null;
    if (d.active) {
      const placed = view.targetCell !== -1 && canAct() && engine.placeIngredient(d.slot, view.targetCell);
      if (!placed) renderer.returnDragged(d.slot, d.x, d.y);
    } else if (settings.tapToPlace) {
      view.selectedSlot = view.selectedSlot === d.slot ? null : d.slot;
    }
    view.targetCell = -1;
  }

  function onPointerCancel() {
    view.drag = null;
    view.targetCell = -1;
  }

  const onResize = () => renderer.resize();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('resize', onResize);
  renderer.resize();
  if (runner) syncTutorial();
  else pip.say('loopStart');
  requestAnimationFrame(frame);

  return {
    setPaused(value) {
      paused = value;
      onPointerCancel();
      last = performance.now();
    },
    setTapToPlace(value) {
      settings.tapToPlace = value;
      view.selectedSlot = null;
    },
    destroy() {
      running = false;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', onResize);
    },
  };
}
