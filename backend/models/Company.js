import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
});

const addressShape = {
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
};

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: String,
    website: String,
    logo: { url: String, filename: String },
    businessInfo: {
      registrationNumber: String,
      taxId: String,
      industry: String,
      foundedYear: Number,
      description: String,
      address: addressShape,
    },
    departments: [departmentSchema],
    billing: {
      billingEmail: String,
      billingName: String,
      currency: { type: String, default: "USD" },
      paymentTerms: { type: String, default: "Net 30" },
      address: addressShape,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);