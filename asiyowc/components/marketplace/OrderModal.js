import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { X, Package } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fetchMyOrders } from "../../store/slices/marketplaceSlice";
import tw from "../../utils/tw";

/* =====================================================
   COLORS (Asiyo brand system)
===================================================== */
const PRIMARY = "#6A1B9A";
const PRIMARY_DARK = "#4A148C";
const SURFACE = "#FFFFFF";
const MUTED = "#6B7280";

/* =====================================================
   STATUS COLOR HELPER
===================================================== */
const statusColor = (s) => {
  if (s === "PAID" || s === "COMPLETED") return "#16A34A";
  if (s === "PENDING") return "#F59E0B";
  if (s === "FAILED" || s === "CANCELLED") return "#EF4444";
  return PRIMARY;
};

export default function OrdersModal({ visible, onClose }) {
  const dispatch = useDispatch();

  const { myOrders, loading } = useSelector((s) => s.marketplace);
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    if (visible) dispatch(fetchMyOrders({ token }));
  }, [visible]);

  /* =====================================================
     ORDER CARD
  ===================================================== */
  const renderItem = ({ item }) => {
    const total = item.totalAmount || 0;
    const color = statusColor(item.status);

    return (
      <View
        style={[
          tw`p-5 mb-4 rounded-2xl bg-white`,
          {
            shadowColor: PRIMARY,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 5,
          },
        ]}
      >
        {/* Top Row */}
        <View style={tw`flex-row justify-between items-center`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 15,
              color: "#111",
            }}
          >
            Order #{item._id?.slice(-6)}
          </Text>

          {/* Status pill */}
          <View
            style={[
              tw`px-3 py-1 rounded-full`,
              { backgroundColor: color + "20" },
            ]}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                color: color,
                fontSize: 12,
              }}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* Items */}
        <Text
          style={[
            tw`mt-2 text-sm`,
            { fontFamily: "Poppins-Regular", color: MUTED },
          ]}
        >
          {item.items?.length || 0} items purchased
        </Text>

        {/* Price */}
        <Text
          style={{
            marginTop: 10,
            fontFamily: "Poppins-Bold",
            fontSize: 18,
            color: PRIMARY,
          }}
        >
          Ksh {total.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <StatusBar barStyle="light-content" />

      <View style={[tw`flex-1`, { backgroundColor: "#F6F3FB" }]}>
        {/* =====================================================
           HEADER
        ===================================================== */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY_DARK]}
          style={tw`pt-16 pb-8 px-5 rounded-b-3xl`}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 22,
                color: "#FFFFFF",
              }}
            >
              My Orders
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`w-9 h-9 rounded-full items-center justify-center`,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <X size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              marginTop: 4,
              fontFamily: "Poppins-Regular",
              fontSize: 13,
              color: "#E9D5FF",
            }}
          >
            Track your purchases and payments
          </Text>
        </LinearGradient>

        {/* =====================================================
           LIST
        ===================================================== */}
        {loading.orders ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <FlatList
            data={myOrders}
            keyExtractor={(i) => i._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`px-5 pt-5 pb-12`}
            ListEmptyComponent={
              <View style={tw`items-center mt-24`}>
                <Package size={48} color={PRIMARY} />

                <Text
                  style={{
                    marginTop: 14,
                    fontFamily: "Poppins-Medium",
                    color: MUTED,
                  }}
                >
                  No orders yet
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
