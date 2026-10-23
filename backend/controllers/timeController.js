import mongoose from "mongoose";
import TimeEntry from "../models/TimeEntry.js";

const isManager = (user) => ["company", "admin"].includes(user.role);

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- Clock In ----------
export const clockIn = handle(async (req, res) => {
  const { project, task, notes } = req.body;
  if (!project) return res.status(400).json({ success: false, message: "Project required hai" });

  const running = await TimeEntry.findOne({ contractor: req.user._id, status: "running" });
  if (running)
    return res.status(400).json({ success: false, message: "Aap pehle se clocked-in ho" });

  const entry = await TimeEntry.create({
    contractor: req.user._id,
    project,
    task: task || undefined,
    notes,
    clockIn: new Date(),
    status: "running",
    source: "clock",
  });
  res.status(201).json({ success: true, entry });
});

// ---------- Clock Out ----------
export const clockOut = handle(async (req, res) => {
  const entry = await TimeEntry.findOne({ contractor: req.user._id, status: "running" });
  if (!entry)
    return res.status(400).json({ success: false, message: "Koi running entry nahi mili" });

  entry.clockOut = new Date();
  entry.breakMinutes = Number(req.body.breakMinutes) || 0;
  if (req.body.notes) entry.notes = req.body.notes;
  entry.status = "pending"; // manager approval ke liye
  await entry.save();
  res.json({ success: true, entry });
});

// ---------- Current running entry ----------
export const getRunning = handle(async (req, res) => {
  const entry = await TimeEntry.findOne({ contractor: req.user._id, status: "running" })
    .populate("project", "name title")
    .populate("task", "title");
  res.json({ success: true, entry });
});

// ---------- Manual entry ----------
export const addManualEntry = handle(async (req, res) => {
  const { project, task, clockIn, clockOut, breakMinutes, notes } = req.body;
  if (!project || !clockIn || !clockOut)
    return res.status(400).json({ success: false, message: "project, clockIn, clockOut required hain" });

  const start = new Date(clockIn);
  const end = new Date(clockOut);
  if (end <= start)
    return res.status(400).json({ success: false, message: "clockOut, clockIn ke baad hona chahiye" });

  const entry = await TimeEntry.create({
    contractor: req.user._id,
    project,
    task: task || undefined,
    clockIn: start,
    clockOut: end,
    breakMinutes: Number(breakMinutes) || 0,
    notes,
    status: "pending",
    source: "manual",
  });
  res.status(201).json({ success: true, entry });
});

// ---------- Build filter ----------
const buildFilter = (req) => {
  const { status, project, contractor, from, to } = req.query;
  const filter = {};
  if (isManager(req.user)) {
    if (contractor) filter.contractor = contractor;
  } else {
    filter.contractor = req.user._id;
  }
  if (status) filter.status = status;
  if (project) filter.project = project;
  if (from || to) {
    filter.clockIn = {};
    if (from) filter.clockIn.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      filter.clockIn.$lte = t;
    }
  }
  return filter;
};

// ---------- List entries (contractor: apni, manager: sabki) ----------
export const getEntries = handle(async (req, res) => {
  const entries = await TimeEntry.find(buildFilter(req))
    .populate("contractor", "name email")
    .populate("project", "name title")
    .populate("task", "title")
    .sort({ clockIn: -1 });
  res.json({ success: true, count: entries.length, entries });
});

// ---------- Update (sirf owner, pending/rejected) ----------
export const updateEntry = handle(async (req, res) => {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Entry nahi mili" });
  if (String(entry.contractor) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Allowed nahi hai" });
  if (!["pending", "rejected"].includes(entry.status))
    return res.status(400).json({ success: false, message: "Is status mein edit nahi ho sakta" });

  const { project, task, clockIn, clockOut, breakMinutes, notes } = req.body;
  if (project) entry.project = project;
  if (task !== undefined) entry.task = task || undefined;
  if (clockIn) entry.clockIn = new Date(clockIn);
  if (clockOut) entry.clockOut = new Date(clockOut);
  if (breakMinutes !== undefined) entry.breakMinutes = Number(breakMinutes) || 0;
  if (notes !== undefined) entry.notes = notes;
  if (entry.clockOut <= entry.clockIn)
    return res.status(400).json({ success: false, message: "clockOut, clockIn ke baad hona chahiye" });

  entry.status = "pending";
  entry.rejectionReason = undefined;
  await entry.save();
  res.json({ success: true, entry });
});

// ---------- Delete ----------
export const deleteEntry = handle(async (req, res) => {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Entry nahi mili" });
  const owner = String(entry.contractor) === String(req.user._id);
  if (!owner && !isManager(req.user))
    return res.status(403).json({ success: false, message: "Allowed nahi hai" });
  if (owner && !isManager(req.user) && entry.status === "approved")
    return res.status(400).json({ success: false, message: "Approved entry delete nahi ho sakti" });

  await entry.deleteOne();
  res.json({ success: true, message: "Entry delete ho gayi" });
});

// ---------- Manager approval ----------
export const approveEntry = handle(async (req, res) => {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Entry nahi mili" });
  if (entry.status !== "pending")
    return res.status(400).json({ success: false, message: "Sirf pending entry approve hoti hai" });

  entry.status = "approved";
  entry.approvedBy = req.user._id;
  entry.approvedAt = new Date();
  entry.rejectionReason = undefined;
  await entry.save();
  res.json({ success: true, entry });
});

export const rejectEntry = handle(async (req, res) => {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Entry nahi mili" });
  if (entry.status !== "pending")
    return res.status(400).json({ success: false, message: "Sirf pending entry reject hoti hai" });

  entry.status = "rejected";
  entry.approvedBy = req.user._id;
  entry.approvedAt = new Date();
  entry.rejectionReason = req.body.reason || "No reason given";
  await entry.save();
  res.json({ success: true, entry });
});

// ---------- Weekly / Monthly timesheet ----------
const getRange = (period, dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  let start, end;
  if (period === "month") {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    const day = (d.getDay() + 6) % 7; // Monday = 0
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  }
  return { start, end };
};

export const getTimesheet = handle(async (req, res) => {
  const period = req.query.period === "month" ? "month" : "week";
  const { start, end } = getRange(period, req.query.date);

  const match = { clockIn: { $gte: start, $lte: end }, status: { $in: ["pending", "approved"] } };
  if (isManager(req.user)) {
    if (req.query.contractor) match.contractor = new mongoose.Types.ObjectId(req.query.contractor);
  } else {
    match.contractor = new mongoose.Types.ObjectId(req.user._id);
  }

  const byContractor = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$contractor",
        totalHours: { $sum: "$hoursWorked" },
        overtimeHours: { $sum: "$overtimeHours" },
        approvedHours: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$hoursWorked", 0] } },
        pendingHours: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$hoursWorked", 0] } },
        entries: { $sum: 1 },
      },
    },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        contractorId: "$_id",
        name: "$user.name",
        email: "$user.email",
        totalHours: { $round: ["$totalHours", 2] },
        overtimeHours: { $round: ["$overtimeHours", 2] },
        approvedHours: { $round: ["$approvedHours", 2] },
        pendingHours: { $round: ["$pendingHours", 2] },
        entries: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  const daily = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$clockIn" } },
        hours: { $sum: "$hoursWorked" },
        overtime: { $sum: "$overtimeHours" },
      },
    },
    { $project: { _id: 0, date: "$_id", hours: { $round: ["$hours", 2] }, overtime: { $round: ["$overtime", 2] } } },
    { $sort: { date: 1 } },
  ]);

  const totals = byContractor.reduce(
    (a, c) => ({
      totalHours: a.totalHours + c.totalHours,
      overtimeHours: a.overtimeHours + c.overtimeHours,
    }),
    { totalHours: 0, overtimeHours: 0 }
  );

  res.json({ success: true, period, start, end, totals, byContractor, daily });
});