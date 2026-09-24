import { es } from '../data/i18n/es.js';

const strings = es;

// t('key', { nombre: 'Ana' }) → text with {vars} replaced. Missing keys show the key itself.
export function t(key, vars) {
  const text = strings[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function hasKey(key) {
  return key in strings;
}

// Spanish number formatting: 1.500 and 1,5 ('always' so 4-digit numbers are grouped too).
const integerFormat = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatNumber = (value) => integerFormat.format(value);
export const formatDecimal = (value) => decimalFormat.format(value);
