import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "pcs", trim: true }, // pcs, kg, m, bag, litre...
    quantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

materialSchema.index({ company: 1, name: 1 });

export default mongoose.model("Material", materialSchema);