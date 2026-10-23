import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "new_project",
  "task_assigned",
  "invoice_generated",
  "payment_received",
  "document_expiry",
  "schedule_change",
  "new_message",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "general" },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    link: { type: String, default: "" }, // frontend route, e.g. /projects/123
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // refId, etc.
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);