import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    designation: String,
    department: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

employeeSchema.index({ company: 1, email: 1 }, { unique: true });

export default mongoose.model("Employee", employeeSchema);