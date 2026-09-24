import { PASS, STARTER_PACK, productById } from '../data/products.js';
import { grantProduct, revokeProduct, hasMaestroPass } from '../inventory/inventory.js';
import { DEV_TOOLS } from '../utils/platform.js';
import { track } from '../analytics/analytics.js';
import { createMockBilling } from './mocks/mockBilling.js';

// Store purchases (spec 7.4–7.6, 12.2). The store is the source of truth: nothing is granted until it confirms,
// a pending payment grants nothing until it completes, and a refund takes the right away. Google Play Billing
// arrives in phase 7 (D-7); until then: the mock in development/playtest builds, otherwise "unavailable".
export const unavailableBilling = { isAvailable: () => false, purchase: async () => 'unavailable', getOwned: async () => null };

export function createShop({ saveManager, billing = DEV_TOOLS ? createMockBilling() : unavailableBilling, clock = Date.now }) {
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());

  // Mirrors the store's list of owned products in the save: grants what is missing, revokes what is gone.
  async function sync(owned) {
    await saveManager.update((save) => {
      const has = { [PASS]: save.entitlements.maestroPass, [STARTER_PACK]: save.entitlements.starterPack };
      for (const id of Object.keys(productById).filter((id) => id !== PASS)) has[id] = save.entitlements.skins.includes(productById[id].pan);
      for (const [id, owns] of Object.entries(has)) {
        if (owned.includes(id) && !owns) grantProduct(save, id, clock());
        if (!owned.includes(id) && owns) revokeProduct(save, id);
      }
      save.entitlements.verifiedAt = clock();
    });
    notify();
  }

  // Never throws. Returns { status, delivered } (delivered: the Pack de Inicio's cards).
  async function buy(productId) {
    if (!billing.isAvailable()) return { status: 'unavailable' };
    let status;
    try {
      status = await billing.purchase(productId);
    } catch {
      status = 'error';
    }
    track('purchase_result', { productId, status });
    if (status !== 'purchased') return { status };
    let delivered = [];
    await saveManager.update((save) => {
      delivered = grantProduct(save, productId, clock()) ?? [];
      save.entitlements.verifiedAt = clock();
    });
    notify();
    return { status, delivered };
  }

  // On start, on returning from the background and from Settings (spec 7.6). Offline: the cache stays.
  async function refreshEntitlements() {
    let owned = null;
    try {
      owned = await billing.getOwned();
    } catch {
      owned = null;
    }
    if (!owned) return { status: 'unavailable' };
    await sync(owned);
    return { status: 'ok' };
  }

  const getOwnedProducts = () => {
    const { entitlements } = saveManager.get();
    return [
      ...(entitlements.maestroPass ? [PASS] : []),
      ...(entitlements.starterPack ? [STARTER_PACK] : []),
      ...entitlements.skins.map((pan) => `kl_skin_${pan}`),
    ];
  };

  return {
    isAvailable: () => billing.isAvailable(),
    buy,
    buyMaestroPass: () => buy(PASS),
    buySkin: (pan) => buy(`kl_skin_${pan}`),
    buyStarterPack: () => buy(STARTER_PACK),
    restorePurchases: refreshEntitlements,
    refreshEntitlements,
    getOwnedProducts,
    hasMaestroPass: () => hasMaestroPass(saveManager.get()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    billing,
  };
}
