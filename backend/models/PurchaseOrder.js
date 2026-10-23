import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    poNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    totalCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Ordered", "Received", "Cancelled"],
      default: "Draft",
    },
    orderDate: { type: Date, default: Date.now },
    expectedDate: Date,
    receivedDate: Date,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ company: 1, poNumber: 1 }, { unique: true });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);