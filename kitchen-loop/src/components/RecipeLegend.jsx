import { cookableRecipes } from '../systems/unlocks.js';
import { RecipeIngredients } from './IngredientIcon.jsx';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

const PATTERN_MARK = { group: '', line: '↔', square: '▦' };

// Quick legend of the recipes this service can cook: dish, name and ingredients in their shape, no points (Daniel:
// "que no indique cuántos puntos gana, eso sale cuando acabas la receta en la sartén").
// `guide`: the see-through strip over the kitchen during a service.
export function RecipeLegend({ level, unlocks, discovered, guide = false }) {
  return (
    <div className={guide ? 'legend guide' : 'legend'}>
      {!guide && <p className="hint small">{t('legend.hint')}</p>}
      <ul className="legend-grid">
        {cookableRecipes(level, unlocks, discovered).map((r) => (
          <li key={r.id} className={`legend-item ${r.kind}`}>
            <img className="legend-dish" src={spriteUrl(`dishes/${r.id}`)} alt="" />
            <span className="legend-text">
              <strong>{t(`recipe.${r.id}`)}</strong>
              <span className="legend-row">
                <RecipeIngredients recipe={r} size={guide ? 16 : 22} />
                {PATTERN_MARK[r.pattern] && <span className="legend-mark">{PATTERN_MARK[r.pattern]}</span>}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
