import { useMemo } from 'react';
import { Button } from '../components/Button.jsx';
import { PipSprite } from '../components/PipSprite.jsx';
import { Typewriter } from '../components/Typewriter.jsx';
import { t, formatNumber } from '../utils/i18n.js';
import { pipTriggers } from '../data/dialogues.js';
import { endTrigger } from '../systems/pip.js';
import { balance } from '../data/balance.js';
import { createRng } from '../utils/rng.js';

export function Results({ result, playerName, onAgain, onMenu }) {
  const pip = useMemo(() => {
    const trigger = pipTriggers[endTrigger(result, balance)];
    return { expression: trigger.expression, key: createRng().pick(trigger.lines).key };
  }, [result]);
  const rows = [
    ['results.bestCombo', `x${result.bestCombo}`],
    ['results.orders', result.ordersServed],
    ['results.recipes', result.recipesCooked],
  ];
  return (
    <div className="screen results">
      <h2>{t(result.endReason === 'overflow' ? 'results.titleOverflow' : 'results.title')}</h2>
      <div className="score-block">
        <span className="label">{t('results.score')}</span>
        <span className="score">{formatNumber(result.score)}</span>
        {result.newRecord && <span className="record">{t('results.newRecord')}</span>}
      </div>
      <dl className="result-rows">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="pip-says">
        <PipSprite expression={pip.expression} size={84} />
        <p className="speech small">
          <Typewriter text={t(pip.key, { nombre: playerName })} />
        </p>
      </div>
      {result.discovered.length > 0 && (
        <div className="discovered">
          <span className="label">{t('results.discovered')}</span>
          {result.discovered.map((id) => (
            <strong key={id}>{t(`recipe.${id}`)}</strong>
          ))}
        </div>
      )}
      <Button onClick={onAgain}>{t('results.again')}</Button>
      <Button variant="secondary" onClick={onMenu}>
        {t('results.menu')}
      </Button>
    </div>
  );
}
