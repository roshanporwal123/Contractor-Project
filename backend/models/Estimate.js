import mongoose from "mongoose";
import crypto from "crypto";

const laborSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  hours: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, default: 0 },
});

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  amount: { type: Number, default: 0 },
});

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
});

const estimateSchema = new mongoose.Schema(
  {
    estimateNumber: { type: String, unique: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    client: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: String,
      address: String,
    },

    laborItems: [laborSchema],
    materialItems: [materialSchema],
    additionalExpenses: [expenseSchema],

    taxRate: { type: Number, default: 0, min: 0, max: 100 }, // percent
    discountType: { type: String, enum: ["percent", "fixed"], default: "fixed" },
    discountValue: { type: Number, default: 0, min: 0 },

    laborTotal: { type: Number, default: 0 },
    materialTotal: { type: Number, default: 0 },
    expenseTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    validUntil: Date,
    notes: String,

    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    sentAt: Date,
    respondedAt: Date,
    rejectionReason: String,

    publicToken: { type: String, unique: true, default: () => crypto.randomBytes(24).toString("hex") },
  },
  { timestamps: true }
);

// Auto calculation
estimateSchema.pre("validate", function () {
  const r = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  this.laborItems.forEach((i) => (i.amount = r(i.hours * i.rate)));
  this.materialItems.forEach((i) => (i.amount = r(i.quantity * i.unitCost)));

  this.laborTotal = r(this.laborItems.reduce((s, i) => s + i.amount, 0));
  this.materialTotal = r(this.materialItems.reduce((s, i) => s + i.amount, 0));
  this.expenseTotal = r(this.additionalExpenses.reduce((s, i) => s + i.amount, 0));
  this.subtotal = r(this.laborTotal + this.materialTotal + this.expenseTotal);

  this.discountAmount =
    this.discountType === "percent"
      ? r((this.subtotal * this.discountValue) / 100)
      : r(Math.min(this.discountValue, this.subtotal));

  const taxable = this.subtotal - this.discountAmount;
  this.taxAmount = r((taxable * this.taxRate) / 100);
  this.total = r(taxable + this.taxAmount);
});

export default mongoose.model("Estimate", estimateSchema);