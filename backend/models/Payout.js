import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ["bank_transfer", "cash", "cheque", "stripe", "other"],
      default: "bank_transfer",
    },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending", index: true },

    periodStart: Date,
    periodEnd: Date,
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    paidAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Payout", payoutSchema);