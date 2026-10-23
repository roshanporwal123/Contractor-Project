import Contractor from "../models/Contractor.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Payout from "../models/Payout.js";
import TimeEntry from "../models/TimeEntry.js";

export const getContractorDashboard = async (req, res) => {
  try {
    let contractor = await Contractor.findOne({ user: req.user._id });

    // Pehli baar login: email se dhoondo aur user link kar do
    if (!contractor) {
      contractor = await Contractor.findOne({
        email: req.user.email.toLowerCase(),
      });
      if (contractor) {
        contractor.user = req.user._id;
        await contractor.save();
      }
    }

    if (!contractor) {
      return res.status(404).json({
        message: "Aapka contractor profile nahi mila. Company se contact karein.",
      });
    }

    const [projects, tasks, payouts, timeEntries] = await Promise.all([
      Project.find({ contractors: contractor._id })
        .select("name description client.name location startDate endDate status progress documents")
        .sort({ createdAt: -1 }),
      Task.find({ assignedTo: contractor._id })
        .select("title description project priority dueDate status progress completedAt")
        .populate("project", "name")
        .sort({ dueDate: 1, createdAt: -1 }),
      Payout.find({ contractor: contractor._id })
        .select("amount method status periodStart periodEnd reference note paidAt project createdAt")
        .populate("project", "name")
        .sort({ createdAt: -1 }),
      // TimeEntry.contractor = User id
      TimeEntry.find({ contractor: req.user._id })
        .select("project task clockIn clockOut breakMinutes hoursWorked overtimeHours status notes")
        .populate("project", "name")
        .populate("task", "title")
        .sort({ clockIn: -1 })
        .limit(50),
    ]);

    const now = new Date();
    const openStatuses = ["todo", "in_progress", "review"];
    const sumBy = (status) =>
      payouts.filter((p) => p.status === status).reduce((s, p) => s + p.amount, 0);

    const countedEntries = timeEntries.filter((t) =>
      ["approved", "pending"].includes(t.status)
    );
    const totalHours = countedEntries.reduce((s, t) => s + (t.hoursWorked || 0), 0);
    const overtimeHours = countedEntries.reduce((s, t) => s + (t.overtimeHours || 0), 0);

    res.json({
      contractor,
      stats: {
        status: contractor.status,
        hourlyRate: contractor.hourlyRate,
        experienceYears: contractor.experienceYears,
        averageRating: contractor.averageRating,
        totalDocuments: contractor.documents.length,
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "active").length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        totalTasks: tasks.length,
        pendingTasks: tasks.filter((t) => openStatuses.includes(t.status)).length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        overdueTasks: tasks.filter(
          (t) => t.dueDate && t.dueDate < now && openStatuses.includes(t.status)
        ).length,
        totalEarned: sumBy("paid"),
        pendingPayout: sumBy("pending"),
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      },
      projects,
      tasks,
      payouts,
      timeEntries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};