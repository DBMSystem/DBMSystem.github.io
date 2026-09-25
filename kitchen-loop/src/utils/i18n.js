import { es } from '../data/i18n/es.js';
import { en } from '../data/i18n/en.js';

// Languages (spec 10.4, D-6): Spanish is the source; English is a draft translation. A key missing in a language
// falls back to Spanish. `locale` formats numbers the way each language writes them.
export const LANGUAGES = {
  es: { strings: es, locale: 'es-ES' },
  en: { strings: en, locale: 'en-GB' },
};
export const DEFAULT_LANGUAGE = 'es';

let current = DEFAULT_LANGUAGE;
let integerFormat;
let decimalFormat;

export function setLanguage(code) {
  current = LANGUAGES[code] ? code : DEFAULT_LANGUAGE;
  const { locale } = LANGUAGES[current];
  // 'always' so 4-digit numbers are grouped too (1.500 / 1,500).
  integerFormat = new Intl.NumberFormat(locale, { useGrouping: 'always', maximumFractionDigits: 0 });
  decimalFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}
setLanguage(DEFAULT_LANGUAGE);

export const getLanguage = () => current;

// The device's language when the game has one for it (Spanish for any Spanish variant), English otherwise.
export function detectLanguage(preferred = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []) {
  for (const tag of preferred) {
    const code = String(tag ?? '')
      .toLowerCase()
      .split('-')[0];
    if (LANGUAGES[code]) return code;
  }
  return preferred.length > 0 ? 'en' : DEFAULT_LANGUAGE;
}

// t('key', { nombre: 'Ana' }) → text with {vars} replaced. Missing keys show the key itself.
export function t(key, vars) {
  const text = LANGUAGES[current].strings[key] ?? es[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function hasKey(key) {
  return key in es;
}

export const formatNumber = (value) => integerFormat.format(value);
export const formatDecimal = (value) => decimalFormat.format(value);
