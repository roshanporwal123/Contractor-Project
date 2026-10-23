import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["license", "insurance", "contract", "tax", "registration", "other"],
      default: "other",
    },
    fileUrl: { type: String, required: true },
    fileName: String,
    expiryDate: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("CompanyDocument", schema);