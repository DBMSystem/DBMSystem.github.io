import { useMemo, useReducer, useState } from 'react';
import { cards, cardById, RARITIES } from '../data/cards.js';
import { balance } from '../data/balance.js';
import { albumProgress } from '../cards/album.js';
import { openPack } from '../cards/packs.js';
import { craftCard, makeShiny, takePack, claimPassPack, hasMaestroPass } from '../inventory/inventory.js';
import { calendarToday } from '../components/Calendar.jsx';
import { discoveredSecrets } from '../economy/rewards.js';
import { CardView } from '../components/CardView.jsx';
import { PackOpening } from '../components/PackOpening.jsx';
import { CardReveal } from '../components/CardReveal.jsx';
import { Button } from '../components/Button.jsx';
import { RecipeBook } from './RecipeBook.jsx';
import { createRng } from '../utils/rng.js';
import { unlockContext } from '../systems/unlocks.js';
import { useAds } from '../monetization/useAds.js';
import { t, formatNumber } from '../utils/i18n.js';
import { useBackButton } from '../utils/backButton.js';

const TABS = ['cards', 'recipes', 'diary'];

function cardState(save, card) {
  if (save.cards[card.id]) return 'owned';
  return card.source === 'discovery' ? 'hidden' : 'silhouette';
}

function formatWait(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function CardDetail({ cardId, save, onCraft, onShiny, onClose }) {
  useBackButton(onClose);
  const card = cardById[cardId];
  const state = cardState(save, card);
  const owned = save.cards[cardId];
  const craftCost = balance.craftCost[card.rarity];
  const shinyCost = balance.shinyCost[card.rarity];
  return (
    <div className="overlay scroll" onClick={onClose}>
      <div className="panel card-detail" onClick={(e) => e.stopPropagation()}>
        <CardView cardId={cardId} state={state} shiny={owned?.shiny} size="large" />
        {state === 'owned' && <p className="lore">{t(`card.${cardId}.lore`)}</p>}
        {state === 'hidden' && <p className="lore">{t(`card.${cardId}.hint`)}</p>}
        {owned && <p className="hint small">{t('card.owned', { n: owned.count })}</p>}
        {owned?.shiny && <p className="hint small">{t('card.isShiny')}</p>}
        {state === 'silhouette' && (
          <Button icon="icon_rare" disabled={save.fragments < craftCost} onClick={onCraft}>
            {t('card.craft', { n: formatNumber(craftCost) })}
          </Button>
        )}
        {state === 'hidden' && <p className="hint small">{t('card.discoveryOnly')}</p>}
        {owned && !owned.shiny && (
          <Button variant="secondary" disabled={save.fragments < shinyCost} onClick={onShiny}>
            {t('card.shiny', { n: formatNumber(shinyCost) })}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          {t('album.close')}
        </Button>
      </div>
    </div>
  );
}

// Album (spec 4.9, 8.6): cards, recipes and the kitchen diary; packs, crafting and shiny variants.
export function Album({ services, onClose }) {
  const { saveManager, adManager, audio, haptics } = services;
  useAds(adManager, ['CARD_PACK']);
  const [tab, setTab] = useState('cards');
  const [rarity, setRarity] = useState('all');
  const [detail, setDetail] = useState(null);
  const [opening, setOpening] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [, refresh] = useReducer((n) => n + 1, 0);
  const rng = useMemo(() => createRng(), []);
  const save = saveManager.get();
  const progress = albumProgress(save);

  const startPack = (special, fromPending) =>
    setOpening({
      special,
      open: async () => {
        let results = [];
        await saveManager.update((s) => {
          if (!fromPending || takePack(s, special ? 'special' : 'standard')) results = openPack(s, rng, Date.now(), { special });
        });
        return results;
      },
    });

  // The Maestro Pass's daily pack (spec 7.4, D-5): claimed once a day, then opened like any pack.
  const passPackReady = hasMaestroPass(save) && save.cooldowns.lastPassPackDate !== calendarToday(save);
  const claimPass = async () => {
    let ok = false;
    await saveManager.update((s) => {
      ok = claimPassPack(s, calendarToday(s));
    });
    if (ok) startPack(false, true);
  };

  const watchAdPack = async () => {
    await adManager.showRewarded('CARD_PACK', () => startPack(false, false));
    refresh();
  };

  const craft = async () => {
    let result = null;
    await saveManager.update((s) => {
      result = craftCard(s, detail, Date.now());
    });
    if (result) {
      setDetail(null);
      setReveal([result]);
    }
  };

  const shiny = async () => {
    await saveManager.update((s) => makeShiny(s, detail));
    audio.play('cardRare');
    refresh();
  };

  const showFreePack = save.stats.loopsPlayed >= balance.adsMinLoops;
  const wait = adManager.freePackWait();
  const adReady = adManager.isRewardedAvailable('CARD_PACK');

  return (
    <div className={`screen scroll album ${hasMaestroPass(save) ? 'golden' : ''}`}>
      <div className="album-head">
        <h2>{t('album.title')}</h2>
        <p className="album-progress">{t('album.progress', progress)}</p>
        <div className="progress-bar">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="hint small">{t('album.fragments', { n: formatNumber(save.fragments) })}</p>
      </div>

      <div className="pack-actions">
        {passPackReady && <Button onClick={claimPass}>{t('album.passPack')}</Button>}
        {save.packs.standard > 0 && (
          <Button onClick={() => startPack(false, true)}>
            {t('album.openPack')} ({save.packs.standard})
          </Button>
        )}
        {save.packs.special > 0 && (
          <Button variant="ad" onClick={() => startPack(true, true)}>
            {t('album.openSpecialPack')} ({save.packs.special})
          </Button>
        )}
        {showFreePack &&
          (wait > 0 ? (
            <p className="hint small">{t('album.freePackIn', { time: formatWait(wait) })}</p>
          ) : (
            <Button variant="ad" icon="icon_ad" disabled={!adReady} onClick={watchAdPack}>
              {adReady ? t('album.freePack') : t('ad.unavailable')}
            </Button>
          ))}
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {t(`album.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'cards' && (
        <div className="rarity-filter">
          {['all', ...RARITIES].map((id) => {
            const group = id === 'all' ? cards : cards.filter((c) => c.rarity === id);
            const owned = group.filter((c) => save.cards[c.id]).length;
            return (
              <button key={id} type="button" className={rarity === id ? 'on' : ''} aria-pressed={rarity === id} onClick={() => setRarity(id)}>
                {t(id === 'all' ? 'album.filter.all' : `rarity.many.${id}`)} {owned}/{group.length}
              </button>
            );
          })}
        </div>
      )}
      {tab === 'cards' && (
        <div className="card-grid">
          {cards
            .filter((c) => rarity === 'all' || c.rarity === rarity)
            .map((card) => (
              <CardView key={card.id} cardId={card.id} state={cardState(save, card)} shiny={save.cards[card.id]?.shiny} onClick={() => setDetail(card.id)} />
            ))}
        </div>
      )}
      {tab === 'recipes' && (
        <RecipeBook level={save.player.level} unlocks={unlockContext(save)} discovered={discoveredSecrets(save)} saved={save.recipes} embedded />
      )}
      {tab === 'diary' && (
        <div className="diary">
          <p className="hint">{t('album.diaryIntro')}</p>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const card = cards.find((c) => c.storyFragment === n);
            const found = Boolean(save.cards[card.id]);
            return (
              <div key={n} className={`diary-entry ${found ? '' : 'missing'}`}>
                <span className="diary-n">{n}</span>
                <p>{found ? t(`fragment.${n}`) : t('album.diaryMissing', { n })}</p>
              </div>
            );
          })}
        </div>
      )}

      <Button variant="secondary" onClick={onClose}>
        {t('album.close')}
      </Button>

      {detail && <CardDetail cardId={detail} save={save} onCraft={craft} onShiny={shiny} onClose={() => setDetail(null)} />}
      {opening && (
        <PackOpening
          special={opening.special}
          open={opening.open}
          audio={audio}
          haptics={haptics}
          onDone={() => {
            setOpening(null);
            refresh();
          }}
        />
      )}
      {reveal && (
        <CardReveal
          items={reveal}
          audio={audio}
          haptics={haptics}
          onDone={() => {
            setReveal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
