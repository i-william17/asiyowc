// models/PaymentIntent.js
const mongoose = require("mongoose");

const paymentIntentSchema = new mongoose.Schema(
  {
    intentId: { type: String, unique: true, index: true },

    purpose: {
      type: String,
      enum: ["SAVINGS_CONTRIBUTION", "WITHDRAWAL_PAYOUT", "WITHDRAWAL_REFUND"],
      required: true,
    },

    podId: { type: mongoose.Schema.Types.ObjectId, ref: "SavingsPod" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ⛔ NOT required at creation
    amount: { type: Number },
    currency: { type: String, default: "KES" },

    paybillShortCode: { type: String, required: true },
    accountReference: { type: String, required: true },

    method: { type: String, enum: ["MPESA"], default: "MPESA" },

    status: {
      type: String,
      enum: ["CREATED", "PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "CREATED",
    },

    phone: String,
    merchantRequestId: String,
    checkoutRequestId: String,

    // ✅ M-Pesa receipt (only available via CALLBACK)
    mpesaReceiptNumber: String,

    // ✅ Raw M-Pesa result
    resultCode: Number,
    resultDesc: String,

    // ✅ NEW — how payment was confirmed
    confirmationMethod: {
      type: String,
      enum: ["CALLBACK", "FALLBACK"],
    },

    applied: { type: Boolean, default: false },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000),
    },
  },
  { timestamps: true }
);

paymentIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PaymentIntent", paymentIntentSchema);
