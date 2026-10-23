import mongoose from "mongoose";

export const DAILY_OVERTIME_THRESHOLD = 8; // 8 ghante ke baad overtime

const timeEntrySchema = new mongoose.Schema(
  {
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    breakMinutes: { type: Number, default: 0, min: 0 },
    hoursWorked: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    source: { type: String, enum: ["clock", "manual"], default: "clock" },
    status: {
      type: String,
      enum: ["running", "pending", "approved", "rejected"],
      default: "running",
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

timeEntrySchema.methods.calculate = function () {
  if (!this.clockOut) return;
  const ms = this.clockOut - this.clockIn - this.breakMinutes * 60000;
  const hrs = Math.max(0, ms / 3600000);
  this.hoursWorked = Math.round(hrs * 100) / 100;
  this.overtimeHours =
    Math.round(Math.max(0, hrs - DAILY_OVERTIME_THRESHOLD) * 100) / 100;
};

timeEntrySchema.pre("save", function () {
  this.calculate();
});

export default mongoose.model("TimeEntry", timeEntrySchema);