import { recipes } from '../data/recipes.js';
import { getUnlockedContent } from '../systems/unlocks.js';
import { RecipeIngredients } from './IngredientIcon.jsx';
import { spriteUrl } from '../assets/manifest.js';
import { t, formatNumber } from '../utils/i18n.js';

const PATTERN_MARK = { group: '', line: '↔', square: '▦' };

// Quick legend of the recipes this service can cook (Daniel: "una leyenda desplegable rápida de las recetas
// desbloqueadas, es muy difícil memorizarlas"): dish, ingredients in their shape and points, nothing else.
// Secret recipes only once discovered; locked ones are left to the recipe book in the album.
export function RecipeLegend({ level, unlocks = {}, discovered = [] }) {
  const unlocked = new Set(getUnlockedContent(level, unlocks).recipes);
  const known = recipes.filter((r) => unlocked.has(r.id) && (r.kind !== 'secret' || discovered.includes(r.id)));
  return (
    <div className="legend">
      <p className="hint small">{t('legend.hint')}</p>
      <ul className="legend-grid">
        {known.map((r) => (
          <li key={r.id} className={`legend-item ${r.kind}`}>
            <img className="legend-dish" src={spriteUrl(`dishes/${r.id}`)} alt="" />
            <span className="legend-text">
              <strong>{t(`recipe.${r.id}`)}</strong>
              <span className="legend-row">
                <RecipeIngredients recipe={r} size={22} />
                {PATTERN_MARK[r.pattern] && <span className="legend-mark">{PATTERN_MARK[r.pattern]}</span>}
              </span>
              <span className="legend-points">{t('book.points', { n: formatNumber(r.points) })}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
