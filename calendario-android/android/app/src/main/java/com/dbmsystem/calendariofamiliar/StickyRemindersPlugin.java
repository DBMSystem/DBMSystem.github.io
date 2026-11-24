package com.dbmsystem.calendariofamiliar;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JS entry point: StickyReminders.sync({ items: [{ id, at, until, title, body }] }), times in epoch ms. */
@CapacitorPlugin(name = "StickyReminders")
public class StickyRemindersPlugin extends Plugin {
    @PluginMethod
    public void sync(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        try {
            StickyScheduler.sync(getContext(), items);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se han podido programar los avisos fijos", e);
        }
    }
}
