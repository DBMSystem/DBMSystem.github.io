import { useState } from 'react';
import { Menu } from './screens/Menu.jsx';
import { Game } from './screens/Game.jsx';
import { Results } from './screens/Results.jsx';
import { Story } from './screens/Story.jsx';
import { NameInput } from './screens/NameInput.jsx';
import { Album } from './screens/Album.jsx';
import { Settings } from './screens/Settings.jsx';
import { finalizeLoop } from './economy/rewards.js';
import { addXp, xpToNext } from './economy/progression.js';
import { createRng } from './utils/rng.js';

// Routes between screens. Game data lives in the save manager, not in component state.
// First session (spec 8.1): Pip introduces himself → name → premise → tutorial → results (first card) → menu.
export function App({ services }) {
  const { saveManager } = services;
  const firstSession = !saveManager.get().tutorialDone;
  const [screen, setScreen] = useState(firstSession ? 'intro' : 'menu');
  const [result, setResult] = useState(null);
  const [run, setRun] = useState({ id: 0, tutorial: false });
  const [returnTo, setReturnTo] = useState(null); // where a replayed story or a rename goes back to
  const [, setVersion] = useState(0);

  const play = (tutorial = false) => {
    setRun((r) => ({ id: r.id + 1, tutorial }));
    setScreen('game');
  };

  async function handleLoopEnd(loopResult) {
    let summary = null;
    await saveManager.update((s) => {
      summary = finalizeLoop(s, loopResult, { rng: createRng(), now: Date.now() });
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

  const devLevelUp = async () => {
    await saveManager.update((s) => addXp(s, xpToNext(s.player.level) - s.player.xp));
    setVersion((v) => v + 1);
  };

  const playerName = saveManager.get().player.name;

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
      return <Game key={run.id} tutorial={run.tutorial} services={services} onEnd={handleLoopEnd} onQuit={() => setScreen('menu')} />;
    case 'results':
      return <Results result={result} playerName={playerName} services={services} onAgain={() => play(false)} onMenu={() => setScreen('menu')} />;
    case 'album':
      return <Album services={services} onClose={() => setScreen('menu')} />;
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
          onSettings={() => setScreen('settings')}
          onDevLevelUp={devLevelUp}
        />
      );
  }
}
