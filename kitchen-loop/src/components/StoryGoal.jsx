import { nextChapterGoal } from '../systems/story.js';
import { t } from '../utils/i18n.js';

const chapterName = (next) => t(next === 'finale' ? 'chapter.finale' : `chapter.${next}`);
const percent = (share) => Math.floor(share * 100);

// The story ahead (Daniel: "falta contexto de que hay una historia que seguir"): the chapter now, a hook for the
// next one, what it needs and how far along the player is. `compact` (results): the hook and the bar only.
export function StoryGoal({ save, compact = false }) {
  const goal = nextChapterGoal(save);
  const { chapter } = save.story;
  if (!goal) {
    return compact ? null : (
      <div className="story-goal done">
        <span className="label">{t('story.goal.complete')}</span>
        <p className="hint small">{t('story.goal.completeText')}</p>
      </div>
    );
  }
  return (
    <div className={`story-goal ${compact ? 'compact' : ''}`}>
      {!compact && <span className="label">{t('story.goal.now', { n: chapter, name: t(`chapter.${chapter}`) })}</span>}
      <strong>{t('story.goal.next', { name: chapterName(goal.next) })}</strong>
      <p className="teaser">{t(`story.next.${goal.next}`)}</p>
      <div className="goal-bar">
        <span className="progress-bar">
          <span style={{ width: `${percent(goal.share)}%` }} />
        </span>
        <span className="goal-percent">{t('hud.percent', { p: percent(goal.share) })}</span>
      </div>
      {!compact && (
        <ul className="goal-parts">
          {goal.parts.map((p) => (
            <li key={p.key} className={p.have >= p.need ? 'met' : ''}>
              {t(`story.goal.${p.key}`, { have: p.have, need: p.need })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
