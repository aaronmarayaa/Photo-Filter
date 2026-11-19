package com.aaronmarayaa.photofilter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotoSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
