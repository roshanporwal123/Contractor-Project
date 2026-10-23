import mongoose from "mongoose";

const materialUsageSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("MaterialUsage", materialUsageSchema);