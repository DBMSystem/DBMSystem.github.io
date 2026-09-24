import { useEffect, useRef, useState } from 'react';
import { createEngine } from '../game/engine.js';
import { createGameController } from '../game/renderer/controller.js';
import { balance } from '../data/balance.js';
import { discoveredSecrets } from '../economy/rewards.js';
import { feedbackFor } from '../audio/gameFeedback.js';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t } from '../utils/i18n.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { tutorial as tutorialScript } from '../data/tutorial.js';
import { RecipeBook } from './RecipeBook.jsx';
import { Challenges } from '../components/Challenges.jsx';
import { calendarToday } from '../components/Calendar.jsx';
import { todayChallenges, progressWith } from '../systems/challenges.js';
import { unlockContext } from '../systems/unlocks.js';

const TIP_PREFIX = 'tip.';

// Mounts the canvas and the engine. React only hears onOverflow / onLoopEnd / pause (spec 10.3).
export function Game({ tutorial = false, specialty = null, services, onEnd, onQuit }) {
  const { saveManager, adManager, audio, haptics } = services;
  const level = saveManager.get().player.level;
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const controllerRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overflow, setOverflow] = useState(null);
  const [adBusy, setAdBusy] = useState(false);
  const [panel, setPanel] = useState(null); // 'challenges' | 'recipes' | null
  const [panelFromHud, setPanelFromHud] = useState(false);
  const [challenges] = useState(() => (tutorial ? [] : todayChallenges(saveManager.get(), calendarToday(saveManager.get()))));
  const loopLevel = tutorial ? tutorialScript.level : level;
  const [tapToPlace, setTapToPlace] = useState(saveManager.get().settings.tapToPlace);

  useEffect(() => {
    const save = saveManager.get();
    const loopId = `loop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const engine = createEngine({
      balance,
      level: loopLevel,
      unlocks: tutorial ? {} : unlockContext(save),
      specialty: tutorial ? null : specialty,
      discoveredSecrets: discoveredSecrets(save),
      seed: Date.now(),
      onOverflow: setOverflow,
      onEnd: (result) => onEndRef.current({ ...result, tutorial, loopId }),
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
      challenges,
      onPauseRequest: () => setPaused(true),
      onQuickRequest: () => {
        setPaused(true);
        setPanel('challenges');
        setPanelFromHud(true);
      },
      onEvents: (events) => {
        for (const event of events) {
          const feedback = feedbackFor(event);
          if (!feedback) continue;
          audio.play(feedback[0]);
          if (feedback[1]) haptics.vibrate(feedback[1]);
        }
      },
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
  }, [attempt, loopLevel, tutorial, specialty, saveManager, audio, haptics, challenges]);

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

  // Mystic Knife on an overflowing kitchen: the oldest ingredient goes away and play goes on.
  function knifeOldest() {
    const { cells } = engineRef.current.state.grid;
    const oldest = cells.reduce((best, cell, i) => (cell.ingredient && (best === -1 || cell.placedSeq < cells[best].placedSeq) ? i : best), -1);
    if (engineRef.current.discardAt(oldest)) setOverflow(null);
  }

  const offerSecondChance = overflow?.secondChanceAvailable && adManager.canOffer('SECOND_CHANCE');
  const adReady = adManager.isRewardedAvailable('SECOND_CHANCE');

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game-canvas" />

      {paused && panel && (
        <div className="overlay scroll">
          <div className="panel quick-panel">
            <div className="tabs" role="tablist">
              {['challenges', 'recipes'].map((id) => (
                <button key={id} type="button" role="tab" aria-selected={panel === id} className={panel === id ? 'on' : ''} onClick={() => setPanel(id)}>
                  {t(`panel.${id}`)}
                </button>
              ))}
            </div>
            {panel === 'challenges' ? (
              <Challenges list={challenges} live={(c) => (engineRef.current ? progressWith(c, engineRef.current.getResult()) : c.progress)} />
            ) : (
              <RecipeBook level={loopLevel} unlocks={tutorial ? {} : unlockContext(saveManager.get())} discovered={discoveredSecrets(saveManager.get())} saved={saveManager.get().recipes} embedded />
            )}
            <Button
              onClick={() => {
                setPanel(null);
                if (panelFromHud) setPaused(false);
                setPanelFromHud(false);
              }}
            >
              {t(panelFromHud ? 'pause.resume' : 'book.close')}
            </Button>
          </div>
        </div>
      )}

      {paused && !panel && (
        <div className="overlay">
          <div className="panel">
            <h2>{t('pause.title')}</h2>
            <Button onClick={() => setPaused(false)}>{t('pause.resume')}</Button>
            <Button variant="secondary" icon="icon_recipe" onClick={() => setPanel(tutorial ? 'recipes' : 'challenges')}>
              {t('pause.panel')}
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
            {overflow.canDiscard && (
              <>
                <Button disabled={adBusy} onClick={knifeOldest}>
                  {t('overflow.knife')}
                </Button>
                <p className="hint small">{t('overflow.knifeHint')}</p>
              </>
            )}
            {offerSecondChance ? (
              <>
                <Button variant="ad" icon="icon_ad" disabled={!adReady || adBusy} onClick={watchSecondChance}>
                  {adReady ? t('overflow.secondChance') : t('ad.unavailable')}
                </Button>
                <p className="hint small">{t('overflow.secondChanceReward', { cells: balance.secondChanceCells, s: balance.secondChanceTime })}</p>
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
