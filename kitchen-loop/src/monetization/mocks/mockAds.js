import { t } from '../../utils/i18n.js';

// Development-only ad mock: an overlay that lets the tester pick the outcome.
export function createMockProvider() {
  return {
    isAvailable: () => true,
    show: () =>
      new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'mock-ad';
        const panel = document.createElement('div');
        panel.className = 'panel';
        const title = document.createElement('h2');
        title.textContent = t('mock.title');
        const body = document.createElement('p');
        body.textContent = t('mock.body');
        panel.append(title, body);
        for (const [key, status] of [['mock.complete', 'rewarded'], ['mock.dismiss', 'dismissed'], ['mock.error', 'error']]) {
          const button = document.createElement('button');
          button.className = 'btn secondary';
          button.textContent = t(key);
          button.onclick = () => {
            overlay.remove();
            resolve(status);
          };
          panel.append(button);
        }
        overlay.append(panel);
        document.body.append(overlay);
      }),
  };
}
