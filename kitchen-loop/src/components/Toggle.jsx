import { t } from '../utils/i18n.js';

export function Toggle({ label, value, onChange }) {
  return (
    <button type="button" className="toggle" aria-pressed={value} onClick={() => onChange(!value)}>
      <span>{label}</span>
      <span className={`toggle-state ${value ? 'on' : ''}`}>{t(value ? 'settings.on' : 'settings.off')}</span>
    </button>
  );
}
