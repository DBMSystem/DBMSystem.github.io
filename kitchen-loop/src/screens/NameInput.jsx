import { useState } from 'react';
import { Button } from '../components/Button.jsx';
import { PipSprite } from '../components/PipSprite.jsx';
import { t } from '../utils/i18n.js';

export const NAME_MAX = 12;

// "¿Cómo te llamas?" (spec 6.2). Empty → "Aprendiz". The name never leaves the device.
export function NameInput({ initial = '', onDone }) {
  const [name, setName] = useState(initial);
  const confirm = (e) => {
    e.preventDefault();
    onDone(name.trim() || t('name.placeholder'));
  };
  return (
    <form className="screen name-input" onSubmit={confirm}>
      <PipSprite expression="thinking" size={130} />
      <h2>{t('name.title')}</h2>
      <input
        value={name}
        maxLength={NAME_MAX}
        placeholder={t('name.placeholder')}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        autoComplete="off"
        enterKeyHint="done"
      />
      <p className="hint small">{t('name.hint')}</p>
      <Button type="submit">{t('name.confirm')}</Button>
    </form>
  );
}
