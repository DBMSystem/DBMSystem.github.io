import { spriteUrl, spriteScale } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

export function IngredientIcon({ id, size = 32 }) {
  const src = spriteUrl(`ingredients/${id}`);
  const name = t(`ingredient.${id}`);
  return src ? (
    <img
      className="ingredient-icon"
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      style={{ transform: `scale(${spriteScale(`ingredients/${id}`)})` }}
    />
  ) : (
    <span className="ingredient-icon placeholder" style={{ width: size, height: size }} title={name}>
      {name.charAt(0)}
    </span>
  );
}

// A recipe's ingredients laid out like its pattern: "+" for groups, a strip for lines, 2x2 for squares.
export function RecipeIngredients({ recipe, size = 32 }) {
  if (recipe.pattern === 'square') {
    return (
      <span className="pattern-square">
        {recipe.ingredients.map((id, k) => (
          <IngredientIcon key={k} id={id} size={size * 0.75} />
        ))}
      </span>
    );
  }
  return (
    <span className={`pattern-${recipe.pattern}`}>
      {recipe.ingredients.map((id, k) => (
        <span key={k} className="pattern-item">
          {k > 0 && recipe.pattern === 'group' && <span className="plus">+</span>}
          <IngredientIcon id={id} size={size} />
        </span>
      ))}
    </span>
  );
}
