import { useState } from 'react';
import { Menu } from './screens/Menu.jsx';
import { Game } from './screens/Game.jsx';
import { Results } from './screens/Results.jsx';
import { Story } from './screens/Story.jsx';
import { NameInput } from './screens/NameInput.jsx';
import { Album } from './screens/Album.jsx';
import { Settings } from './screens/Settings.jsx';
import { Warehouse } from './screens/Warehouse.jsx';
import { SpecialtyPicker } from './components/SpecialtyPicker.jsx';
import { pendingScenes, markSceneSeen } from './systems/story.js';
import { availableSpecialties } from './systems/specialty.js';
import { finalizeLoop } from './economy/rewards.js';
import { addXp, xpToNext } from './economy/progression.js';
import { addCoins } from './inventory/inventory.js';

const DEV_COINS = 1000; // playtest button to try the warehouse quickly (development/playtest builds only)
import { createRng } from './utils/rng.js';
import { calendarToday } from './components/Calendar.jsx';

// Routes between screens. Game data lives in the save manager, not in component state.
// First session (spec 8.1): Pip introduces himself → name → premise → tutorial → results (first card) → menu.
export function App({ services }) {
  const { saveManager } = services;
  const firstSession = !saveManager.get().tutorialDone;
  // A scene still due when the game opens (e.g. the app closed on the results screen) plays first.
  const dueAtStart = firstSession ? null : pendingScenes(saveManager.get())[0];
  const [screen, setScreen] = useState(firstSession ? 'intro' : dueAtStart ? 'scene' : 'menu');
  const [result, setResult] = useState(null);
  const [run, setRun] = useState({ id: 0, tutorial: false, specialty: null });
  const [picking, setPicking] = useState(false); // choosing the daily specialty before a loop
  const [scene, setScene] = useState(dueAtStart ? { id: dueAtStart, then: () => setScreen('menu') } : null); // { id, then }
  const [returnTo, setReturnTo] = useState(null); // where a replayed story or a rename goes back to
  const [, setVersion] = useState(0);

  const startLoop = (tutorial, specialty = null) => {
    setPicking(false);
    setRun((r) => ({ id: r.id + 1, tutorial, specialty }));
    setScreen('game');
  };
  const play = (tutorial = false) => {
    if (!tutorial && availableSpecialties(saveManager.get()).length > 0) setPicking(true);
    else startLoop(tutorial);
  };

  // Goes on to `then` after any story scene now due (chapters open after loops and purchases; spec 6.3).
  const proceed = (then) => {
    const [next] = pendingScenes(saveManager.get());
    if (next) {
      setScene({ id: next, then });
      setScreen('scene');
    } else then();
  };
  const toMenu = () => proceed(() => setScreen('menu'));
  const finishScene = async () => {
    const { id, then } = scene;
    await saveManager.update((s) => markSceneSeen(s, id));
    proceed(then);
  };

  async function handleLoopEnd(loopResult) {
    let summary = null;
    await saveManager.update((s) => {
      summary = finalizeLoop(s, loopResult, {
        rng: createRng(),
        now: Date.now(),
        today: calendarToday(s),
      });
      if (loopResult.tutorial) s.tutorialDone = true;
    });
    if (!summary) return;
    setResult(summary);
    setScreen('results');
  }

  const saveName = async (name) => {
    await saveManager.update((s) => {
      s.player.name = name;
    });
    setScreen(returnTo ?? 'premise');
    setReturnTo(null);
  };

  const devCoins = async () => {
    await saveManager.update((s) => addCoins(s, DEV_COINS, 'dev'));
    setVersion((v) => v + 1);
  };

  const devLevelUp = async () => {
    await saveManager.update((s) => addXp(s, xpToNext(s.player.level) - s.player.xp));
    setVersion((v) => v + 1);
  };

  const playerName = saveManager.get().player.name;
  return (
    <>
      {renderScreen()}
      {picking && <SpecialtyPicker save={saveManager.get()} onPick={(id) => startLoop(false, id)} />}
    </>
  );

  function renderScreen() {
    switch (screen) {
      case 'intro':
        return <Story key="intro" scene="intro" playerName={playerName} onDone={() => setScreen(returnTo ? 'premise' : 'name')} />;
      case 'name':
        return <NameInput initial={returnTo ? playerName : ''} onDone={saveName} />;
      case 'premise':
        return (
          <Story
            key="premise"
            scene="premise"
            playerName={playerName}
            onDone={() => {
              if (returnTo) {
                setScreen(returnTo);
                setReturnTo(null);
              } else play(true);
            }}
          />
        );
      case 'game':
        return (
          <Game key={run.id} tutorial={run.tutorial} specialty={run.specialty} services={services} onEnd={handleLoopEnd} onQuit={() => setScreen('menu')} />
        );
      case 'results':
        return <Results result={result} playerName={playerName} services={services} onAgain={() => proceed(() => play(false))} onMenu={toMenu} />;
      case 'scene':
        return <Story key={scene.id} scene={scene.id} playerName={playerName} onDone={finishScene} />;
      case 'album':
        return <Album services={services} onClose={() => setScreen('menu')} />;
      case 'warehouse':
        return <Warehouse services={services} onClose={toMenu} />;
      case 'settings':
        return (
          <Settings
            services={services}
            onClose={() => setScreen('menu')}
            onRename={() => {
              setReturnTo('settings');
              setScreen('name');
            }}
            onTutorial={() => play(true)}
            onStory={() => {
              setReturnTo('settings');
              setScreen('intro');
            }}
            onDeleted={async () => {
              await saveManager.reset();
              setReturnTo(null);
              setScreen('intro');
            }}
          />
        );
      default:
        return (
          <Menu
            services={services}
            onPlay={() => play(false)}
            onAlbum={() => setScreen('album')}
            onWarehouse={() => setScreen('warehouse')}
            onSettings={() => setScreen('settings')}
            onDevLevelUp={devLevelUp}
            onDevCoins={devCoins}
          />
        );
    }
  }
}
