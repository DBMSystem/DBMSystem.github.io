import { PipSprite } from '../components/PipSprite.jsx';
import { Button } from '../components/Button.jsx';
import { LANGUAGES, detectLanguage, t } from '../utils/i18n.js';

// First screen of a new game: the language, before Pip says a word (spec 10.4). The device's language comes first
// and highlighted; the title is written in every language, since none is chosen yet.
export function LanguagePicker({ onPick }) {
  const detected = detectLanguage();
  const codes = [detected, ...Object.keys(LANGUAGES).filter((code) => code !== detected)];
  return (
    <div className="screen language-picker">
      <PipSprite expression="happy" size={150} />
      <h2>{t('language.title')}</h2>
      {codes.map((code) => (
        <Button key={code} variant={code === detected ? undefined : 'secondary'} onClick={() => onPick(code)}>
          {t(`language.${code}`)}
        </Button>
      ))}
    </div>
  );
}
