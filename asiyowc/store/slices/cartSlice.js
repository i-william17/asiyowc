import { createSlice, createSelector } from "@reduxjs/toolkit";

/* ======================================================
   INITIAL STATE
====================================================== */

const initialState = {
  /*
    items:
    [
      {
        productId,
        title,
        price,
        image,
        quantity
      }
    ]
  */
  items: [],
};

/* ======================================================
   SLICE
====================================================== */

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    /* ======================================================
       ADD TO CART
       - merges if exists
       - supports optional qty
    ====================================================== */
    addToCart: (state, action) => {
      const {
        productId,
        title,
        price,
        image,
        quantity = 1,
      } = action.payload;

      const existing = state.items.find(
        (i) => i.productId === productId
      );

      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({
          productId,
          title,
          price,
          image,
          quantity,
        });
      }
    },

    /* ======================================================
       REMOVE ITEM
    ====================================================== */
    removeFromCart: (state, action) => {
      state.items = state.items.filter(
        (i) => i.productId !== action.payload
      );
    },

    /* ======================================================
       INCREASE QTY
    ====================================================== */
    increaseQty: (state, action) => {
      const item = state.items.find(
        (i) => i.productId === action.payload
      );

      if (item) item.quantity += 1;
    },

    /* ======================================================
       DECREASE QTY
       (removes if hits 0)
    ====================================================== */
    decreaseQty: (state, action) => {
      const item = state.items.find(
        (i) => i.productId === action.payload
      );

      if (!item) return;

      item.quantity -= 1;

      if (item.quantity <= 0) {
        state.items = state.items.filter(
          (i) => i.productId !== action.payload
        );
      }
    },

    /* ======================================================
       SET QTY DIRECTLY (useful for inputs)
    ====================================================== */
    setQty: (state, action) => {
      const { productId, quantity } = action.payload;

      const item = state.items.find(
        (i) => i.productId === productId
      );

      if (!item) return;

      if (quantity <= 0) {
        state.items = state.items.filter(
          (i) => i.productId !== productId
        );
      } else {
        item.quantity = quantity;
      }
    },

    /* ======================================================
       CLEAR CART
    ====================================================== */
    clearCart: (state) => {
      state.items = [];
    },
  },
});

/* ======================================================
   EXPORT ACTIONS
====================================================== */

export const {
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
  setQty,
  clearCart,
} = cartSlice.actions;

/* ======================================================
   SELECTORS (VERY IMPORTANT FOR PERFORMANCE)
====================================================== */

export const selectCartItems = (state) => state.cart.items;

export const selectCartCount = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce((sum, item) => sum + item.quantity, 0)
);

export const selectCartSubtotal = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
);

export const selectCartTotals = createSelector(
  [selectCartItems],
  (items) => {
    const subtotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const count = items.reduce(
      (sum, i) => sum + i.quantity,
      0
    );

    return {
      subtotal,
      count,
    };
  }
);

/* ======================================================
   EXPORT REDUCER
====================================================== */

export default cartSlice.reducer;
