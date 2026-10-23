import mongoose from "mongoose";

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ---------- Auto invoice number counter ---------- */
const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  seq: { type: Number, default: 0 },
});
const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export const generateInvoiceNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice-${companyId}-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${year}-${String(counter.seq).padStart(4, "0")}`;
};

/* ---------- Sub schemas ---------- */
const laborItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  hours: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, default: 0 },
});

const materialItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, default: 0 },
});

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "cheque", "stripe", "other"],
      default: "cash",
    },
    date: { type: Date, default: Date.now },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ---------- Invoice ---------- */
const invoiceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    invoiceNumber: { type: String, required: true },

    client: {
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },

    laborItems: [laborItemSchema],
    materialItems: [materialItemSchema],

    taxRate: { type: Number, default: 0, min: 0, max: 100 }, // percent
    discountType: { type: String, enum: ["percent", "fixed"], default: "fixed" },
    discountValue: { type: Number, default: 0, min: 0 },

    laborTotal: { type: Number, default: 0 },
    materialTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["unpaid", "partial", "paid", "overdue", "cancelled"],
      default: "unpaid",
      index: true,
    },

    payments: [paymentSchema],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.index({ company: 1, invoiceNumber: 1 }, { unique: true });

/* ---------- Totals + status calculation ---------- */
invoiceSchema.methods.recalculate = function () {
  this.laborItems.forEach((i) => (i.amount = round(i.hours * i.rate)));
  this.materialItems.forEach((i) => (i.amount = round(i.quantity * i.unitPrice)));

  this.laborTotal = round(this.laborItems.reduce((s, i) => s + i.amount, 0));
  this.materialTotal = round(this.materialItems.reduce((s, i) => s + i.amount, 0));
  this.subtotal = round(this.laborTotal + this.materialTotal);

  let discount =
    this.discountType === "percent"
      ? (this.subtotal * this.discountValue) / 100
      : this.discountValue;
  discount = Math.min(discount, this.subtotal);
  this.discountAmount = round(discount);

  const taxable = this.subtotal - this.discountAmount;
  this.taxAmount = round((taxable * this.taxRate) / 100);
  this.total = round(taxable + this.taxAmount);

  this.amountPaid = round(this.payments.reduce((s, p) => s + p.amount, 0));
  this.balanceDue = round(Math.max(this.total - this.amountPaid, 0));

  if (this.status === "cancelled") return;

  if (this.total > 0 && this.balanceDue <= 0) this.status = "paid";
  else if (this.amountPaid > 0) this.status = "partial";
  else this.status = "unpaid";

  if (
    (this.status === "unpaid" || this.status === "partial") &&
    this.dueDate &&
    this.dueDate < new Date()
  ) {
    this.status = "overdue";
  }
};

invoiceSchema.pre("validate", function () {
  this.recalculate();
});

export default mongoose.model("Invoice", invoiceSchema);