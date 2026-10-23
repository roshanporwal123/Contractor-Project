import Contractor from "../models/Contractor.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Invoice from "../models/Invoice.js";
import Payout from "../models/Payout.js";
import TimeEntry from "../models/TimeEntry.js";

export const getCustomerDashboard = async (req, res) => {
  try {
    // attachCompany jo bhi set karta hai (apne middleware se check karo)
    const companyId = req.companyId || req.company?._id || req.company;

    if (!companyId) {
      return res.status(404).json({
        message: "Company profile nahi mila. Pehle company profile banayein.",
      });
    }

    const [contractors, projects, invoices, payouts] = await Promise.all([
      Contractor.find({ company: companyId })
        .select("name businessName email phone specialization hourlyRate status averageRating")
        .sort({ createdAt: -1 }),
      Project.find({ company: companyId })
        .select("name client.name startDate endDate budget status progress contractors")
        .sort({ createdAt: -1 }),
      Invoice.find({ company: companyId })
        .select("invoiceNumber client.name project issueDate dueDate total amountPaid balanceDue status")
        .populate("project", "name")
        .sort({ createdAt: -1 }),
      Payout.find({ company: companyId })
        .select("contractor project amount method status paidAt createdAt")
        .populate("contractor", "name")
        .populate("project", "name")
        .sort({ createdAt: -1 }),
    ]);

    const projectIds = projects.map((p) => p._id);

    const [tasks, timeEntries] = await Promise.all([
      Task.find({ project: { $in: projectIds } })
        .select("title project assignedTo priority dueDate status progress")
        .populate("project", "name")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 }),
      TimeEntry.find({ project: { $in: projectIds } })
        .select("contractor project clockIn clockOut hoursWorked overtimeHours status")
        .populate("contractor", "name")
        .populate("project", "name")
        .sort({ clockIn: -1 })
        .limit(50),
    ]);

    const now = new Date();
    const openTask = ["todo", "in_progress", "review"];
    const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);
    const round = (n) => Math.round(n * 100) / 100;

    const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
    const isOverdue = (i) =>
      ["unpaid", "partial", "overdue"].includes(i.status) && i.dueDate && i.dueDate < now;

    res.json({
      stats: {
        totalContractors: contractors.length,
        activeContractors: contractors.filter((c) => c.status === "Active").length,
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "active").length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        totalTasks: tasks.length,
        pendingTasks: tasks.filter((t) => openTask.includes(t.status)).length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        overdueTasks: tasks.filter(
          (t) => t.dueDate && t.dueDate < now && openTask.includes(t.status)
        ).length,
        totalInvoiced: round(sum(activeInvoices, (i) => i.total)),
        totalReceived: round(sum(activeInvoices, (i) => i.amountPaid)),
        outstanding: round(sum(activeInvoices, (i) => i.balanceDue)),
        overdueInvoices: activeInvoices.filter(isOverdue).length,
        payoutsPaid: round(
          sum(payouts.filter((p) => p.status === "paid"), (p) => p.amount)
        ),
        payoutsPending: round(
          sum(payouts.filter((p) => p.status === "pending"), (p) => p.amount)
        ),
        hoursToApprove: round(
          sum(timeEntries.filter((t) => t.status === "pending"), (t) => t.hoursWorked)
        ),
      },
      contractors: contractors.slice(0, 10),
      projects: projects.slice(0, 10),
      tasks: tasks.slice(0, 10),
      invoices: invoices.slice(0, 10),
      payouts: payouts.slice(0, 10),
      timeEntries: timeEntries.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};