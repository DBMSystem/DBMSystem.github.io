import { useEffect, useState } from 'react';
import { CardView } from './CardView.jsx';
import { STARS } from '../data/cards.js';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';
import { useBackButton } from '../utils/backButton.js';

// Maximum reveal time per rarity (spec 4.5), then the card waits for a tap.
const DURATION_MS = { common: 1000, rare: 1500, epic: 2500, legendary: 4000 };
const SOUND = { common: 'cardCommon', rare: 'cardRare', epic: 'cardEpic', legendary: 'cardLegendary' };

// Shows cards one at a time: "¡NUEVA CARTA!" or "+X fragmentos", rarity animation, tap to skip or continue.
export function CardReveal({ items, audio, haptics, onDone, lastIsSpecial = false }) {
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(false);
  useBackButton(() => {}); // the cards are revealed with taps; Back must not close the screen behind
  const item = items[index];

  useEffect(() => {
    if (!item) return undefined;
    setSettled(false);
    audio?.play(SOUND[item.rarity]);
    if (item.rarity === 'legendary') haptics?.vibrate('legendary');
    const timer = setTimeout(() => setSettled(true), DURATION_MS[item.rarity]);
    return () => clearTimeout(timer);
  }, [index, item, audio, haptics]);

  if (!item) return null;
  const tap = () => {
    if (!settled) setSettled(true);
    else if (index + 1 < items.length) setIndex(index + 1);
    else onDone();
  };
  const special = lastIsSpecial && index === items.length - 1;

  return (
    <div className={`reveal reveal-${item.rarity} ${settled ? 'settled' : ''} ${special ? 'special' : ''}`} onClick={tap}>
      {item.rarity === 'legendary' && <img className="reveal-rainbow" src={spriteUrl('vfx/rainbow')} alt="" />}
      <p className="reveal-title">{item.isNew ? t('reveal.newCard') : t('reveal.duplicate', { n: item.fragments })}</p>
      <div className="reveal-card" key={index}>
        <CardView cardId={item.cardId} size="large" />
      </div>
      <p className="reveal-rarity">{t('rarity.label', { stars: '★'.repeat(STARS[item.rarity]), name: t(`rarity.${item.rarity}`) })}</p>
      <p className="reveal-hint">
        {items.length > 1 && `${index + 1} / ${items.length} · `}
        {t('reveal.tapToSkip')}
      </p>
    </div>
  );
}
