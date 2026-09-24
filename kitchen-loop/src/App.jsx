import { useState } from 'react';
import { Menu } from './screens/Menu.jsx';
import { Game } from './screens/Game.jsx';
import { Results } from './screens/Results.jsx';
import { Story } from './screens/Story.jsx';
import { NameInput } from './screens/NameInput.jsx';
import { RecipeBook } from './screens/RecipeBook.jsx';
import { applyLoopResult, discoveredSecrets } from './economy/rewards.js';

// Routes between screens. Game data lives in the save manager, not in component state.
// First session (spec 8.1): Pip introduces himself → name → premise → tutorial loop → results → menu.
export function App({ saveManager, adManager }) {
  const save = saveManager.get();
  const firstSession = !save.tutorialDone;
  const [screen, setScreen] = useState(firstSession ? 'intro' : 'menu');
  const [level, setLevel] = useState(save.player.level);
  const [result, setResult] = useState(null);
  const [run, setRun] = useState({ id: 0, tutorial: false });
  const [storyReplay, setStoryReplay] = useState(false);

  const play = (tutorial = false) => {
    setRun((r) => ({ id: r.id + 1, tutorial }));
    setScreen('game');
  };

  async function handleLoopEnd(loopResult) {
    let newRecord = false;
    await saveManager.update((s) => {
      ({ newRecord } = applyLoopResult(s, loopResult));
      if (loopResult.tutorial) s.tutorialDone = true;
    });
    setResult({ ...loopResult, newRecord });
    setScreen('results');
  }

  const saveName = async (name) => {
    await saveManager.update((s) => {
      s.player.name = name;
    });
    setScreen('premise');
  };

  const playerName = saveManager.get().player.name;

  switch (screen) {
    case 'intro':
      return <Story key="intro" scene="intro" playerName={playerName} onDone={() => setScreen(storyReplay ? 'premise' : 'name')} />;
    case 'name':
      return <NameInput initial={firstSession ? '' : playerName} onDone={saveName} />;
    case 'premise':
      return (
        <Story
          key="premise"
          scene="premise"
          playerName={playerName}
          onDone={() => {
            if (storyReplay) {
              setStoryReplay(false);
              setScreen('menu');
            } else play(true);
          }}
        />
      );
    case 'game':
      return (
        <Game
          key={run.id}
          level={level}
          tutorial={run.tutorial}
          saveManager={saveManager}
          adManager={adManager}
          onEnd={handleLoopEnd}
          onQuit={() => setScreen('menu')}
        />
      );
    case 'results':
      return <Results result={result} playerName={playerName} onAgain={() => play(false)} onMenu={() => setScreen('menu')} />;
    case 'recipes':
      return (
        <div className="screen scroll">
          <RecipeBook level={level} discovered={discoveredSecrets(saveManager.get())} onClose={() => setScreen('menu')} />
        </div>
      );
    default:
      return (
        <Menu
          saveManager={saveManager}
          level={level}
          onLevelChange={setLevel}
          onPlay={() => play(false)}
          onRecipes={() => setScreen('recipes')}
          onStory={() => {
            setStoryReplay(true);
            setScreen('intro');
          }}
          onTutorial={() => play(true)}
        />
      );
  }
}
