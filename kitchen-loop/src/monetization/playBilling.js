import { registerPlugin } from '@capacitor/core';
import { products, starterPack } from '../data/products.js';

const PRODUCT_IDS = [...products.map((p) => p.id), starterPack.id];

// Google Play Billing on Android (spec 7.6, D-7): the app's own plugin, android/app/src/main/java/com/dbmsystem/
// kitchenloop/PlayBillingPlugin.java. Implements the shop's billing contract. Prices come from the store, already in
// the player's currency. Until Play answers (offline, no Play Store, products not yet in Play Console) it is not
// available, and it tries again whenever purchases are refreshed (start, resume, "Restaurar compras").
// onUpdate: the store answered for the first time, or a purchase changed (a pending payment completed).
export function createPlayBilling({ onUpdate = () => {}, plugin = registerPlugin('PlayBilling') } = {}) {
  let prices = {};
  let loading = null;
  const ready = () => Object.keys(prices).length > 0;

  function load() {
    loading ??= plugin
      .getProducts({ ids: PRODUCT_IDS })
      .then(({ products: found }) => {
        prices = Object.fromEntries(found.map((p) => [p.id, p.price]));
        if (ready()) onUpdate();
      })
      .catch(() => {})
      .finally(() => {
        loading = null;
      });
    return loading;
  }
  plugin.addListener('purchasesUpdated', () => onUpdate());
  load();

  return {
    isAvailable: ready,
    priceOf: (productId) => prices[productId],
    async purchase(productId) {
      if (!prices[productId]) return 'unavailable';
      const { status } = await plugin.purchase({ productId });
      return status;
    },
    async getOwned() {
      if (!ready()) await load();
      const { owned } = await plugin.getOwned();
      return owned;
    },
  };
}
