package com.hanz.akarkeluarga;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AkarPrint")
public class PrintPlugin extends Plugin {

    private PrintAttributes.MediaSize ukuran(String nama) {
        if ("A0".equals(nama)) return PrintAttributes.MediaSize.ISO_A0;
        if ("A1".equals(nama)) return PrintAttributes.MediaSize.ISO_A1;
        if ("A2".equals(nama)) return PrintAttributes.MediaSize.ISO_A2;
        if ("A3".equals(nama)) return PrintAttributes.MediaSize.ISO_A3;
        return PrintAttributes.MediaSize.ISO_A4;
    }

    @PluginMethod
    public void print(final PluginCall call) {
        final String nama = call.getString("name", "Akar Keluarga");
        final String paper = call.getString("paper", "A4");
        final Boolean land = call.getBoolean("landscape", false);
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    PrintAttributes.MediaSize ms = ukuran(paper);
                    if (land != null && land.booleanValue()) {
                        ms = ms.asLandscape();
                    } else {
                        ms = ms.asPortrait();
                    }
                    PrintAttributes attrs = new PrintAttributes.Builder()
                            .setMediaSize(ms)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build();
                    WebView webView = getBridge().getWebView();
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(nama);
                    pm.print(nama, adapter, attrs);
                    call.resolve();
                } catch (Exception e) {
                    call.reject(String.valueOf(e.getMessage()));
                }
            }
        });
    }
}
