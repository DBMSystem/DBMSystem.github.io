import { useMemo, useReducer, useState } from 'react';
import { Button } from '../components/Button.jsx';
import { utensils, utensilById } from '../data/utensils.js';
import { decorItems } from '../data/decor.js';
import { products, starterPack } from '../data/products.js';
import { warehouseLines } from '../data/dialogues.js';
import { utensilCost, utensilState, treeComplete, utensilsOwned } from '../systems/utensils.js';
import { buyUtensil, buyDecor } from '../inventory/inventory.js';
import { advanceStory } from '../systems/story.js';
import { createRng } from '../utils/rng.js';
import { spriteUrl } from '../assets/manifest.js';
import { t, formatNumber } from '../utils/i18n.js';

const TABS = ['utensils', 'decor', 'showcase'];
const TIERS = [1, 2, 3, 4];
const panUrls = import.meta.glob('../../assets/pan_*.png', { eager: true, query: '?url', import: 'default' });
const panUrl = (pan) => panUrls[`../../assets/pan_${pan}.png`];

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
// Utensils and decoration cost coins; the showcase (real money) is shown but sells nothing yet.
export function Warehouse({ services, onClose }) {
  const { saveManager, audio, haptics } = services;
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
    audio.play('levelUp');
    haptics.vibrate('medium');
    setLine(kind === 'utensil' && treeComplete(saveManager.get()) ? 'warehouse.bruleeDone' : rng.pick(warehouseLines).key);
    refresh();
  }

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
          <div className="shelf-row wrap">
            {products.map((p) => (
              <div key={p.id} className="item showcase">
                <img className="decor-img" src={panUrl(p.pan)} alt="" />
                <strong>{t(`product.${p.id}.name`)}</strong>
                <span className="hint small">{t(`product.${p.id}.desc`)}</span>
                <span className="price euro">{p.price}</span>
                <Button variant="ad" disabled>
                  {t('warehouse.soon')}
                </Button>
              </div>
            ))}
            <div className="item showcase">
              <strong>{t('warehouse.chest')}</strong>
              <span className="hint small">{t(`product.${starterPack.id}.desc`)}</span>
              <span className="price euro">{starterPack.price}</span>
              <Button variant="ad" disabled>
                {t('warehouse.soon')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={onClose}>
        {t('warehouse.close')}
      </Button>
    </div>
  );
}
