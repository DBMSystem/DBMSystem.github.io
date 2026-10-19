package com.dbmsystem.kitchenloop;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class); // the app's own plugin (Google Play Billing), before the bridge starts
        super.onCreate(savedInstanceState);
    }
}
