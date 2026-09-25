import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button.jsx';
import { PipSprite } from '../components/PipSprite.jsx';
import { Typewriter } from '../components/Typewriter.jsx';
import { CardReveal } from '../components/CardReveal.jsx';
import { t, formatNumber } from '../utils/i18n.js';
import { pipTriggers } from '../data/dialogues.js';
import { endTrigger } from '../systems/pip.js';
import { balance } from '../data/balance.js';
import { xpToNext } from '../economy/progression.js';
import { createRng } from '../utils/rng.js';
import { challengeText } from '../systems/challenges.js';
import { spriteUrl } from '../assets/manifest.js';

const XP_FILL_MS = 900;
const unlockName = ({ kind, id }) =>
  kind === 'features' ? t(`unlock.feature.${id}`) : t(`unlock.${kind.slice(0, -1)}`, { name: t(`${kind.slice(0, -1)}.${id}`) });

// Results (spec 8.5): new cards first, then score, XP bar (with level-ups), coins, unlocks and Pip.
// Everything animates in under 4 s and can be skipped with a tap; PLAY AGAIN is one tap away.
export function Results({ result, playerName, services, onAgain, onMenu }) {
  const { audio, haptics } = services;
  const [showCards, setShowCards] = useState(result.cards.length > 0);
  const [skip, setSkip] = useState(false);
  const pip = useMemo(() => {
    const trigger = pipTriggers[endTrigger(result, balance)];
    return { expression: trigger.expression, key: createRng().pick(trigger.lines).key };
  }, [result]);
  const leveled = result.levels.length > 0;
  const endShare = result.levelAfter >= balance.maxLevel ? 1 : result.xpAfter / xpToNext(result.levelAfter);
  const startShare = leveled ? 0 : result.xpBefore / xpToNext(result.levelBefore);
  const [xpShare, setXpShare] = useState(startShare);

  useEffect(() => {
    if (showCards) return undefined;
    const timer = setTimeout(() => {
      setXpShare(endShare);
      audio.play(leveled ? 'levelUp' : 'coin');
    }, skip ? 0 : 300);
    return () => clearTimeout(timer);
  }, [showCards, skip, endShare, leveled, audio]);

  if (showCards) return <CardReveal items={result.cards} audio={audio} haptics={haptics} onDone={() => setShowCards(false)} />;

  const rows = [
    ['results.bestCombo', `x${result.bestCombo}`],
    ['results.orders', result.ordersServed],
    ['results.recipes', result.recipesCooked],
  ];
  return (
    <div className={`screen results ${skip ? 'no-anim' : ''}`} onClick={() => setSkip(true)}>
      <h2>{t(result.endReason === 'overflow' ? 'results.titleOverflow' : 'results.title')}</h2>
      <div className="score-block">
        <span className="label">{t('results.score')}</span>
        <span className="score">{formatNumber(result.score)}</span>
        {result.newRecord && <span className="record">{t('results.newRecord')}</span>}
      </div>

      <div className="gains">
        <div className="xp-line">
          <span className="level-chip">{t('hud.level', { n: result.levelAfter })}</span>
          <span className="xp-bar big">
            <span style={{ width: `${Math.round(xpShare * 100)}%`, transitionDuration: `${skip ? 0 : XP_FILL_MS}ms` }} />
          </span>
          <span className="xp-gain">{t('results.xp', { n: result.xp })}</span>
        </div>
        <span className="coins pop-in">
          <img src={spriteUrl('ui/icon_coin')} alt="" />
          {t('results.coins', { n: formatNumber(result.coins) })}
        </span>
      </div>

      {leveled && (
        <div className="level-up pop-in">
          {result.levels.map((l) => (
            <p key={l.level}>
              <strong>{t('results.levelUp', { n: l.level })}</strong> {t('results.coins', { n: l.coins })}
              {l.pack && ` · ${t('results.packEarned')}`}
            </p>
          ))}
          {result.unlocks.length > 0 && (
            <ul className="unlocks">
              {result.unlocks.map((u) => (
                <li key={`${u.kind}-${u.id}`}>{unlockName(u)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result.mastery.map((m) => (
        <p key={m.recipeId + m.level} className="hint small pop-in">
          {t('results.mastery', { recipe: t(`recipe.${m.recipeId}`), n: m.level })}
        </p>
      ))}

      {result.chapters.includes(3) && (
        <div className="brulee-peek pop-in">
          <img src={spriteUrl('brulee/surprised')} alt={t('story.brulee')} />
          <span className="speech small">{t('results.bruleeTeaser')}</span>
        </div>
      )}
      {result.chapters.map((n) => (
        <p key={n} className="chapter-news pop-in">
          {t('results.chapter', { name: t(`chapter.${n}`) })}
        </p>
      ))}
      {(result.fragments > 0 || result.goldenCooked > 0) && (
        <p className="hint small pop-in">
          {[result.fragments > 0 && t('results.fragments', { n: result.fragments }), result.goldenCooked > 0 && t('results.golden', { n: result.goldenCooked })]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {result.challenges.completed.length > 0 && (
        <div className="challenges-done pop-in">
          <span className="label">{t('results.challenges')}</span>
          {result.challenges.completed.map((c) => (
            <p key={c.id}>
              ✔ {challengeText(c)} <span className="hint small">{t('challenges.reward', c.reward)}</span>
            </p>
          ))}
          {result.challenges.bonus && <p className="bonus">{t('challenges.bonus')}</p>}
        </div>
      )}

      <dl className="result-rows">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div>
          <dt>{t('results.cards')}</dt>
          <dd>{t('results.album', result.album)}</dd>
        </div>
      </dl>
      {result.discovered.length > 0 && (
        <div className="discovered">
          <span className="label">{t('results.discovered')}</span>
          {result.discovered.map((id) => (
            <strong key={id}>{t(`recipe.${id}`)}</strong>
          ))}
        </div>
      )}
      <div className="pip-says">
        <PipSprite expression={pip.expression} size={84} />
        <p className="speech small">
          <Typewriter text={t(pip.key, { nombre: playerName })} skip={skip} voice="pip" />
        </p>
      </div>
      <Button icon="icon_cook" onClick={onAgain}>
        {t('results.again')}
      </Button>
      <Button variant="secondary" onClick={onMenu}>
        {t('results.menu')}
      </Button>
    </div>
  );
}
