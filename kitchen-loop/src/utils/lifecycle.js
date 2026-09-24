import { App } from '@capacitor/app';
import { isNative } from './platform.js';

// Background and foreground (spec 10.6). Browser: visibilitychange. Android: also Capacitor's pause and resume,
// which arrive even when the WebView does not report a visibility change. Each change is reported once.
export function onAppLifecycle({ hidden, shown }) {
  let isHidden = typeof document !== 'undefined' && document.hidden;
  const toHidden = () => {
    if (isHidden) return;
    isHidden = true;
    hidden?.();
  };
  const toShown = () => {
    if (!isHidden) return;
    isHidden = false;
    shown?.();
  };
  const onVisibility = () => (document.hidden ? toHidden() : toShown());
  document.addEventListener('visibilitychange', onVisibility);
  const handles = isNative() ? [App.addListener('pause', toHidden), App.addListener('resume', toShown)] : [];
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    for (const handle of handles) handle.then((h) => h.remove()).catch(() => {});
  };
}
