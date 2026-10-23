import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["license", "insurance", "w9", "contract", "other"],
      default: "other",
    },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const contractorSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional: linked login account

    // Profile
    name: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true },
    bio: { type: String, trim: true },

    // Contact information
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },

    // Skills & specialization
    skills: [{ type: String, trim: true }],
    specialization: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    hourlyRate: { type: Number, min: 0, default: 0 },

    // Service area
    serviceAreas: [{ type: String, trim: true }],

    // License details
    license: {
      number: String,
      issuedBy: String,
      issueDate: Date,
      expiryDate: Date,
    },

    // Insurance details
    insurance: {
      provider: String,
      policyNumber: String,
      coverageAmount: Number,
      expiryDate: Date,
    },

    documents: [documentSchema],

    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Pending",
      index: true,
    },

    averageRating: { type: Number, default: 0 }, // Module 15 use karega
  },
  { timestamps: true }
);

// Ek company me same email ka contractor duplicate na ho
contractorSchema.index({ company: 1, email: 1 }, { unique: true });
contractorSchema.index({ name: "text", skills: "text", specialization: "text" });

export default mongoose.model("Contractor", contractorSchema);