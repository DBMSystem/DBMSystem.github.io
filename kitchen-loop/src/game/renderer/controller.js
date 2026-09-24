import { createRenderer } from './renderer.js';
import { cellAt, inside } from './layout.js';
import { isCellFree } from '../grid.js';
import { createPip } from '../../systems/pip.js';
import { createTutorialRunner } from '../../systems/tutorial.js';
import { createRng } from '../../utils/rng.js';
import { progressWith, challengeText } from '../../systems/challenges.js';
import { t } from '../../utils/i18n.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const DRAG_START_DISTANCE = 8;

// Runs a loop on a canvas: fixed-step engine updates, rendering, touch input (spec 10.3),
// Pip's lines and, for the first loop, the tutorial.
// `challenges`: today's Pip orders; a toast appears the moment one is completed during the service.
export function createGameController({
  canvas,
  engine,
  balance,
  settings,
  showFps,
  tutorial,
  pipOptions,
  challenges = [],
  onPauseRequest,
  onQuickRequest,
  onEvents,
}) {
  const renderer = createRenderer(canvas, engine, { balance, reducedMotion: settings.reducedMotion, showFps });
  const { view } = renderer;
  const pip = createPip({ engine, balance, rng: createRng(), ...pipOptions });
  const runner = tutorial ? createTutorialRunner(engine, tutorial, balance) : null;
  const nameVars = { nombre: pipOptions.playerName };
  const pending = challenges.filter((c) => !c.done);
  let paused = false;

  // Checks Pip's orders after cooking events; completed ones show a toast and a sound.
  function checkChallenges(events) {
    if (pending.length === 0 || !events.some((e) => e.type === 'cook' || e.type === 'perfect' || e.type === 'fever')) return;
    const live = engine.getResult();
    for (let i = pending.length - 1; i >= 0; i--) {
      if (progressWith(pending[i], live) >= pending[i].target) {
        renderer.showToast(t('challenges.done'), challengeText(pending[i]));
        events.push({ type: 'challengeDone' });
        pending.splice(i, 1);
      }
    }
  }
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
    checkHold(now);
    const events = engine.drainEvents();
    if (runner?.handle(events)) syncTutorial();
    else if (!runner?.step?.until) pip.handle(events);
    renderer.handleEvents(events);
    if (!runner) checkChallenges(events);
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
  const hasUses = (ability) => (engine.state.abilities[ability] ?? 0) > 0;

  // Mystic Knife (spec 5.4): holding an ingredient that is not part of a recipe discards it.
  function checkHold(now) {
    const d = view.drag;
    view.holdProgress = 0;
    if (!d || d.fromCell === undefined || d.active || paused || !hasUses('discard')) return;
    view.holdProgress = Math.min(1, (now - d.downAt) / 1000 / balance.discardHold);
    if (view.holdProgress >= 1) {
      engine.discardAt(d.fromCell);
      view.drag = null;
      view.holdProgress = 0;
    }
  }

  function onAbility(ability) {
    if (ability === 'freeze') engine.freeze();
    else renderer.showToast(t(`ability.${ability}.title`), t(`ability.${ability}.how`));
  }

  function onPointerDown(e) {
    const p = toLogical(e);
    const layout = renderer.getLayout();
    if (inside(layout.pause, p.x, p.y)) {
      if (engine.state.status === 'playing') onPauseRequest();
      return;
    }
    if (inside(layout.quick, p.x, p.y)) {
      if (engine.state.status === 'playing') onQuickRequest?.();
      return;
    }
    if (!canAct() || view.drag) return;
    const ability = renderer.abilityList().find((_, i) => inside(layout.abilities[i], p.x, p.y));
    if (ability) {
      onAbility(ability);
      return;
    }
    const slot = layout.tray.findIndex((r) => inside(r, p.x, p.y));
    if (slot !== -1 && engine.state.tray.slots[slot]) {
      canvas.setPointerCapture?.(e.pointerId);
      view.drag = { slot, pointerId: e.pointerId, startX: p.x, startY: p.y, x: p.x, y: p.y, active: false };
      return;
    }
    const cell = cellAt(layout, p.x, p.y);
    if (cell === -1) return;
    if (engine.state.grid.cells[cell].ingredient) {
      // A cell that is part of a recipe cooks at once; any other can be moved or held to discard.
      const cookable = engine.state.matches.some((m) => m.cells.includes(cell));
      if (!cookable && (hasUses('move') || hasUses('discard'))) {
        canvas.setPointerCapture?.(e.pointerId);
        view.drag = { fromCell: cell, pointerId: e.pointerId, startX: p.x, startY: p.y, x: p.x, y: p.y, active: false, downAt: performance.now() };
      } else engine.cookAt(cell);
    } else if (settings.tapToPlace && view.selectedSlot !== null && engine.placeIngredient(view.selectedSlot, cell)) view.selectedSlot = null;
  }

  function onPointerMove(e) {
    const d = view.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toLogical(e);
    d.x = p.x;
    d.y = p.y;
    if (!d.active && Math.hypot(p.x - d.startX, p.y - d.startY) > DRAG_START_DISTANCE) {
      if (d.fromCell !== undefined && !hasUses('move')) return;
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
    if (d.fromCell !== undefined) {
      if (d.active && view.targetCell !== -1 && canAct()) engine.moveIngredient(d.fromCell, view.targetCell);
      else if (!d.active) engine.cookAt(d.fromCell); // a short tap: "no recipe here" feedback
    } else if (d.active) {
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
