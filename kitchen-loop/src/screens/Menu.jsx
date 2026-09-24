import { useState } from 'react';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t, formatNumber } from '../utils/i18n.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { maxContentLevel } from '../data/unlocks.js';
import { spriteUrl } from '../assets/manifest.js';

export function Menu({ saveManager, level, onLevelChange, onPlay }) {
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
      <Button onClick={onPlay}>{t('menu.play')}</Button>
      <div className="stats">
        <span>{t('menu.bestScore', { score: formatNumber(save.stats.bestScore) })}</span>
        <span>{t('menu.loopsPlayed', { n: save.stats.loopsPlayed })}</span>
      </div>
      <p className="hint">{t('menu.howTo')}</p>
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
