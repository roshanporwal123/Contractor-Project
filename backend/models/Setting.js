import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "Contractor Management SaaS" },
    supportEmail: { type: String, default: "support@example.com" },
    defaultCurrency: { type: String, default: "USD" },
    defaultTaxRate: { type: Number, default: 0 },
    allowSignup: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    maxUploadSizeMB: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model("Setting", settingSchema);