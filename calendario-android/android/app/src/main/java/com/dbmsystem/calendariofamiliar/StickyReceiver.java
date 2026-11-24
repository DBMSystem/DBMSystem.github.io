package com.dbmsystem.calendariofamiliar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarm fired (show), notification swiped away (re-post silently), or phone restarted / app updated (restore). */
public class StickyReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        int id = intent.getIntExtra(StickyScheduler.EXTRA_ID, 0);
        switch (action) {
            case StickyScheduler.ACTION_SHOW:
                StickyScheduler.show(ctx, id, false);
                break;
            case StickyScheduler.ACTION_REPOST:
                StickyScheduler.show(ctx, id, true);
                break;
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
                StickyScheduler.restore(ctx);
                break;
            default:
                break;
        }
    }
}
