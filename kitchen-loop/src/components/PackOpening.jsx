import { useState } from 'react';
import { CardReveal } from './CardReveal.jsx';
import { t } from '../utils/i18n.js';
import { useBackButton } from '../utils/backButton.js';

// Pack (spec 4.7): appears → shakes → tap → glow and opening → cards one by one, the third a bit more special.
// `open()` performs the real opening (inventory + save) and returns the card results.
export function PackOpening({ special = false, open, audio, haptics, onDone }) {
  const [phase, setPhase] = useState('closed'); // closed | opening | cards
  const [results, setResults] = useState(null);
  useBackButton(() => {}); // the pack is opened with taps; Back must not close the screen behind

  const tapPack = async () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    audio?.play('packOpen');
    haptics?.vibrate('medium');
    const cards = await open();
    setTimeout(() => {
      setResults(cards);
      setPhase('cards');
    }, 700);
  };

  if (phase === 'cards') return <CardReveal items={results} audio={audio} haptics={haptics} onDone={onDone} lastIsSpecial />;
  return (
    <div className="reveal pack-stage" onClick={tapPack}>
      <p className="reveal-title">{t(special ? 'pack.special' : 'pack.title')}</p>
      <div className={`pack ${special ? 'pack-special' : ''} ${phase}`}>
        <img src={`${import.meta.env.BASE_URL}icon-512.png`} alt="" />
        <span>KITCHEN LOOP</span>
      </div>
      <p className="reveal-hint">{t('pack.tap')}</p>
    </div>
  );
}
