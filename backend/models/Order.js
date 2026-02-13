const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  title: String,
  unitPrice: Number,
  quantity: Number,
  subtotal: Number,
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [OrderItemSchema],

    amount: Number,
    currency: {
      type: String,
      default: "KES",
    },

    paymentIntentId: String,
    transactionId: String,

    status: {
      type: String,
      enum: [
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
      ],
      default: "paid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
