// Bridge to the Android app (Capacitor). In a normal browser every function here is a no-op or returns false,
// so the web version keeps working on its own.
import { hashId, reminderSchedule, todayKey } from './logic.js';

const Cap = window.Capacitor;
export const isNative = !!Cap?.isNativePlatform?.();
const P = isNative ? Cap.Plugins : {};

const MAX_SCHEDULED = 60; // Android limits pending alarms per app; 60 days ahead is plenty.

/** Shares a text file through the Android share sheet (WhatsApp, Drive, Calendar…). */
export async function shareFile(name, content, title) {
  if (!isNative) return false;
  const { uri } = await P.Filesystem.writeFile({ path: name, data: content, directory: 'CACHE', encoding: 'utf8' });
  try {
    await P.Share.share({ title, files: [uri] });
  } catch (e) {
    if (!/cancel/i.test(e?.message || '')) throw e;
  }
  return true;
}

export async function notificationPermission() {
  if (!isNative) return null;
  const { display } = await P.LocalNotifications.checkPermissions();
  return display; // 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
}

export async function requestNotificationPermission() {
  const { display } = await P.LocalNotifications.requestPermissions();
  return display;
}

let timer;
/** Replaces every pending phone notification with the current reminders (debounced). */
export function rescheduleNotifications(data) {
  if (!isNative) return;
  clearTimeout(timer);
  timer = setTimeout(() => schedule(data).catch((e) => console.error('reminders', e)), 800);
}

async function schedule(data) {
  if ((await notificationPermission()) !== 'granted') return;
  const LN = P.LocalNotifications;
  const { notifications: pending } = await LN.getPending();
  if (pending.length) await LN.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  const now = new Date();
  const list = reminderSchedule(data, todayKey(now), 60)
    .map((r) => ({ ...r, date: new Date(r.at) })) // "YYYY-MM-DDTHH:MM" is parsed as local time
    .filter((r) => r.date > now)
    .slice(0, MAX_SCHEDULED);
  if (!list.length) return;
  await LN.schedule({
    notifications: list.map((r) => ({
      id: hashId(r.key),
      title: r.title,
      body: r.body || 'Calendario familiar',
      schedule: { at: r.date, allowWhileIdle: true },
    })),
  });
}

/** Android back button: close the open sheet first, then leave the app. */
export function onBackButton(handler) {
  if (isNative) P.App.addListener('backButton', handler);
}

export function exitApp() {
  if (isNative) P.App.exitApp();
}

/** "1.0.0 (3)" in the Android app, null on the web. */
export async function appVersion() {
  if (!isNative) return null;
  const { version, build } = await P.App.getInfo();
  return `${version} (${build})`;
}
