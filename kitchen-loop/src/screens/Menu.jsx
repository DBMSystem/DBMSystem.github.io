import { useState } from 'react';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t, formatNumber } from '../utils/i18n.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { maxContentLevel } from '../data/unlocks.js';
import { spriteUrl } from '../assets/manifest.js';

export function Menu({ saveManager, level, onLevelChange, onPlay, onRecipes, onStory, onTutorial }) {
  const save = saveManager.get();
  const [tapToPlace, setTapToPlace] = useState(save.settings.tapToPlace);

  const changeTapToPlace = (value) => {
    setTapToPlace(value);
    saveManager.update((s) => {
      s.settings.tapToPlace = value;
    });
  };

  return (
    <div className="screen menu">
      <img className="menu-scene" src={spriteUrl('ui/menu_scene')} alt={t('game.title')} />
      <p className="slogan">{t('game.slogan')}</p>
      <p className="greeting">{t('menu.greeting', { nombre: save.player.name })}</p>
      <Button onClick={onPlay}>{t('menu.play')}</Button>
      <div className="menu-row">
        <Button variant="secondary" onClick={onRecipes}>
          {t('menu.recipes')}
        </Button>
        <Button variant="secondary" onClick={onStory}>
          {t('menu.story')}
        </Button>
        <Button variant="secondary" onClick={onTutorial}>
          {t('menu.tutorial')}
        </Button>
      </div>
      <div className="stats">
        <span>{t('menu.bestScore', { score: formatNumber(save.stats.bestScore) })}</span>
        <span>{t('menu.loopsPlayed', { n: save.stats.loopsPlayed })}</span>
      </div>
      <Toggle label={t('menu.tapToPlace')} value={tapToPlace} onChange={changeTapToPlace} />
      {DEV_TOOLS && (
        <div className="dev-panel">
          <div className="stepper">
            <span>{t('menu.testLevel')}</span>
            <button type="button" onClick={() => onLevelChange(Math.max(1, level - 1))} aria-label="-">
              −
            </button>
            <strong>{level}</strong>
            <button type="button" onClick={() => onLevelChange(Math.min(maxContentLevel, level + 1))} aria-label="+">
              +
            </button>
          </div>
          <p className="hint small">{t('menu.testLevelHint')}</p>
        </div>
      )}
    </div>
  );
}
