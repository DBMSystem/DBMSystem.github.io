import { useMemo } from 'react';
import { rollSpecialties } from '../systems/specialty.js';
import { createRng } from '../utils/rng.js';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

// Before a loop, from level 4: choose 1 of 3 specialties (spec 2.12, 8.4).
export function SpecialtyPicker({ save, onPick }) {
  const choices = useMemo(() => rollSpecialties(createRng(), save), [save]);
  return (
    <div className="overlay">
      <div className="panel specialty-panel">
        <h2>{t('specialty.title')}</h2>
        <p className="hint small">{t('specialty.hint')}</p>
        {choices.map((s) => (
          <button key={s.id} type="button" className="specialty" onClick={() => onPick(s.id)}>
            <img src={spriteUrl(s.icon)} alt="" />
            <span>
              <strong>{t(`specialty.${s.id}.name`)}</strong>
              <span className="hint small">{t(`specialty.${s.id}.desc`)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
