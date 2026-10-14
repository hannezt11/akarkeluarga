package com.hanz.akarkeluarga;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);
        WebSettings s = getBridge().getWebView().getSettings();
        s.setTextZoom(100);          // teks tidak ikut "Ukuran font" sistem
        s.setUseWideViewPort(true);  // supaya meta viewport (lebar acuan) dipakai
    }
}
