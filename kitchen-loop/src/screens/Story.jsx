import { useState } from 'react';
import { storyScenes, chapterScenes } from '../data/dialogues.js';
import { PipSprite } from '../components/PipSprite.jsx';
import { Typewriter } from '../components/Typewriter.jsx';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

// Chapter number shown on the title card of a chapter scene ('chapter3' → 3, 'finale' → null).
const chapterOf = (scene) => (scene.startsWith('chapter') ? Number(scene.slice(7)) : null);

// Dialogue scene (spec 6.3): up to 3 bubbles, tap to advance, always skippable, never during play.
// Pip or Brûlée speaks; chapter scenes open with the chapter's title.
export function Story({ scene, playerName, onDone }) {
  const chapter = chapterScenes[scene];
  const bubbles = chapter ? chapter.bubbles : storyScenes[scene];
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const bubble = bubbles[index];
  const n = chapterOf(scene);
  const brulee = bubble.speaker === 'brulee';

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
    <div
      className={`screen story ${chapter?.night ? 'night' : ''}`}
      onClick={advance}
      style={{ '--scene': `url(${spriteUrl(chapter?.night ? 'ui/kitchen_night' : 'ui/kitchen_day')})` }}
    >
      <button type="button" className="skip" onClick={(e) => (e.stopPropagation(), onDone())}>
        {t('story.skip')}
      </button>
      {chapter && (
        <div className="chapter-card" key={scene}>
          {n && <span className="label">{t('story.chapter', { n })}</span>}
          <strong>{t(n ? `chapter.${n}` : 'chapter.finale')}</strong>
        </div>
      )}
      <div className={`story-stage ${brulee ? 'right' : ''}`}>
        <div className="speech">
          {chapter && <span className="speaker">{t(brulee ? 'story.brulee' : 'story.pip')}</span>}
          <Typewriter text={t(bubble.key, { nombre: playerName })} skip={typed} onDone={() => setTyped(true)} voice={bubble.speaker} />
          {typed && <span className="next-hint">{t('story.next')} ▸</span>}
        </div>
        {brulee ? (
          <img
            className={`pip-sprite brulee ${typed ? '' : 'talking'}`}
            src={spriteUrl(`brulee/${bubble.expression}`)}
            alt={t('story.brulee')}
            width={190}
            height={190}
            key={bubble.expression}
          />
        ) : (
          <PipSprite expression={bubble.expression} size={190} talking={!typed} />
        )}
      </div>
      <div className="dots">
        {bubbles.map((_, k) => (
          <span key={k} className={k === index ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
