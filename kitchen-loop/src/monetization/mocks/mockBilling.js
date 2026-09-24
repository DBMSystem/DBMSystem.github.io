import { t } from '../../utils/i18n.js';
import { productById, starterPack } from '../../data/products.js';

const STORE_KEY = 'kitchenloop.mockBilling'; // development only: what the fake store says you own

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? { owned: [], pending: [] };
  } catch {
    return { owned: [], pending: [] };
  }
}
const store = (data) => localStorage.setItem(STORE_KEY, JSON.stringify(data));

// Development-only store: an overlay lets the tester pick the outcome of each purchase (spec 12.2).
// A pending payment completes the next time purchases are refreshed or restored.
export function createMockBilling() {
  return {
    isAvailable: () => true,
    purchase: (productId) =>
      new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'mock-ad';
        const panel = document.createElement('div');
        panel.className = 'panel';
        const title = document.createElement('h2');
        title.textContent = t('mockBilling.title');
        const body = document.createElement('p');
        body.textContent = t('mockBilling.body', { name: t(`product.${productId}.name`), price: (productById[productId] ?? starterPack).price });
        panel.append(title, body);
        for (const status of ['purchased', 'pending', 'cancelled', 'error']) {
          const button = document.createElement('button');
          button.className = 'btn secondary';
          button.textContent = t(`mockBilling.${status}`);
          button.onclick = () => {
            overlay.remove();
            const data = load();
            if (status === 'purchased' && !data.owned.includes(productId)) data.owned.push(productId);
            if (status === 'pending' && !data.pending.includes(productId)) data.pending.push(productId);
            store(data);
            resolve(status);
          };
          panel.append(button);
        }
        overlay.append(panel);
        document.body.append(overlay);
      }),
    getOwned: async () => {
      const data = load();
      data.owned = [...new Set([...data.owned, ...data.pending])];
      data.pending = [];
      store(data);
      return data.owned;
    },
    // Development tools: simulate a refund.
    refundAll: () => store({ owned: [], pending: [] }),
  };
}
