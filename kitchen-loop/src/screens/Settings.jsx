import { useReducer, useState } from 'react';
import { Button } from '../components/Button.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { t } from '../utils/i18n.js';

const VERSION = '0.3.0';

function Slider({ label, value, onChange, disabled, note }) {
  return (
    <label className="toggle slider">
      <span>{label}</span>
      {note ? <span className="hint small">{note}</span> : <input type="range" min="0" max="1" step="0.1" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />}
    </label>
  );
}

// Settings (spec 8.8). Store purchases, privacy and ad consent arrive with monetisation (phases 5–7).
export function Settings({ services, onClose, onRename, onTutorial, onStory, onDeleted }) {
  const { saveManager, audio } = services;
  const [, refresh] = useReducer((n) => n + 1, 0);
  const [deleteStep, setDeleteStep] = useState(0);
  const { settings } = saveManager.get();

  const set = async (key, value) => {
    await saveManager.update((s) => {
      s.settings[key] = value;
    });
    if (key === 'reducedMotion') document.body.classList.toggle('reduced-motion', value);
    if (key === 'sfx') audio.play('tap');
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
      <Slider label={t('settings.music')} note={t('settings.musicSoon')} />
      <Slider label={t('settings.sfx')} value={settings.sfx} onChange={(v) => set('sfx', v)} />
      <Toggle label={t('settings.vibration')} value={settings.vibration} onChange={(v) => set('vibration', v)} />
      <Toggle label={t('settings.reducedMotion')} value={settings.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
      <Toggle label={t('settings.tapToPlace')} value={settings.tapToPlace} onChange={(v) => set('tapToPlace', v)} />
      <Button variant="secondary" onClick={onRename}>
        {t('settings.name')}
      </Button>
      <Button variant="secondary" onClick={onTutorial}>
        {t('settings.tutorial')}
      </Button>
      <Button variant="secondary" onClick={onStory}>
        {t('settings.story')}
      </Button>
      <Button variant="secondary" className="btn danger" onClick={remove}>
        {deleteStep === 0 ? t('settings.delete') : deleteStep === 1 ? t('settings.deleteConfirm1') : t('settings.deleteConfirm2')}
      </Button>
      <p className="hint small">{t('settings.creditsText')}</p>
      <p className="hint small">{t('settings.version', { v: VERSION })}</p>
      <Button onClick={onClose}>{t('settings.close')}</Button>
    </div>
  );
}
