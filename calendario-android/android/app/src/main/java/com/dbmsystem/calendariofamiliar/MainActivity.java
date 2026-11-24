package com.dbmsystem.calendariofamiliar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StickyRemindersPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
