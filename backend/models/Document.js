import mongoose from "mongoose";

export const DOCUMENT_CATEGORIES = [
  "contract",
  "w9",
  "insurance_certificate",
  "license",
  "project_document",
  "invoice",
  "estimate",
  "other",
];

const documentSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: [true, "Title is required"], trim: true },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORIES,
      required: [true, "Category is required"],
    },
    description: { type: String, trim: true, default: "" },

    // Optional links
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", default: null },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    estimate: { type: mongoose.Schema.Types.ObjectId, ref: "Estimate", default: null },

    file: {
      originalName: String,
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },

    // Expiry reminders
    expiryDate: { type: Date, default: null },
    reminderDaysBefore: { type: Number, default: 30, min: 1 },
    reminderSent: { type: Boolean, default: false },

    version: { type: Number, default: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

documentSchema.index({ company: 1, category: 1 });
documentSchema.index({ company: 1, expiryDate: 1 });

// none | valid | expiring_soon | expired
documentSchema.virtual("expiryStatus").get(function () {
  if (!this.expiryDate) return "none";
  const now = new Date();
  if (this.expiryDate < now) return "expired";
  const warnFrom = new Date(this.expiryDate);
  warnFrom.setDate(warnFrom.getDate() - (this.reminderDaysBefore || 30));
  return now >= warnFrom ? "expiring_soon" : "valid";
});

export default mongoose.model("Document", documentSchema);