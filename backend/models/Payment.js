import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, trim: true },
    status: { type: String, enum: ["requested", "processed", "rejected"], default: "requested" },
    stripeRefundId: String,
    rejectionNote: String,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedAt: Date,
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    invoiceNumber: String,
    payerName: String,
    payerEmail: String,

    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "usd" },
    method: { type: String, default: "stripe" },

    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "partially_refunded", "refunded"],
      default: "pending",
      index: true,
    },

    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: String,
    failureReason: String,
    paidAt: Date,

    refundedAmount: { type: Number, default: 0 },
    refunds: [refundSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);