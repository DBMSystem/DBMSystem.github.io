import { useState } from 'react';
import { Menu } from './screens/Menu.jsx';
import { Game } from './screens/Game.jsx';
import { Results } from './screens/Results.jsx';
import { applyLoopResult } from './economy/rewards.js';

// Routes between screens. Game data lives in the save manager, not in component state.
export function App({ saveManager, adManager }) {
  const [screen, setScreen] = useState('menu');
  const [level, setLevel] = useState(saveManager.get().player.level);
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);

  const play = () => {
    setRun((n) => n + 1);
    setScreen('game');
  };

  async function handleLoopEnd(loopResult) {
    let newRecord = false;
    await saveManager.update((save) => {
      ({ newRecord } = applyLoopResult(save, loopResult));
    });
    setResult({ ...loopResult, newRecord });
    setScreen('results');
  }

  if (screen === 'game') {
    return <Game key={run} level={level} saveManager={saveManager} adManager={adManager} onEnd={handleLoopEnd} onQuit={() => setScreen('menu')} />;
  }
  if (screen === 'results') {
    return <Results result={result} onAgain={play} onMenu={() => setScreen('menu')} />;
  }
  return <Menu saveManager={saveManager} level={level} onLevelChange={setLevel} onPlay={play} />;
}
