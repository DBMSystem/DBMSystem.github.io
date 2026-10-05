import { useMemo, useState } from 'react';
import { Button } from './Button.jsx';
import { nextSpecialties } from '../systems/specialty.js';
import { spriteUrl } from '../assets/manifest.js';
import { t } from '../utils/i18n.js';

const PICK_DELAY = 450; // ms the chosen card glows before the service starts

// '#ffd54f' → 'rgba(255, 213, 79, a)'
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Before a loop, from level 4: choose 1 of 3 specialties (spec 2.12, 8.4). Presented like epic boons (Daniel: "más
// contraste con el juego, como si de ventajas épicas se tratase"): a dark, glowing stage and three cards dealt in,
// each with its own colour, a medallion, a tag that says what it is about, and a shine.
export function SpecialtyPicker({ save, onPick, onCancel }) {
  const choices = useMemo(() => nextSpecialties(save), [save]);
  const [picked, setPicked] = useState(null);
  const reduced = save.settings.reducedMotion;

  const choose = (id) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => onPick(id), reduced ? 0 : PICK_DELAY);
  };

  return (
    <div className="overlay specialty-overlay">
      <div className="specialty-stage">
        <div className="specialty-rays" aria-hidden="true" />
        <p className="specialty-kicker">{t('specialty.kicker')}</p>
        <h2 className="specialty-title">{t('specialty.title')}</h2>
        <p className="specialty-hint">{t('specialty.hint')}</p>
        <div className="specialty-cards">
          {choices.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`perk ${picked === s.id ? 'picked' : picked ? 'faded' : ''}`}
              style={{ '--accent': s.accent, '--glow': rgba(s.accent, 0.5), '--tint': rgba(s.accent, 0.22), '--delay': `${i * 120}ms` }}
              onClick={() => choose(s.id)}
            >
              <span className="perk-medallion">
                <img src={spriteUrl(s.icon)} alt="" />
              </span>
              <span className="perk-body">
                <span className="perk-tag">{t(`specialty.tag.${s.tag}`)}</span>
                <strong>{t(`specialty.${s.id}.name`)}</strong>
                <span className="perk-desc">{t(`specialty.${s.id}.desc`)}</span>
              </span>
              <span className="perk-shine" aria-hidden="true" />
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={onCancel}>
          {t('specialty.back')}
        </Button>
      </div>
    </div>
  );
}
