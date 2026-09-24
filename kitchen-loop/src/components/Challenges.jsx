import { challengeReward, challengeText } from '../systems/challenges.js';
import { t, formatNumber } from '../utils/i18n.js';

// Pip's daily orders with progress bars. `live(challenge)` overrides progress during a service.
export function Challenges({ list, live, compact = false }) {
  const allDone = list.length > 0 && list.every((c) => c.done);
  return (
    <div className={`challenges ${compact ? 'compact' : ''}`}>
      <h3>{t('challenges.title')}</h3>
      {!compact && <p className="hint small">{t('challenges.hint')}</p>}
      <ul>
        {list.map((c) => {
          const progress = Math.min(c.target, live ? live(c) : c.progress);
          const done = c.done || progress >= c.target;
          const reward = challengeReward(c);
          return (
            <li key={c.id} className={done ? 'done' : ''}>
              <span className="challenge-text">
                {done ? '✔ ' : ''}
                {challengeText(c)}
              </span>
              <span className="challenge-bar">
                <span style={{ width: `${(progress / c.target) * 100}%` }} />
              </span>
              <span className="hint small">
                {t('challenges.progress', { progress: formatNumber(progress), target: formatNumber(c.target) })} · {t('challenges.reward', reward)}
              </span>
            </li>
          );
        })}
      </ul>
      {allDone && <p className="hint small">{t('challenges.allDone')}</p>}
    </div>
  );
}
