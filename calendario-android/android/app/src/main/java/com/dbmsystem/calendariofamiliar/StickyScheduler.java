package com.dbmsystem.calendariofamiliar;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Sticky reminders: shown from `at` until `until`, cannot be swiped away (ongoing, and re-posted if the
 * system lets the user dismiss it, as Android 14+ does) and disappear on their own when `until` passes.
 * The list is kept in SharedPreferences so alarms can be restored after a reboot or an app update.
 */
final class StickyScheduler {
    static final String ACTION_SHOW = "com.dbmsystem.calendariofamiliar.STICKY_SHOW";
    static final String ACTION_REPOST = "com.dbmsystem.calendariofamiliar.STICKY_REPOST";
    static final String EXTRA_ID = "id";
    private static final String PREFS = "sticky_reminders";
    private static final String KEY_ITEMS = "items";
    private static final String CHANNEL = "sticky_reminders";

    private StickyScheduler() {}

    /** Replaces the stored list: cancels what is gone, updates what changed, schedules what is new. */
    static synchronized void sync(Context ctx, JSONArray items) throws Exception {
        Map<Integer, String> old = byId(load(ctx));
        Map<Integer, String> fresh = byId(items);
        Set<Integer> showing = activeIds(ctx);
        prefs(ctx).edit().putString(KEY_ITEMS, items.toString()).apply();

        for (Integer id : old.keySet()) {
            if (!fresh.containsKey(id)) {
                alarms(ctx).cancel(pending(ctx, ACTION_SHOW, id));
                NotificationManagerCompat.from(ctx).cancel(id);
            }
        }
        long now = System.currentTimeMillis();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            int id = item.getInt("id");
            long at = item.getLong("at");
            long until = item.getLong("until");
            if (until <= now) {
                NotificationManagerCompat.from(ctx).cancel(id);
                continue;
            }
            if (at > now) {
                NotificationManagerCompat.from(ctx).cancel(id);
                setAlarm(ctx, id, at);
            } else {
                boolean unchanged = item.toString().equals(old.get(id));
                if (!(unchanged && showing.contains(id))) post(ctx, item, showing.contains(id));
            }
        }
    }

    /** After a reboot or update: alarms are gone, so schedule them again and show the current ones. */
    static synchronized void restore(Context ctx) {
        try {
            JSONArray items = load(ctx);
            long now = System.currentTimeMillis();
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item.getLong("until") <= now) continue;
                if (item.getLong("at") > now) setAlarm(ctx, item.getInt("id"), item.getLong("at"));
                else post(ctx, item, false);
            }
        } catch (Exception ignored) {
            // Nothing stored or malformed: nothing to restore.
        }
    }

    /** Shows the reminder with this id if it is still current. Silent when it is a re-post after a swipe. */
    static synchronized void show(Context ctx, int id, boolean silent) {
        try {
            JSONArray items = load(ctx);
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item.getInt("id") != id) continue;
                long now = System.currentTimeMillis();
                if (item.getLong("at") <= now && item.getLong("until") > now) post(ctx, item, silent);
                return;
            }
        } catch (Exception ignored) {
            // Malformed storage: nothing to show.
        }
    }

    private static void post(Context ctx, JSONObject item, boolean silent) throws Exception {
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return;
        ensureChannel(ctx);
        int id = item.getInt("id");
        long remaining = item.getLong("until") - System.currentTimeMillis();
        if (remaining <= 0) return;

        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_calendar)
            .setColor(0xFF2F6F68)
            .setContentTitle(item.optString("title"))
            .setContentText(item.optString("body"))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(item.optString("body")))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSilent(silent)
            .setTimeoutAfter(remaining)
            .setContentIntent(content)
            .setDeleteIntent(pending(ctx, ACTION_REPOST, id));
        try {
            NotificationManagerCompat.from(ctx).notify(id, b.build());
        } catch (SecurityException ignored) {
            // Permission revoked meanwhile.
        }
    }

    private static void setAlarm(Context ctx, int id, long at) {
        AlarmManager am = alarms(ctx);
        PendingIntent pi = pending(ctx, ACTION_SHOW, id);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    private static PendingIntent pending(Context ctx, String action, int id) {
        Intent i = new Intent(ctx, StickyReceiver.class).setAction(action).putExtra(EXTRA_ID, id);
        return PendingIntent.getBroadcast(ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Avisos fijos", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Avisos que se quedan hasta que pasa el evento");
        nm.createNotificationChannel(ch);
    }

    private static Set<Integer> activeIds(Context ctx) {
        Set<Integer> ids = new HashSet<>();
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        for (StatusBarNotification n : nm.getActiveNotifications()) ids.add(n.getId());
        return ids;
    }

    private static Map<Integer, String> byId(JSONArray items) throws Exception {
        Map<Integer, String> map = new HashMap<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject o = items.getJSONObject(i);
            map.put(o.getInt("id"), o.toString());
        }
        return map;
    }

    private static JSONArray load(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(KEY_ITEMS, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static AlarmManager alarms(Context ctx) {
        return (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    }
}
