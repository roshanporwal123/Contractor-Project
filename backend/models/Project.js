import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    client: {
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zip: { type: String, trim: true },
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    budget: { type: Number, default: 0, min: 0 },

    contractors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contractor" }],

    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },

    documents: [documentSchema],
  },
  { timestamps: true }
);

projectSchema.index({ company: 1, status: 1 });
projectSchema.index({ name: "text", "client.name": "text" });

export default mongoose.model("Project", projectSchema);