package com.mehmetcebe.wattpayi;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String AD_VIEW_CLASS = "com.google.android.gms.ads.AdView";

    private ViewGroup webViewHost;
    private View bannerContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15+ forces edge-to-edge, so the WebView's container reaches
        // under the system navigation bar. The AdMob plugin pins its banner to
        // the container's bottom and only adds the bar's inset from a
        // decor-view insets listener it installs *after* insets were already
        // dispatched — so the banner sits over the system nav bar until
        // something (keyboard, rotation) re-dispatches insets. It also adds
        // that inset on top of the padding Capacitor already applies on older
        // WebViews, and skips the decor view's own insets handling. Take the
        // banner's bottom margin over whenever the plugin attaches it.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return;

        webViewHost = (ViewGroup) getBridge().getWebView().getParent();
        webViewHost.setOnHierarchyChangeListener(
            new ViewGroup.OnHierarchyChangeListener() {
                @Override
                public void onChildViewAdded(View parent, View child) {
                    if (!containsAdView(child)) return;
                    bannerContainer = child;
                    // Replaces the plugin's listener (installed just before it
                    // attached the banner) with one that keeps the default
                    // decor handling and positions the banner correctly.
                    getWindow()
                        .getDecorView()
                        .setOnApplyWindowInsetsListener((v, insets) -> {
                            WindowInsets result = v.onApplyWindowInsets(insets);
                            // Capacitor updates the host's padding while these
                            // insets reach the children, i.e. after this runs.
                            webViewHost.post(MainActivity.this::positionBanner);
                            return result;
                        });
                    positionBanner();
                }

                @Override
                public void onChildViewRemoved(View parent, View child) {
                    if (child == bannerContainer) bannerContainer = null;
                }
            }
        );
    }

    private static boolean containsAdView(View view) {
        if (!(view instanceof ViewGroup)) return false;
        ViewGroup group = (ViewGroup) view;
        for (int i = 0; i < group.getChildCount(); i++) {
            if (AD_VIEW_CLASS.equals(group.getChildAt(i).getClass().getName())) return true;
        }
        return false;
    }

    /**
     * Bottom edge of the banner = top of the system navigation bar. Whatever
     * part of the bar the host's padding already clears (Capacitor pads it on
     * WebViews without the safe-area fix, or for the keyboard) is subtracted,
     * so the banner is never lifted twice. This matches the
     * --safe-area-inset-bottom Capacitor injects into the page, which the
     * bottom nav adds on top of the banner height.
     */
    private void positionBanner() {
        if (bannerContainer == null) return;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(webViewHost);
        if (insets == null) return;
        int barBottom = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()).bottom;
        int margin = Math.max(0, barBottom - webViewHost.getPaddingBottom());

        ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) bannerContainer.getLayoutParams();
        if (lp.bottomMargin != margin) {
            lp.bottomMargin = margin;
            bannerContainer.setLayoutParams(lp);
        }
    }
}
