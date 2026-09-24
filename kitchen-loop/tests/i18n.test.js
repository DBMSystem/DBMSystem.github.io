import { describe, it, expect, afterEach } from 'vitest';
import { es } from '../src/data/i18n/es.js';
import { en } from '../src/data/i18n/en.js';
import { t, setLanguage, detectLanguage, formatNumber, getLanguage } from '../src/utils/i18n.js';
import { createDefaultSave, validateSave } from '../src/save/schema.js';

const vars = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('languages (spec 10.4)', () => {
  afterEach(() => setLanguage('es'));

  it('English has every Spanish text, with the same {vars}', () => {
    const missing = Object.keys(es).filter((key) => !(key in en));
    expect(missing).toEqual([]);
    expect(Object.keys(en).filter((key) => !(key in es))).toEqual([]);
    for (const key of Object.keys(es)) expect(vars(en[key]), key).toEqual(vars(es[key]));
  });

  it('switches texts and number formats; a missing key falls back to Spanish', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('menu.play')).toBe('PLAY');
    expect(formatNumber(1500)).toBe('1,500');
    setLanguage('es');
    expect(t('menu.play')).toBe('JUGAR');
    expect(formatNumber(1500)).toBe('1.500');
    setLanguage('xx');
    expect(getLanguage()).toBe('es');
  });

  it('detects the device language: any Spanish variant is Spanish, anything else English', () => {
    expect(detectLanguage(['es-MX', 'en-US'])).toBe('es');
    expect(detectLanguage(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectLanguage(['de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('es');
  });

  it('a new game has no language yet; old saves were Spanish', () => {
    expect(validateSave(createDefaultSave(0)).settings.language).toBeNull();
    const old = createDefaultSave(0);
    old.tutorialDone = true;
    delete old.settings.language;
    expect(validateSave(old).settings.language).toBe('es');
    const chosen = createDefaultSave(0);
    chosen.settings.language = 'en';
    expect(validateSave(chosen).settings.language).toBe('en');
  });
});
