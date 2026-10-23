import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", default: null },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "cancelled"],
      default: "todo",
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    comments: [commentSchema],
    attachments: [attachmentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });

// status <-> progress sync
taskSchema.pre("save", function () {
  if (this.isModified("status")) {
    if (this.status === "completed") this.progress = 100;
    if (this.status === "todo" && !this.isModified("progress")) this.progress = 0;
  }
  if (this.isModified("progress")) {
    if (this.progress === 100) this.status = "completed";
    else if (this.progress > 0 && this.status === "todo") this.status = "in_progress";
  }
  if (this.status === "completed" && !this.completedAt) this.completedAt = new Date();
  if (this.status !== "completed") this.completedAt = undefined;
});

export default mongoose.model("Task", taskSchema);