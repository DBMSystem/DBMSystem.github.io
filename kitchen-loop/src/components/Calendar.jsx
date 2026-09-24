import { useMemo, useState } from 'react';
import { calendarDays } from '../data/calendar.js';
import { claimCalendar, canClaimCalendar } from '../systems/calendar.js';
import { balance } from '../data/balance.js';
import { Button } from './Button.jsx';
import { PipSprite } from './PipSprite.jsx';
import { CardReveal } from './CardReveal.jsx';
import { createRng } from '../utils/rng.js';
import { localDateString, effectiveNow } from '../utils/time.js';
import { t } from '../utils/i18n.js';
import { useBackButton } from '../utils/backButton.js';

function rewardText(day) {
  if (day.cards) {
    const many = day.cards.count > 1;
    const rarity = t(`rarity.${many ? 'many' : 'one'}.${day.cards.rarity}`);
    return t(many ? 'calendar.reward.cardsPlural' : 'calendar.reward.cards', { count: day.cards.count, rarity });
  }
  if (day.fragments) return t('calendar.reward.fragments', { n: day.fragments });
  return t(day.packs.special ? 'calendar.reward.special' : 'calendar.reward.pack');
}

export const calendarToday = (save) => localDateString(new Date(effectiveNow(save, Date.now(), balance.clockRollbackTolerance)));

// Pip's calendar (spec 5.5): a gift the first time the game is opened on a new day.
export function Calendar({ services, onClose }) {
  const { saveManager, audio, haptics } = services;
  const rng = useMemo(() => createRng(), []);
  const save = saveManager.get();
  const [claimed, setClaimed] = useState(null);
  const [revealing, setRevealing] = useState(false);
  useBackButton(() => !revealing && onClose());
  const today = calendarToday(save);
  const current = save.calendar.dayIndex;

  const claim = async () => {
    let reward = null;
    await saveManager.update((s) => {
      reward = claimCalendar(s, rng, today, Date.now());
    });
    if (!reward) return;
    audio.play('coin');
    setClaimed(reward);
    if (reward.cards.length > 0) setRevealing(true);
  };

  if (revealing) return <CardReveal items={claimed.cards} audio={audio} haptics={haptics} onDone={() => setRevealing(false)} />;

  return (
    <div className="overlay scroll" onClick={onClose}>
      <div className="panel calendar" onClick={(e) => e.stopPropagation()}>
        <h2>{t('calendar.title')}</h2>
        <div className="pip-says">
          <PipSprite expression={claimed ? 'celebrating' : 'happy'} size={72} />
          <p className="speech small">{claimed ? t('calendar.claimed') : t('calendar.pip')}</p>
        </div>
        <ol className="calendar-days">
          {calendarDays.map((day, i) => {
            const done = i < (claimed ? claimed.day : current);
            const isToday = i === (claimed ? claimed.day - 1 : current);
            return (
              <li key={i} className={`${isToday ? 'today' : ''} ${done ? 'done' : ''}`}>
                <strong>{t('calendar.day', { n: i + 1 })}</strong>
                <span>{rewardText(day)}</span>
              </li>
            );
          })}
        </ol>
        <p className="hint small">{t('calendar.hint')}</p>
        {!claimed && canClaimCalendar(save, today) ? (
          <Button onClick={claim}>{t('calendar.claim')}</Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t('album.close')}
          </Button>
        )}
      </div>
    </div>
  );
}
