import User from "../models/User.js";
import Company from "../models/Company.js";
import Contractor from "../models/Contractor.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Invoice from "../models/Invoice.js";
import Payout from "../models/Payout.js";
import TimeEntry from "../models/TimeEntry.js";

const round = (n) => Math.round((n || 0) * 100) / 100;

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      adminUsers,
      customerUsers,
      contractorUsers,
      totalCompanies,
      totalContractors,
      activeContractors,
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      pendingTimeEntries,
      invoiceAgg,
      payoutAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "contractor" }),
      Company.countDocuments(),
      Contractor.countDocuments(),
      Contractor.countDocuments({ status: "Active" }),
      Project.countDocuments(),
      Project.countDocuments({ status: "active" }),
      Project.countDocuments({ status: "completed" }),
      Task.countDocuments(),
      Task.countDocuments({ status: "completed" }),
      TimeEntry.countDocuments({ status: "pending" }),
      Invoice.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            invoiced: { $sum: "$total" },
            received: { $sum: "$amountPaid" },
            outstanding: { $sum: "$balanceDue" },
          },
        },
      ]),
      Payout.aggregate([
        { $match: { status: { $in: ["paid", "pending"] } } },
        { $group: { _id: "$status", total: { $sum: "$amount" } } },
      ]),
    ]);

    const inv = invoiceAgg[0] || { count: 0, invoiced: 0, received: 0, outstanding: 0 };
    const payoutTotal = (s) => payoutAgg.find((p) => p._id === s)?.total || 0;

    const [users, companies, contractors, projects, invoices, payouts] = await Promise.all([
      User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(10),
      Company.find()
        .select("name email phone owner createdAt")
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .limit(10),
      Contractor.find()
        .select("name email company specialization hourlyRate status createdAt")
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .limit(10),
      Project.find()
        .select("name company client.name startDate endDate budget status progress")
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .limit(10),
      Invoice.find()
        .select("invoiceNumber company client.name dueDate total amountPaid balanceDue status")
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .limit(10),
      Payout.find()
        .select("company contractor amount method status paidAt createdAt")
        .populate("company", "name")
        .populate("contractor", "name")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      stats: {
        totalUsers,
        adminUsers,
        customerUsers,
        contractorUsers,
        totalCompanies,
        totalContractors,
        activeContractors,
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        pendingTimeEntries,
        totalInvoices: inv.count,
        totalInvoiced: round(inv.invoiced),
        totalReceived: round(inv.received),
        outstanding: round(inv.outstanding),
        payoutsPaid: round(payoutTotal("paid")),
        payoutsPending: round(payoutTotal("pending")),
      },
      users,
      companies,
      contractors,
      projects,
      invoices,
      payouts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};