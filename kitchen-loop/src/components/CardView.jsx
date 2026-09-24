import { cardById, STARS } from '../data/cards.js';
import { spriteUrl, spriteScale } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

// A card (spec 4.1, 4.9): frame shape per rarity (never colour alone), stars, number and name.
// state: 'owned' | 'silhouette' (pack card not owned) | 'hidden' (discovery card not earned).
export function CardArt({ card, silhouette = false }) {
  return (
    <div className="card-art">
      {card.art.map(([sprite, o = {}], i) =>
        silhouette && o.backdrop ? null : (
        <img
          key={i}
          src={spriteUrl(sprite)}
          alt=""
          draggable={false}
          style={{
            width: `${(o.scale ?? 0.9) * spriteScale(sprite) * 100}%`,
            left: `${50 + (o.x ?? 0)}%`,
            top: `${50 + (o.y ?? 0)}%`,
            transform: `translate(-50%, -50%) rotate(${o.rotate ?? 0}deg)`,
            filter: silhouette ? 'brightness(0)' : o.filter,
            opacity: silhouette ? 0.35 : o.opacity,
          }}
        />
        ),
      )}
    </div>
  );
}

export function CardView({ cardId, state = 'owned', shiny = false, size = 'small', onClick }) {
  const card = cardById[cardId];
  const hidden = state === 'hidden';
  const stars = '★'.repeat(STARS[card.rarity]);
  // Only interactive cards are buttons: a disabled button would swallow taps meant for the screen behind.
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`card card-${card.rarity} card-${size} ${state} ${shiny ? 'shiny' : ''}`} onClick={onClick}>
      <span className="card-number">{t(size === 'large' ? 'card.number' : 'card.numberShort', { n: card.number })}</span>
      <span className="card-stars" aria-label={t(`rarity.${card.rarity}`)}>
        {stars}
      </span>
      {hidden ? <div className="card-art card-question">{t('album.discoveryHidden')}</div> : <CardArt card={card} silhouette={state === 'silhouette'} />}
      <span className="card-name">{state === 'owned' ? t(`card.${cardId}.name`) : '???'}</span>
    </Tag>
  );
}
