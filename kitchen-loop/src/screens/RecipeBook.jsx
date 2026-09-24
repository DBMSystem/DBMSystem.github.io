import { recipes } from '../data/recipes.js';
import { secretHints } from '../data/dialogues.js';
import { getUnlockedContent, unlockLevelOf } from '../systems/unlocks.js';
import { RecipeIngredients } from '../components/IngredientIcon.jsx';
import { Button } from '../components/Button.jsx';
import { t, formatNumber } from '../utils/i18n.js';
import { spriteUrl, spriteScale } from '../assets/manifest.js';
import { masteryLevel } from '../cards/album.js';

const patternKey = (recipe) => (recipe.pattern === 'line' && recipe.ordered ? 'book.pattern.lineOrdered' : `book.pattern.${recipe.pattern}`);

function RecipeRow({ recipe, locked, timesCooked = 0 }) {
  const dish = spriteUrl(`dishes/${recipe.id}`);
  return (
    <li className={`recipe-row ${locked ? 'locked' : ''}`}>
      {dish && <img className="dish" src={dish} alt="" style={{ transform: `scale(${spriteScale(`dishes/${recipe.id}`)})` }} />}
      <div className="recipe-head">
        <strong>{t(`recipe.${recipe.id}`)}</strong>
        <span className="points">{t('book.points', { n: formatNumber(recipe.points) })}</span>
      </div>
      <RecipeIngredients recipe={recipe} size={30} />
      <span className="pattern-text">{locked ? t('book.locked', { n: unlockLevelOf('recipes', recipe.id) }) : t(patternKey(recipe))}</span>
      {!locked && <span className="mastery">{t('album.mastery', { n: masteryLevel(timesCooked), times: timesCooked })}</span>}
    </li>
  );
}

// Recipe book (spec 4.9 recipes tab): known recipes, what unlocks next and riddles for secrets.
// `saved`: save.recipes (times cooked). `embedded`: inside the album, without title or close button.
// `unlocks`: chapter and bought utensils, so utensil recipes show once their utensil is bought.
export function RecipeBook({ level, unlocks = {}, discovered, saved = {}, onClose, embedded = false }) {
  const unlocked = new Set(getUnlockedContent(level, unlocks).recipes);
  const visible = recipes.filter((r) => r.kind === 'visible');
  const utensilRecipes = recipes.filter((r) => r.kind === 'utensil' && unlocked.has(r.id));
  const secrets = recipes.filter((r) => r.kind === 'secret' && unlocked.has(r.id));
  return (
    <div className="recipe-book">
      {!embedded && <h2>{t('book.title')}</h2>}
      <p className="hint">{t('book.intro')}</p>
      <p className="tip">{t('book.counterSale')}</p>
      <h3>{t('book.known')}</h3>
      <ul>
        {visible.map((r) => (
          <RecipeRow key={r.id} recipe={r} locked={!unlocked.has(r.id)} timesCooked={saved[r.id]?.timesCooked} />
        ))}
      </ul>
      {utensilRecipes.length > 0 && (
        <>
          <h3>{t('book.utensil')}</h3>
          <ul>
            {utensilRecipes.map((r) => (
              <RecipeRow key={r.id} recipe={r} timesCooked={saved[r.id]?.timesCooked} />
            ))}
          </ul>
        </>
      )}
      {secrets.length > 0 && (
        <>
          <h3>{t('book.secrets')}</h3>
          <p className="hint small">{t('book.secretsHint')}</p>
          <ul>
            {secrets.map((r) =>
              discovered.includes(r.id) ? (
                <RecipeRow key={r.id} recipe={r} timesCooked={saved[r.id]?.timesCooked} />
              ) : (
                <li key={r.id} className="recipe-row secret">
                  <strong>{t('book.unknownSecret')}</strong>
                  <em>{t(secretHints[r.id].key)}</em>
                </li>
              ),
            )}
          </ul>
        </>
      )}
      {!embedded && <Button onClick={onClose}>{t('book.close')}</Button>}
    </div>
  );
}
