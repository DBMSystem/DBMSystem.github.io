package com.dbmsystem.kitchenloop;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClient.BillingResponseCode;
import com.android.billingclient.api.BillingClient.ProductType;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.Purchase.PurchaseState;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONException;

/**
 * Google Play Billing for the shop (spec 7.4–7.6; D-7: our own plugin on the Play Billing Library, no third-party
 * service). Only one-time products, never consumed: the Maestro Pass, the pans and the Pack de Inicio are kept forever.
 * Play is the source of truth: getOwned lists what the account owns now (a refund drops out of it), a pending payment
 * counts only once it completes, and every purchase is acknowledged (Play refunds unacknowledged ones after 3 days).
 * JS side: src/monetization/playBilling.js.
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {

    private BillingClient client;
    private final Map<String, ProductDetails> details = new ConcurrentHashMap<>();
    private final List<Runnable[]> waiting = new ArrayList<>(); // { on connected, on failure }
    private boolean connecting;
    private PluginCall purchaseCall; // the purchase whose Play sheet is open
    private String purchaseProduct;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this::onPurchasesUpdated)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    @Override
    protected void handleOnDestroy() {
        client.endConnection();
    }

    /** Store prices in the player's currency: { products: [{ id, price }] }. Unknown ids are left out. */
    @PluginMethod
    public void getProducts(PluginCall call) {
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        try {
            for (String id : call.getArray("ids", new JSArray()).<String>toList()) {
                list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(ProductType.INAPP).build());
            }
        } catch (JSONException e) {
            call.reject("bad ids");
            return;
        }
        if (list.isEmpty()) {
            call.resolve(new JSObject().put("products", new JSArray()));
            return;
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(list).build();
        connected(
            () ->
                client.queryProductDetailsAsync(params, (result, found) -> {
                    if (result.getResponseCode() != BillingResponseCode.OK) {
                        call.reject("unavailable");
                        return;
                    }
                    JSArray products = new JSArray();
                    for (ProductDetails product : found.getProductDetailsList()) {
                        ProductDetails.OneTimePurchaseOfferDetails offer = product.getOneTimePurchaseOfferDetails();
                        if (offer == null) continue;
                        details.put(product.getProductId(), product);
                        products.put(new JSObject().put("id", product.getProductId()).put("price", offer.getFormattedPrice()));
                    }
                    call.resolve(new JSObject().put("products", products));
                }),
            () -> call.reject("unavailable")
        );
    }

    /** Opens Play's purchase sheet: { status: 'purchased' | 'pending' | 'cancelled' | 'error' | 'unavailable' }. */
    @PluginMethod
    public void purchase(PluginCall call) {
        String id = call.getString("productId");
        ProductDetails product = id == null ? null : details.get(id);
        if (product == null) {
            answer(call, "unavailable");
            return;
        }
        synchronized (this) {
            if (purchaseCall != null) {
                answer(call, "error");
                return;
            }
            purchaseCall = call;
            purchaseProduct = id;
        }
        connected(
            () ->
                getActivity().runOnUiThread(() -> {
                    BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product);
                    ProductDetails.OneTimePurchaseOfferDetails offer = product.getOneTimePurchaseOfferDetails();
                    if (offer != null && offer.getOfferToken() != null) item.setOfferToken(offer.getOfferToken()); // the offer whose price is shown
                    BillingFlowParams flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).build();
                    BillingResult result = client.launchBillingFlow(getActivity(), flow);
                    if (result.getResponseCode() != BillingResponseCode.OK) finishPurchase(statusOf(result.getResponseCode()));
                }),
            () -> finishPurchase("unavailable")
        );
    }

    /** What the account owns now, already paid: { owned: [productId] }. Acknowledges what is still unacknowledged. */
    @PluginMethod
    public void getOwned(PluginCall call) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(ProductType.INAPP).build();
        connected(
            () ->
                client.queryPurchasesAsync(params, (result, purchases) -> {
                    if (result.getResponseCode() != BillingResponseCode.OK) {
                        call.reject("unavailable");
                        return;
                    }
                    JSArray owned = new JSArray();
                    for (Purchase purchase : purchases) {
                        if (purchase.getPurchaseState() != PurchaseState.PURCHASED) continue;
                        acknowledge(purchase);
                        for (String id : purchase.getProducts()) owned.put(id);
                    }
                    call.resolve(new JSObject().put("owned", owned));
                }),
            () -> call.reject("unavailable")
        );
    }

    // Answers the open purchase and also tells JS to refresh: a pending payment that completes while the game is open
    // arrives here too, with no purchase sheet open.
    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        String status = code == BillingResponseCode.OK ? null : statusOf(code);
        if (code == BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                int state = purchase.getPurchaseState();
                if (state == PurchaseState.PURCHASED) acknowledge(purchase);
                if (purchaseProduct != null && purchase.getProducts().contains(purchaseProduct)) {
                    status = state == PurchaseState.PURCHASED ? "purchased" : state == PurchaseState.PENDING ? "pending" : "error";
                }
            }
        }
        if (status != null) finishPurchase(status);
        if (code == BillingResponseCode.OK) notifyListeners("purchasesUpdated", new JSObject());
    }

    private void finishPurchase(String status) {
        PluginCall call;
        synchronized (this) {
            call = purchaseCall;
            purchaseCall = null;
            purchaseProduct = null;
        }
        if (call != null) answer(call, status);
    }

    private void acknowledge(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build();
        client.acknowledgePurchase(params, result -> {}); // a failure is retried by the next getOwned
    }

    private static String statusOf(int code) {
        switch (code) {
            case BillingResponseCode.USER_CANCELED:
                return "cancelled";
            case BillingResponseCode.ITEM_ALREADY_OWNED:
                return "purchased"; // Play says it is already theirs: the shop grants it
            case BillingResponseCode.BILLING_UNAVAILABLE:
            case BillingResponseCode.SERVICE_UNAVAILABLE:
            case BillingResponseCode.SERVICE_DISCONNECTED:
            case BillingResponseCode.ITEM_UNAVAILABLE:
            case BillingResponseCode.FEATURE_NOT_SUPPORTED:
                return "unavailable";
            default:
                return "error";
        }
    }

    private static void answer(PluginCall call, String status) {
        call.resolve(new JSObject().put("status", status));
    }

    // Runs `then` with the client connected, or `failed` when Play cannot be reached (no Play Store, offline...).
    // Calls made while connecting wait for the same connection.
    private void connected(Runnable then, Runnable failed) {
        if (client.isReady()) {
            then.run();
            return;
        }
        synchronized (this) {
            waiting.add(new Runnable[] { then, failed });
            if (connecting) return;
            connecting = true;
        }
        client.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult result) {
                    release(result.getResponseCode() == BillingResponseCode.OK);
                }

                @Override
                public void onBillingServiceDisconnected() {
                    release(false);
                }
            }
        );
    }

    private void release(boolean ok) {
        List<Runnable[]> ready;
        synchronized (this) {
            if (!connecting) return;
            connecting = false;
            ready = new ArrayList<>(waiting);
            waiting.clear();
        }
        for (Runnable[] next : ready) next[ok ? 0 : 1].run();
    }
}
