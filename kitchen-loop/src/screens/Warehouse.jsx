import { useMemo, useReducer, useState } from 'react';
import { Button } from '../components/Button.jsx';
import { utensils, utensilById } from '../data/utensils.js';
import { decorItems } from '../data/decor.js';
import { products, starterPack, pans, panById, PASS } from '../data/products.js';
import { CardView } from '../components/CardView.jsx';
import { warehouseLines } from '../data/dialogues.js';
import { utensilCost, utensilState, treeComplete, utensilsOwned } from '../systems/utensils.js';
import { buyUtensil, buyDecor, equipPan, ownsPan, ownsCard } from '../inventory/inventory.js';
import { useAds } from '../monetization/useAds.js';
import { advanceStory } from '../systems/story.js';
import { createRng } from '../utils/rng.js';
import { spriteUrl } from '../assets/manifest.js';
import { t, formatNumber } from '../utils/i18n.js';

const TABS = ['utensils', 'decor', 'showcase'];
const TIERS = [1, 2, 3, 4];

function requirementText({ requires }) {
  if (requires.chapter) return t('warehouse.requires.chapter', { n: requires.chapter });
  if (requires.utensil) return t('warehouse.requires.utensil', { name: t(`utensil.${requires.utensil}.name`) });
  return t('warehouse.requires.tier', requires);
}

const Price = ({ coins }) => (
  <span className="price coins">
    <img src={spriteUrl('ui/icon_coin')} alt="" />
    {formatNumber(coins)}
  </span>
);

// Brûlée's warehouse (spec 8.7): a room full of objects with Brûlée commenting, not a web shop.
// Utensils and decoration cost coins; the showcase sells pans and the Pass (real money, fixed content, never an
// advantage) and the small chest holds the Pack de Inicio. Coin prices and euro prices look different at a glance.
// "Try" (rewarded ad, spec 7.2) lends a utensil or a pan you do not own for one service: onTrial starts it.
export function Warehouse({ services, onClose, onTrial }) {
  const { saveManager, audio, haptics, shop, adManager } = services;
  useAds(adManager, ['TRIAL']);
  const [notice, setNotice] = useState(null);
  const save = saveManager.get();
  const [tab, setTab] = useState('utensils');
  const [, refresh] = useReducer((n) => n + 1, 0);
  const rng = useMemo(() => createRng(), []);
  const [line, setLine] = useState(() => rng.pick(warehouseLines).key);
  const done = treeComplete(save);

  async function buy(kind, id) {
    let ok = false;
    await saveManager.update((s) => {
      ok = kind === 'utensil' ? buyUtensil(s, id) : buyDecor(s, id);
      if (ok) advanceStory(s); // the Runic Counter opens chapter 4, and so on (scenes play when leaving)
    });
    if (!ok) return;
    audio.play('purchase');
    haptics.vibrate('medium');
    setLine(kind === 'utensil' && treeComplete(saveManager.get()) ? 'warehouse.bruleeDone' : rng.pick(warehouseLines).key);
    refresh();
  }

  async function purchase(productId) {
    const { status } = await shop.buy(productId);
    setNotice(t(`shop.${status}`));
    if (status === 'purchased') {
      audio.play('purchase');
      haptics.vibrate('medium');
    }
    refresh();
  }

  async function equip(panId) {
    await saveManager.update((s) => equipPan(s, panId));
    audio.play('equip');
    refresh();
  }

  async function tryIt(kind, id) {
    const { status } = await adManager.showRewarded('TRIAL', () => onTrial({ kind, id }));
    if (status !== 'rewarded') setNotice(t(`ad.${status}`));
  }

  const trialOffer = adManager.canOffer('TRIAL');
  const trialReady = adManager.isRewardedAvailable('TRIAL');
  const TryButton = ({ kind, id }) =>
    trialOffer ? (
      <Button variant="ad" icon="icon_ad" disabled={!trialReady} onClick={() => tryIt(kind, id)}>
        {trialReady ? t('warehouse.try') : t('ad.unavailable')}
      </Button>
    ) : null;
  const starterRepeats = starterPack.cards.filter((id) => ownsCard(save, id));

  return (
    <div className="screen warehouse scroll">
      <div className="warehouse-head">
        <h2>{t('warehouse.title')}</h2>
        <span className="coins">
          <img src={spriteUrl('ui/icon_coin')} alt="" />
          {formatNumber(save.coins)}
        </span>
      </div>
      <button type="button" className="brulee-says" onClick={() => setLine(rng.pick(warehouseLines).key)}>
        <img src={spriteUrl(done ? 'brulee/happy' : 'brulee/explaining')} alt={t('story.brulee')} />
        <span className="speech small">{t(done ? 'warehouse.bruleeDone' : line)}</span>
      </button>

      <div className="tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {t(`warehouse.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'utensils' && (
        <div className="shelves">
          <p className="hint small">{t('warehouse.progress', { owned: utensilsOwned(save), total: utensils.length })}</p>
          {TIERS.map((tier) => (
            <section key={tier} className="shelf">
              <h3>{t('warehouse.tier', { n: tier })}</h3>
              <div className="shelf-row">
                {utensils
                  .filter((u) => u.tier === tier)
                  .map((u) => {
                    const state = utensilState(save, u.id);
                    const cost = utensilCost(u.id);
                    return (
                      <div key={u.id} className={`item ${state}`}>
                        <img className="medallion" src={spriteUrl(`utensils/${u.id}`)} alt="" />
                        <strong>{t(`utensil.${u.id}.name`)}</strong>
                        <span className="hint small">{t(`utensil.${u.id}.desc`)}</span>
                        {state === 'owned' && <span className="badge ok">{t('warehouse.owned')}</span>}
                        {state === 'locked' && <span className="hint small locked">{requirementText(utensilById[u.id])}</span>}
                        {state === 'available' && (
                          <Button disabled={save.coins < cost} onClick={() => buy('utensil', u.id)}>
                            <Price coins={cost} />
                          </Button>
                        )}
                        {state === 'available' && save.coins < cost && <span className="hint small">{t('warehouse.noCoins')}</span>}
                        {state !== 'owned' && <TryButton kind="utensil" id={u.id} />}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'decor' && (
        <div className="shelves">
          <p className="hint small">{t('decor.hint')}</p>
          <div className="shelf-row wrap">
            {decorItems.map((d) => {
              const owned = save.unlockedItems.includes(d.id);
              return (
                <div key={d.id} className={`item ${owned ? 'owned' : 'available'}`}>
                  <img className="decor-img" src={spriteUrl(`decor/${d.id}`)} alt="" />
                  <strong>{t(`decor.${d.id}.name`)}</strong>
                  {owned ? (
                    <span className="badge ok">{t('warehouse.placed')}</span>
                  ) : (
                    <Button disabled={save.coins < d.cost} onClick={() => buy('decor', d.id)}>
                      <Price coins={d.cost} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'showcase' && (
        <div className="shelves">
          <p className="hint small">{t('warehouse.showcaseHint')}</p>
          <section className="shelf">
            <h3>{t('warehouse.pans')}</h3>
            <div className="shelf-row wrap">
              {pans.map((pan) => {
                const owned = ownsPan(save, pan.id);
                const product = pan.product && products.find((p) => p.id === pan.product);
                return (
                  <div key={pan.id} className={`item ${owned ? 'owned' : 'available'}`}>
                    <img className="decor-img" src={spriteUrl(pan.sprite)} alt="" />
                    <strong>{t(`pan.${pan.id}`)}</strong>
                    {owned ? (
                      save.equippedPan === pan.id ? (
                        <span className="badge ok">{t('warehouse.equipped')}</span>
                      ) : (
                        <Button variant="secondary" onClick={() => equip(pan.id)}>
                          {t('warehouse.equip')}
                        </Button>
                      )
                    ) : pan.product === PASS ? (
                      <span className="hint small">{t('warehouse.goldenPan')}</span>
                    ) : (
                      <Button variant="euro" onClick={() => purchase(product.id)}>
                        <span className="price euro">{product.price}</span>
                      </Button>
                    )}
                    {!owned && <TryButton kind="pan" id={pan.id} />}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="shelf pass">
            <h3>{t(`product.${PASS}.name`)}</h3>
            <ul className="pass-list">
              {['album', 'pack', 'night', 'pan', 'pip'].map((k) => (
                <li key={k}>{t(`pass.${k}`)}</li>
              ))}
            </ul>
            {save.entitlements.maestroPass ? (
              <span className="badge ok">{t('warehouse.passActive')}</span>
            ) : (
              <Button variant="euro" onClick={() => purchase(PASS)}>
                <span className="price euro">{products.find((p) => p.id === PASS).price}</span>
              </Button>
            )}
          </section>
          {!save.entitlements.starterPack && (
            <section className="shelf chest">
              <h3>{t('warehouse.chest')}</h3>
              <p className="hint small">{t(`product.${starterPack.id}.desc`)}</p>
              <div className="card-grid">
                {starterPack.cards.map((id) => (
                  <CardView key={id} cardId={id} />
                ))}
              </div>
              {starterRepeats.length > 0 && <p className="hint small">{t('warehouse.chestRepeats', { n: starterRepeats.length })}</p>}
              <Button variant="euro" onClick={() => purchase(starterPack.id)}>
                <span className="price euro">{starterPack.price}</span>
              </Button>
            </section>
          )}
          {!shop.isAvailable() && <p className="hint small">{t('shop.unavailable')}</p>}
        </div>
      )}
      {notice && (
        <p className="notice pop-in" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}

      <Button variant="secondary" onClick={onClose}>
        {t('warehouse.close')}
      </Button>
    </div>
  );
}
