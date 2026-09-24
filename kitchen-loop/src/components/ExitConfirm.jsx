import { App as NativeApp } from '@capacitor/app';
import { Button } from './Button.jsx';
import { PipSprite } from './PipSprite.jsx';
import { useBackButton } from '../utils/backButton.js';
import { t } from '../utils/i18n.js';

// Back on the main menu asks before closing the app (spec 8.9). Back again keeps playing.
export function ExitConfirm({ onCancel }) {
  useBackButton(onCancel);
  return (
    <div className="overlay">
      <div className="panel">
        <PipSprite expression="worried" size={72} />
        <h2>{t('exit.title')}</h2>
        <Button onClick={onCancel}>{t('exit.stay')}</Button>
        <Button variant="secondary" onClick={() => NativeApp.exitApp()}>
          {t('exit.leave')}
        </Button>
      </div>
    </div>
  );
}
