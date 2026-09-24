import { useReducer, useState } from 'react';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t, setLanguage, LANGUAGES } from '../utils/i18n.js';
import { useAds } from '../monetization/useAds.js';
import { hasMaestroPass } from '../inventory/inventory.js';
import { balance } from '../data/balance.js';
import { DEV_TOOLS } from '../utils/platform.js';

const VERSION = '0.6.0';

function Slider({ label, value, onChange, disabled, note }) {
  return (
    <label className="toggle slider">
      <span>{label}</span>
      {note ? (
        <span className="hint small">{note}</span>
      ) : (
        <input type="range" min="0" max="1" step="0.1" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
      )}
    </label>
  );
}

// Settings (spec 8.8). Ad privacy options appear where Google's consent requires them (spec 7.7);
// store purchases and the privacy policy arrive with monetisation (phases 5–7).
export function Settings({ services, onLanguage, onClose, onRename, onTutorial, onStory, onDeleted }) {
  const { saveManager, audio, adManager, shop } = services;
  const [notice, setNotice] = useState(null);
  useAds(adManager);
  const [, refresh] = useReducer((n) => n + 1, 0);
  const [deleteStep, setDeleteStep] = useState(0);
  const { settings, stats } = saveManager.get();
  const showPaid = stats.loopsPlayed >= balance.adsMinLoops; // nothing about payments before 3 loops (spec 7.1)

  const set = async (key, value) => {
    await saveManager.update((s) => {
      s.settings[key] = value;
    });
    if (key === 'reducedMotion') document.body.classList.toggle('reduced-motion', value);
    if (key === 'language') {
      setLanguage(value);
      onLanguage?.();
    }
    if (key === 'sfx') audio.play('tap');
    refresh();
  };

  const restore = async () => {
    const { status } = await shop.restorePurchases();
    setNotice(t(status === 'ok' ? 'shop.restored' : 'shop.unavailable'));
    refresh();
  };

  const devRefund = async () => {
    shop.billing.refundAll();
    await shop.refreshEntitlements();
    refresh();
  };

  const remove = async () => {
    if (deleteStep < 2) {
      setDeleteStep(deleteStep + 1);
      return;
    }
    await onDeleted();
  };

  return (
    <div className="screen scroll settings">
      <h2>{t('settings.title')}</h2>
      <div className="toggle language-row">
        <span>{t('settings.language')}</span>
        <span className="segmented">
          {Object.keys(LANGUAGES).map((code) => (
            <button key={code} type="button" className={settings.language === code ? 'on' : ''} onClick={() => set('language', code)}>
              {t(`language.${code}`)}
            </button>
          ))}
        </span>
      </div>
      <Slider label={t('settings.music')} value={settings.music} onChange={(v) => set('music', v)} />
      <Slider label={t('settings.sfx')} value={settings.sfx} onChange={(v) => set('sfx', v)} />
      <Toggle label={t('settings.vibration')} value={settings.vibration} onChange={(v) => set('vibration', v)} />
      <Toggle label={t('settings.reducedMotion')} value={settings.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
      <Toggle label={t('settings.tapToPlace')} value={settings.tapToPlace} onChange={(v) => set('tapToPlace', v)} />
      {hasMaestroPass(saveManager.get()) ? (
        <Toggle label={t('settings.nightTheme')} value={settings.nightTheme} onChange={(v) => set('nightTheme', v)} />
      ) : (
        showPaid && <Slider label={t('settings.nightTheme')} note={t('settings.nightThemeLocked')} />
      )}
      <Button variant="secondary" onClick={onRename}>
        {t('settings.name')}
      </Button>
      <Button variant="secondary" onClick={onTutorial}>
        {t('settings.tutorial')}
      </Button>
      <Button variant="secondary" onClick={onStory}>
        {t('settings.story')}
      </Button>
      {showPaid && (
        <Button variant="secondary" onClick={restore}>
          {t('settings.restore')}
        </Button>
      )}
      {notice && <p className="hint small">{notice}</p>}
      {DEV_TOOLS && shop.billing.refundAll && (
        <Button variant="secondary" onClick={devRefund}>
          {t('settings.devRefund')}
        </Button>
      )}
      {adManager.privacyOptionsRequired() && (
        <Button variant="secondary" onClick={() => adManager.showPrivacyOptions()}>
          {t('settings.adPrivacy')}
        </Button>
      )}
      <Button variant="secondary" className="btn danger" onClick={remove}>
        {deleteStep === 0 ? t('settings.delete') : deleteStep === 1 ? t('settings.deleteConfirm1') : t('settings.deleteConfirm2')}
      </Button>
      <p className="hint small">{t('settings.creditsText')}</p>
      <p className="hint small">{t('settings.version', { v: VERSION })}</p>
      <Button onClick={onClose}>{t('settings.close')}</Button>
    </div>
  );
}
