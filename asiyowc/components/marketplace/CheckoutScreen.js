import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { WebView } from "react-native-webview";

import { clearCart } from "../../store/slices/cartSlice";
import { createCartCheckout } from "../../store/slices/marketplaceSlice";
import tw from "../../utils/tw";

const PRIMARY = "#6A1B9A";
const TEXT = "#111827";
const MUTED = "#6B7280";

/* =====================================================
   CHECKOUT SCREEN (WEB + MOBILE SAFE)
===================================================== */
export default function CheckoutScreen({ onClose }) {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.cart.items);

  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);

  /* =====================================================
     TOTAL
  ===================================================== */
  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [items]);

  /* =====================================================
     START CHECKOUT
  ===================================================== */
  const handleCheckout = useCallback(async () => {
    try {
      setLoading(true);

      const payload = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));

      const res = await dispatch(
        createCartCheckout({ items: payload })
      ).unwrap();

      if (!res?.redirectUrl) throw new Error("Missing payment URL");

      /* =====================================================
         🔥 PLATFORM FIX
      ===================================================== */

      // ✅ WEB → redirect browser
      if (Platform.OS === "web") {
        window.location.href = res.redirectUrl;
        return;
      }

      // ✅ MOBILE → show WebView
      setPaymentUrl(res.redirectUrl);

    } catch (err) {
      Alert.alert("Checkout failed", err.message);
    } finally {
      setLoading(false);
    }
  }, [items, dispatch]);

  /* =====================================================
     HANDLE PAYMENT REDIRECTS (mobile only)
  ===================================================== */
  const handleNavChange = (nav) => {
    const url = nav.url;

    if (url.includes("payment-success")) {
      dispatch(clearCart());
      Alert.alert("Payment Successful 🎉");
      onClose?.();
    }

    if (url.includes("payment-cancel")) {
      Alert.alert("Payment Cancelled");
      onClose?.();
    }
  };

  /* =====================================================
     MOBILE WEBVIEW MODE
  ===================================================== */
  if (paymentUrl && Platform.OS !== "web") {
    return (
      <View style={tw`flex-1`}>
        <WebView
          source={{ uri: paymentUrl }}
          startInLoadingState
          onNavigationStateChange={handleNavChange}
          renderLoading={() => (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          )}
        />
      </View>
    );
  }

  /* =====================================================
     EMPTY STATE
  ===================================================== */
  if (!items.length) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text style={{ fontFamily: "Poppins-SemiBold", color: MUTED }}>
          Nothing to checkout
        </Text>
      </View>
    );
  }

  /* =====================================================
     NORMAL UI
  ===================================================== */
  return (
    <View style={tw`flex-1 px-6 pt-20`}>

      <Text
        style={[
          tw`text-2xl mb-6`,
          { fontFamily: "Poppins-Bold", color: TEXT },
        ]}
      >
        Checkout
      </Text>

      {/* Summary */}
      <View
        style={[
          tw`p-5 rounded-2xl mb-6`,
          { backgroundColor: "#F3EFFA" },
        ]}
      >
        <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
          Items: {items.length}
        </Text>

        <Text
          style={[
            tw`text-2xl mt-2`,
            { fontFamily: "Poppins-Bold", color: PRIMARY },
          ]}
        >
          Ksh {total.toLocaleString()}
        </Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        disabled={loading}
        onPress={handleCheckout}
        style={[
          tw`py-4 rounded-2xl items-center`,
          { backgroundColor: PRIMARY, opacity: loading ? 0.6 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[tw`text-white`, { fontFamily: "Poppins-SemiBold" }]}>
            Pay Now
          </Text>
        )}
      </TouchableOpacity>

      {/* Cancel */}
      <TouchableOpacity onPress={onClose} style={tw`mt-4 items-center`}>
        <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}
