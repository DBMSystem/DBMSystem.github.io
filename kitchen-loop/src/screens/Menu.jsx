import { useState } from 'react';
import { Button } from '../components/Button.jsx';
import { Calendar, calendarToday } from '../components/Calendar.jsx';
import { canClaimCalendar } from '../systems/calendar.js';
import { todayChallenges } from '../systems/challenges.js';
import { Challenges } from '../components/Challenges.jsx';
import { xpToNext } from '../economy/progression.js';
import { balance } from '../data/balance.js';
import { t, formatNumber } from '../utils/i18n.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { spriteUrl } from '../assets/manifest.js';

// Main menu (spec 8.3): kitchen scene, PLAY, album, warehouse (locked until chapter 3) and settings.
export function Menu({ services, onPlay, onAlbum, onSettings, onDevLevelUp }) {
  const { saveManager, adManager } = services;
  const save = saveManager.get();
  const today = calendarToday(save);
  const calendarReady = canClaimCalendar(save, today);
  const [showCalendar, setShowCalendar] = useState(calendarReady);
  const { level, xp, name } = save.player;
  const xpShare = level >= balance.maxLevel ? 1 : xp / xpToNext(level);
  const albumDot = save.packs.standard + save.packs.special > 0 || (save.stats.loopsPlayed >= balance.adsMinLoops && adManager.freePackWait() === 0);
  const warehouseOpen = save.story.chapter >= 3;

  return (
    <div className="screen menu">
      <div className="status-bar">
        <span className="level-chip">{t('hud.level', { n: level })}</span>
        <span className="xp-bar">
          <span style={{ width: `${Math.round(xpShare * 100)}%` }} />
        </span>
        <span className="coins">
          <img src={spriteUrl('ui/icon_coin')} alt="" />
          {formatNumber(save.coins)}
        </span>
      </div>
      <img className="menu-scene" src={spriteUrl('ui/menu_scene')} alt={t('game.title')} />
      <p className="slogan">{t('game.slogan')}</p>
      <p className="greeting">{t('menu.greeting', { nombre: name })}</p>
      <Button icon="icon_cook" onClick={onPlay}>
        {t('menu.play')}
      </Button>
      {save.tutorialDone && <Challenges list={todayChallenges(save, today)} compact />}
      <div className="menu-row">
        <Button variant="secondary" icon="icon_rare" onClick={onAlbum}>
          {t('menu.album')}
          {albumDot && <span className="dot" />}
        </Button>
        <Button variant="secondary" icon="icon_coin" disabled={!warehouseOpen} title={t('menu.locked')}>
          {t(warehouseOpen ? 'menu.warehouse' : 'menu.warehouseLocked')}
        </Button>
        <Button variant="secondary" icon="icon_timer" onClick={() => setShowCalendar(true)}>
          {t('menu.calendar')}
          {calendarReady && <span className="dot" />}
        </Button>
      </div>
      <Button variant="secondary" onClick={onSettings}>
        {t('menu.settings')}
      </Button>
      <div className="stats">
        <span>{t('menu.bestScore', { score: formatNumber(save.stats.bestScore) })}</span>
        <span>{t('menu.loopsPlayed', { n: save.stats.loopsPlayed })}</span>
      </div>
      {DEV_TOOLS && (
        <div className="dev-panel">
          <Button variant="secondary" onClick={onDevLevelUp}>
            {t('menu.devLevel')}
          </Button>
        </div>
      )}
      {showCalendar && <Calendar services={services} onClose={() => setShowCalendar(false)} />}
    </div>
  );
}
