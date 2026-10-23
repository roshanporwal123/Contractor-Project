import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    // direct = Customer <-> Contractor, project = project-based group, internal = internal team
    type: {
      type: String,
      enum: ["direct", "project", "internal"],
      required: true,
    },
    name: { type: String, trim: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ project: 1, type: 1 });

export default mongoose.model("Conversation", conversationSchema);