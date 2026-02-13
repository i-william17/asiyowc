import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Pressable,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  removeFromCart,
  increaseQty,
  decreaseQty,
} from "../../store/slices/cartSlice";
import { X, Plus, Minus, ShoppingCart } from "lucide-react-native";
import tw from "../../utils/tw";

const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#6B7280";
const BORDER = "#EEEAF6";

/* =====================================================
   ITEM ROW
===================================================== */
const CartItem = React.memo(({ item, dispatch }) => {
  return (
    <View
      style={[
        tw`flex-row items-center px-4 py-3`,
        { borderBottomWidth: 1, borderColor: BORDER },
      ]}
    >
      {/* Image */}
      <Image
        source={{
          uri:
            item.image ||
            "https://via.placeholder.com/100x100.png?text=Item",
        }}
        style={{ width: 60, height: 60, borderRadius: 14 }}
      />

      {/* Info */}
      <View style={tw`flex-1 ml-3`}>
        <Text
          numberOfLines={1}
          style={[
            tw`text-base`,
            { fontFamily: "Poppins-SemiBold", color: TEXT },
          ]}
        >
          {item.title}
        </Text>

        <Text
          style={[
            tw`text-sm mt-1`,
            { fontFamily: "Poppins-Regular", color: MUTED },
          ]}
        >
          Ksh {item.price.toLocaleString()}
        </Text>
      </View>

      {/* Quantity Controls */}
      <View
        style={[
          tw`flex-row items-center px-2 py-1 rounded-full`,
          { backgroundColor: "#F3EFFA" },
        ]}
      >
        <TouchableOpacity
          onPress={() => dispatch(decreaseQty(item.productId))}
          style={tw`p-1`}
        >
          <Minus size={14} color={PRIMARY} />
        </TouchableOpacity>

        <Text
          style={[
            tw`mx-2`,
            { fontFamily: "Poppins-SemiBold", color: TEXT },
          ]}
        >
          {item.quantity}
        </Text>

        <TouchableOpacity
          onPress={() => dispatch(increaseQty(item.productId))}
          style={tw`p-1`}
        >
          <Plus size={14} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={() => dispatch(removeFromCart(item.productId))}
        style={tw`ml-3`}
      >
        <X size={16} color={MUTED} />
      </TouchableOpacity>
    </View>
  );
});

/* =====================================================
   MAIN MODAL
===================================================== */
export default function CartModal({ visible, onClose, onCheckout }) {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.cart.items);

  /* =====================================================
     TOTAL
  ===================================================== */
  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [items]);

  const renderItem = useCallback(
    ({ item }) => <CartItem item={item} dispatch={dispatch} />,
    [dispatch]
  );

  const keyExtractor = useCallback((i) => i.productId, []);

  /* =====================================================
     EMPTY STATE
  ===================================================== */
  const EmptyState = () => (
    <View style={tw`flex-1 items-center justify-center`}>
      <ShoppingCart size={48} color={PRIMARY} />
      <Text
        style={[
          tw`mt-4 text-lg`,
          { fontFamily: "Poppins-SemiBold", color: TEXT },
        ]}
      >
        Your cart is empty
      </Text>
      <Text
        style={[
          tw`text-sm mt-1`,
          { fontFamily: "Poppins-Regular", color: MUTED },
        ]}
      >
        Add products to get started
      </Text>
    </View>
  );

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={[
          tw`flex-1`,
          { backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
        ]}
      >
        {/* Sheet */}
        <Pressable
          style={[
            tw`h-[90%] rounded-t-3xl`,
            {
              backgroundColor: SURFACE,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            },
          ]}
        >
          {/* HEADER */}
          <View style={tw`flex-row items-center justify-between px-5 pt-6 pb-3`}>
            <Text
              style={[
                tw`text-xl`,
                { fontFamily: "Poppins-Bold", color: TEXT },
              ]}
            >
              Cart
            </Text>

            <TouchableOpacity onPress={onClose}>
              <X size={22} color={TEXT} />
            </TouchableOpacity>
          </View>

          {/* LIST */}
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={tw`pb-28`}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* FOOTER */}
          {items.length > 0 && (
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 px-5 py-4`,
                {
                  backgroundColor: SURFACE,
                  borderTopWidth: 1,
                  borderColor: BORDER,
                },
              ]}
            >
              <View style={tw`flex-row justify-between mb-3`}>
                <Text
                  style={[
                    tw`text-base`,
                    { fontFamily: "Poppins-Regular", color: MUTED },
                  ]}
                >
                  Total
                </Text>

                <Text
                  style={[
                    tw`text-lg`,
                    { fontFamily: "Poppins-Bold", color: TEXT },
                  ]}
                >
                  Ksh {total.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onCheckout}
                style={[
                  tw`py-4 rounded-2xl items-center`,
                  { backgroundColor: PRIMARY },
                ]}
              >
                <Text
                  style={[
                    tw`text-white`,
                    { fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Proceed to Checkout
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
