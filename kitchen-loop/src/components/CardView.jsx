import { cardById, STARS } from '../data/cards.js';
import { spriteUrl } from '../assets/manifest.js';
import backdrops from '../assets/cardBackdrops.json';
import { t } from '../utils/i18n.js';

// A card's illustration (scripts/card_art.py): its subject over its backdrop. Cards without a backdrop are a full
// scene. The silhouette of a card not owned yet is its subject in shadow, without the backdrop.
export function CardArt({ card, silhouette = false }) {
  const backdrop = backdrops[card.id];
  return (
    <div className="card-art">
      {backdrop && !silhouette && <img className="card-layer" src={spriteUrl(`cards/bg_${backdrop}`)} alt="" draggable={false} />}
      <img
        className="card-layer"
        src={spriteUrl(`cards/${card.id}`)}
        alt=""
        draggable={false}
        style={silhouette ? { filter: 'brightness(0)', opacity: backdrop ? 0.35 : 0.2 } : undefined}
      />
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
