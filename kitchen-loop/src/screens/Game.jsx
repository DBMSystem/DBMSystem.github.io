import { useEffect, useRef, useState } from 'react';
import { createEngine } from '../game/engine.js';
import { createGameController } from '../game/renderer/controller.js';
import { balance } from '../data/balance.js';
import { discoveredSecrets } from '../economy/rewards.js';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t } from '../utils/i18n.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { tutorial as tutorialScript } from '../data/tutorial.js';
import { RecipeBook } from './RecipeBook.jsx';

const TIP_PREFIX = 'tip.';

// Mounts the canvas and the engine. React only hears onOverflow / onLoopEnd / pause (spec 10.3).
export function Game({ level, tutorial = false, saveManager, adManager, onEnd, onQuit }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const controllerRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overflow, setOverflow] = useState(null);
  const [adBusy, setAdBusy] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const loopLevel = tutorial ? tutorialScript.level : level;
  const [tapToPlace, setTapToPlace] = useState(saveManager.get().settings.tapToPlace);

  useEffect(() => {
    const save = saveManager.get();
    const engine = createEngine({
      balance,
      level: loopLevel,
      discoveredSecrets: discoveredSecrets(save),
      seed: Date.now(),
      onOverflow: setOverflow,
      onEnd: (result) => onEndRef.current({ ...result, tutorial }),
      ...(tutorial && { ingredientQueue: tutorialScript.ingredientQueue, timerRunning: false }),
    });
    const tips = new Set(save.story.seenScenes.filter((id) => id.startsWith(TIP_PREFIX)).map((id) => id.slice(TIP_PREFIX.length)));
    const controller = createGameController({
      canvas: canvasRef.current,
      engine,
      balance,
      settings: { ...save.settings },
      showFps: DEV_TOOLS,
      tutorial: tutorial ? tutorialScript : null,
      pipOptions: {
        tips,
        playerName: save.player.name,
        onTipSeen: (tip) =>
          saveManager.update((s) => {
            s.story.seenScenes.push(TIP_PREFIX + tip);
          }),
      },
      onPauseRequest: () => setPaused(true),
    });
    engineRef.current = engine;
    controllerRef.current = controller;
    setOverflow(null);
    setPaused(false);

    const pauseIfPlaying = () => {
      if (engine.state.status === 'playing') setPaused(true);
    };
    const onVisibility = () => document.hidden && pauseIfPlaying();
    const onKey = (e) => e.key === 'Escape' && pauseIfPlaying();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);
    return () => {
      controller.destroy();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
    };
  }, [attempt, loopLevel, tutorial, saveManager]);

  useEffect(() => {
    controllerRef.current?.setPaused(paused);
  }, [paused]);

  const changeTapToPlace = (value) => {
    setTapToPlace(value);
    controllerRef.current?.setTapToPlace(value);
    saveManager.update((s) => {
      s.settings.tapToPlace = value;
    });
  };

  async function watchSecondChance() {
    setAdBusy(true);
    const { status } = await adManager.showRewarded('SECOND_CHANCE', () => engineRef.current.applySecondChance());
    setAdBusy(false);
    if (status === 'rewarded') setOverflow(null);
  }

  const offerSecondChance = overflow?.secondChanceAvailable && adManager.canOffer('SECOND_CHANCE');
  const adReady = adManager.isRewardedAvailable('SECOND_CHANCE');

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game-canvas" />

      {paused && showRecipes && (
        <div className="overlay scroll">
          <RecipeBook level={loopLevel} discovered={discoveredSecrets(saveManager.get())} onClose={() => setShowRecipes(false)} />
        </div>
      )}

      {paused && !showRecipes && (
        <div className="overlay">
          <div className="panel">
            <h2>{t('pause.title')}</h2>
            <Button onClick={() => setPaused(false)}>{t('pause.resume')}</Button>
            <Button variant="secondary" onClick={() => setShowRecipes(true)}>
              {t('pause.recipes')}
            </Button>
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              {t('pause.restart')}
            </Button>
            <p className="label">{t('pause.quickSettings')}</p>
            <Toggle label={t('menu.tapToPlace')} value={tapToPlace} onChange={changeTapToPlace} />
            <Button variant="secondary" onClick={onQuit}>
              {t('pause.quit')}
            </Button>
            <p className="hint small">{t('pause.quitHint')}</p>
          </div>
        </div>
      )}

      {overflow && (
        <div className="overlay">
          <div className="panel">
            <h2>{t('overflow.title')}</h2>
            {offerSecondChance ? (
              <>
                <Button variant="ad" disabled={!adReady || adBusy} onClick={watchSecondChance}>
                  {adReady ? t('overflow.secondChance') : t('ad.unavailable')}
                </Button>
                <p className="hint small">
                  {t('overflow.secondChanceReward', { cells: balance.secondChanceCells, s: balance.secondChanceTime })}
                </p>
                <Button variant="secondary" disabled={adBusy} onClick={() => engineRef.current.finishOverflow()}>
                  {t('overflow.noThanks')}
                </Button>
              </>
            ) : (
              <Button onClick={() => engineRef.current.finishOverflow()}>{t('overflow.results')}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
