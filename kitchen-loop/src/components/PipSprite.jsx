import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

// Pip outside the canvas (story, results), with a CSS idle animation.
export function PipSprite({ expression = 'neutral', size = 120, talking = false }) {
  const src = spriteUrl(`pip/${expression}`) ?? spriteUrl('pip/neutral');
  return (
    <img
      className={`pip-sprite ${talking ? 'talking' : ''}`}
      src={src}
      alt="Pip"
      title={t('story.pip')}
      width={size}
      height={size}
      key={expression}
    />
  );
}
