import { describe, it, expect } from 'vitest';
import { createDefaultSave, validateSave } from '../src/save/schema.js';
import { grantProduct, revokeProduct, equipPan, ownsPan, claimPassPack, addCard } from '../src/inventory/inventory.js';
import { createShop } from '../src/monetization/shop.js';
import { createAdManager } from '../src/monetization/adManager.js';
import { PASS, STARTER_PACK, starterPack, products, pans } from '../src/data/products.js';
import { cardById } from '../src/data/cards.js';
import { balance } from '../src/data/balance.js';
import { hasKey } from '../src/utils/i18n.js';

const memorySaveManager = (save = createDefaultSave(0)) => ({
  get: () => save,
  update: async (fn) => fn(save),
});
// A fake store: `next` decides the result of the next purchase; `owned` is what it reports.
const fakeBilling = () => {
  const billing = { next: 'purchased', owned: [], pending: [], available: true };
  billing.isAvailable = () => billing.available;
  billing.purchase = async (id) => {
    if (billing.next === 'purchased') billing.owned.push(id);
    if (billing.next === 'pending') billing.pending.push(id);
    return billing.next;
  };
  billing.getOwned = async () => (billing.available ? [...billing.owned] : null);
  return billing;
};

describe('entitlements (spec 7.4–7.6)', () => {
  it('pans are cosmetic and the golden one needs the Pass', () => {
    const save = createDefaultSave(0);
    expect(ownsPan(save, 'default')).toBe(true);
    expect(equipPan(save, 'golden')).toBe(false);
    expect(equipPan(save, 'rusty')).toBe(false);
    grantProduct(save, 'kl_skin_rusty', 0);
    expect(equipPan(save, 'rusty')).toBe(true);
    grantProduct(save, PASS, 0);
    expect(equipPan(save, 'golden')).toBe(true);
    save.settings.nightTheme = true;
    revokeProduct(save, PASS); // refund
    expect(save.equippedPan).toBe('default');
    expect(save.settings.nightTheme).toBe(false);
  });

  it('a refunded skin is unequipped', () => {
    const save = createDefaultSave(0);
    grantProduct(save, 'kl_skin_pink', 0);
    equipPan(save, 'pink');
    revokeProduct(save, 'kl_skin_pink');
    expect(save.equippedPan).toBe('default');
    expect(save.entitlements.skins).toEqual([]);
  });

  it('the Pack de Inicio has fixed content, is delivered once, repeats become fragments', () => {
    expect(starterPack.cards.map((id) => cardById[id].rarity).sort()).toEqual(['common', 'common', 'common', 'common', 'rare']);
    const save = createDefaultSave(0);
    addCard(save, starterPack.cards[0], 0, 'test');
    const delivered = grantProduct(save, STARTER_PACK, 0);
    expect(delivered.map((d) => d.cardId)).toEqual(starterPack.cards);
    expect(delivered[0].isNew).toBe(false);
    expect(save.fragments).toBe(balance.duplicateFragments.common);
    expect(grantProduct(save, STARTER_PACK, 0)).toEqual([]); // never twice
  });

  it('the Pass gives one daily pack per day', () => {
    const save = createDefaultSave(0);
    expect(claimPassPack(save, '2026-09-24')).toBe(false);
    grantProduct(save, PASS, 0);
    expect(claimPassPack(save, '2026-09-24')).toBe(true);
    expect(claimPassPack(save, '2026-09-24')).toBe(false);
    expect(claimPassPack(save, '2026-09-25')).toBe(true);
    expect(save.packs.standard).toBe(2);
  });

  it('loading a save fixes impossible purchases', () => {
    const save = createDefaultSave(0);
    Object.assign(save, { equippedPan: 'golden', entitlements: { maestroPass: false, skins: ['rusty', 'hacked'], starterPack: 1 } });
    save.settings.nightTheme = true;
    const clean = validateSave(save);
    expect(clean.equippedPan).toBe('default');
    expect(clean.entitlements.skins).toEqual(['rusty']);
    expect(clean.settings.nightTheme).toBe(false);
  });

  it('every product and pan has its texts', () => {
    for (const p of products) expect(hasKey(`product.${p.id}.name`), p.id).toBe(true);
    for (const p of pans) expect(hasKey(`pan.${p.id}`), p.id).toBe(true);
  });
});

describe('shop (spec 12.2)', () => {
  it('grants only confirmed purchases; pending grants nothing until it completes', async () => {
    const saveManager = memorySaveManager();
    const billing = fakeBilling();
    const shop = createShop({ saveManager, billing });
    billing.next = 'cancelled';
    expect((await shop.buyMaestroPass()).status).toBe('cancelled');
    billing.next = 'error';
    expect((await shop.buyMaestroPass()).status).toBe('error');
    billing.next = 'pending';
    expect((await shop.buyMaestroPass()).status).toBe('pending');
    expect(shop.hasMaestroPass()).toBe(false);
    billing.owned.push(...billing.pending); // the store completes the payment
    await shop.refreshEntitlements();
    expect(shop.hasMaestroPass()).toBe(true);
  });

  it('restoring purchases mirrors the store, including refunds', async () => {
    const saveManager = memorySaveManager();
    const billing = fakeBilling();
    const shop = createShop({ saveManager, billing });
    await shop.buySkin('black');
    await saveManager.update((s) => equipPan(s, 'black'));
    billing.owned = [PASS];
    await shop.restorePurchases();
    expect(shop.getOwnedProducts()).toEqual([PASS]);
    expect(saveManager.get().equippedPan).toBe('default');
  });

  it('without the store (offline or production web) nothing changes', async () => {
    const saveManager = memorySaveManager();
    const billing = fakeBilling();
    const shop = createShop({ saveManager, billing });
    await shop.buyMaestroPass();
    billing.available = false;
    expect((await shop.buy('kl_skin_pink')).status).toBe('unavailable');
    expect((await shop.refreshEntitlements()).status).toBe('unavailable');
    expect(shop.hasMaestroPass()).toBe(true); // the cache stays
  });
});

describe('try ads (spec 7.2, 11.4)', () => {
  it('have a daily cap and leave nothing in the save but the count', async () => {
    const save = createDefaultSave(0);
    save.stats.loopsPlayed = 5;
    const saveManager = memorySaveManager(save);
    const ads = createAdManager({ saveManager, provider: { isAvailable: () => true, show: async () => 'rewarded' }, clock: () => 0 });
    const before = JSON.stringify({ ...save, dailyCaps: null });
    for (let i = 0; i < balance.trialDailyCap; i++) expect((await ads.showRewarded('TRIAL', () => {})).status).toBe('rewarded');
    expect(ads.canOffer('TRIAL')).toBe(false);
    expect(JSON.stringify({ ...save, dailyCaps: null })).toBe(before);
  });
});
