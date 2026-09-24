import { useState } from 'react';
import { storyScenes } from '../data/dialogues.js';
import { PipSprite } from '../components/PipSprite.jsx';
import { Typewriter } from '../components/Typewriter.jsx';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

// Dialogue scene (spec 6.3): up to 3 bubbles, tap to advance, always skippable, never during play.
export function Story({ scene, playerName, onDone }) {
  const bubbles = storyScenes[scene];
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const bubble = bubbles[index];

  const advance = () => {
    if (!typed) {
      setTyped(true);
      return;
    }
    if (index + 1 >= bubbles.length) onDone();
    else {
      setIndex(index + 1);
      setTyped(false);
    }
  };

  return (
    <div className="screen story" onClick={advance} style={{ '--scene': `url(${spriteUrl('ui/kitchen_day')})` }}>
      <button type="button" className="skip" onClick={(e) => (e.stopPropagation(), onDone())}>
        {t('story.skip')}
      </button>
      <div className="story-stage">
        <div className="speech">
          <Typewriter text={t(bubble.key, { nombre: playerName })} skip={typed} onDone={() => setTyped(true)} />
          {typed && <span className="next-hint">{t('story.next')} ▸</span>}
        </div>
        <PipSprite expression={bubble.expression} size={190} talking={!typed} />
      </div>
      <div className="dots">
        {bubbles.map((_, k) => (
          <span key={k} className={k === index ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
