import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Contractor from '../models/Contractor.js';
import Invoice from '../models/Invoice.js';

// Optional models: agar model nahi mila to us part ko skip kar dega (crash nahi hoga)
const M = (name) => mongoose.models[name] || null;
const oid = (id) => new mongoose.Types.ObjectId(id);
const agg = (Model, pipeline) => (Model ? Model.aggregate(pipeline) : Promise.resolve([]));
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
const handle = (fn) => (req, res) =>
  fn(req, res).catch((e) => res.status(500).json({ success: false, message: e.message }));

// ====== Yahan apne status values / field names adjust kar lo ======
const STATUS = {
  projectActive: ['Active', 'In Progress', 'Ongoing'],
  projectCompleted: ['Completed'],
  taskDone: ['Completed', 'Done'],
  invoicePaid: ['Paid'],
  invoiceOutstanding: ['Unpaid', 'Overdue', 'Sent', 'Partially Paid'],
};
const MATERIAL_COST = {
  $ifNull: [
    '$totalCost',
    { $multiply: [{ $ifNull: ['$quantity', 0] }, { $ifNull: ['$unitCost', 0] }] },
  ],
};
const LABOR_COST = {
  $ifNull: [
    '$laborCost',
    { $multiply: [{ $ifNull: ['$hours', 0] }, { $ifNull: ['$hourlyRate', 0] }] },
  ],
};
// ===================================================================

const timeMatch = (cid, extra = {}) => ({ company: cid, status: { $ne: 'Rejected' }, ...extra });

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthExpr = (field) => ({ $dateToString: { format: '%Y-%m', date: field } });

// ---------- Monthly revenue / expenses / profit ----------
async function monthlySeries(cid, months = 12) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (months - 1));

  const keys = [];
  for (let i = 0; i < months; i++) {
    keys.push(monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));
  }

  const [rev, mat, lab] = await Promise.all([
    Invoice.aggregate([
      { $match: { company: cid, status: { $in: STATUS.invoicePaid } } },
      { $addFields: { d: { $ifNull: ['$paidAt', '$updatedAt'] } } },
      { $match: { d: { $gte: start } } },
      { $group: { _id: monthExpr('$d'), total: { $sum: { $ifNull: ['$total', 0] } } } },
    ]),
    agg(M('UsedMaterial'), [
      { $match: { company: cid, createdAt: { $gte: start } } },
      { $group: { _id: monthExpr('$createdAt'), total: { $sum: MATERIAL_COST } } },
    ]),
    agg(M('TimeEntry'), [
      { $match: timeMatch(cid, { createdAt: { $gte: start } }) },
      { $group: { _id: monthExpr('$createdAt'), total: { $sum: LABOR_COST } } },
    ]),
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.total]));
  const r = toMap(rev), m = toMap(mat), l = toMap(lab);

  return keys.map((k) => {
    const revenue = r[k] || 0;
    const expenses = (m[k] || 0) + (l[k] || 0);
    return { month: k, revenue: round(revenue), expenses: round(expenses), profit: round(revenue - expenses) };
  });
}

// ---------- Project profitability ----------
async function buildProfitability(cid) {
  const [projects, rev, mat, lab] = await Promise.all([
    Project.find({ company: cid }).select('name status budget progress').lean(),
    Invoice.aggregate([
      { $match: { company: cid, status: { $in: STATUS.invoicePaid } } },
      { $group: { _id: '$project', total: { $sum: { $ifNull: ['$total', 0] } } } },
    ]),
    agg(M('UsedMaterial'), [
      { $match: { company: cid } },
      { $group: { _id: '$project', total: { $sum: MATERIAL_COST } } },
    ]),
    agg(M('TimeEntry'), [
      { $match: timeMatch(cid) },
      { $group: { _id: '$project', total: { $sum: LABOR_COST } } },
    ]),
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.total]));
  const r = toMap(rev), m = toMap(mat), l = toMap(lab);

  return projects
    .map((p) => {
      const id = String(p._id);
      const revenue = r[id] || 0;
      const expenses = (m[id] || 0) + (l[id] || 0);
      const profit = revenue - expenses;
      const budget = p.budget || 0;
      return {
        projectId: id,
        name: p.name,
        status: p.status,
        progress: p.progress || 0,
        budget: round(budget),
        revenue: round(revenue),
        expenses: round(expenses),
        profit: round(profit),
        margin: revenue > 0 ? round((profit / revenue) * 100) : 0,
        budgetUsed: budget > 0 ? round((expenses / budget) * 100) : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

// ---------- Contractor performance ----------
async function buildContractorPerformance(cid) {
  const [contractors, tasks, hours, ratings] = await Promise.all([
    Contractor.find({ company: cid }).lean(),
    Task.aggregate([
      { $match: { company: cid, assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ['$status', STATUS.taskDone] }, 1, 0] } },
          onTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', STATUS.taskDone] },
                    { $lte: [{ $ifNull: ['$completedAt', '$updatedAt'] }, '$dueDate'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    agg(M('TimeEntry'), [
      { $match: timeMatch(cid) },
      { $group: { _id: '$contractor', hours: { $sum: { $ifNull: ['$hours', 0] } } } },
    ]),
    agg(M('Review'), [
      { $match: { company: cid, contractor: { $ne: null } } },
      { $group: { _id: '$contractor', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const tMap = Object.fromEntries(tasks.map((x) => [String(x._id), x]));
  const hMap = Object.fromEntries(hours.map((x) => [String(x._id), x.hours]));
  const rMap = Object.fromEntries(ratings.map((x) => [String(x._id), x]));

  return contractors
    .map((c) => {
      const id = String(c._id);
      const t = tMap[id] || { total: 0, completed: 0, onTime: 0 };
      const rt = rMap[id];
      const completionRate = t.total ? (t.completed / t.total) * 100 : 0;
      const onTimeRate = t.completed ? (t.onTime / t.completed) * 100 : 0;
      const avgRating = rt ? rt.avg : 0;

      // Score = available components ka weighted average
      const parts = [];
      if (t.total) {
        parts.push([completionRate, 0.5]);
        if (t.completed) parts.push([onTimeRate, 0.3]);
      }
      if (rt) parts.push([(avgRating / 5) * 100, 0.2]);
      const w = parts.reduce((s, p) => s + p[1], 0);
      const score = w ? parts.reduce((s, p) => s + p[0] * p[1], 0) / w : 0;

      return {
        contractorId: id,
        name: c.name || c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed',
        status: c.status,
        tasksAssigned: t.total,
        tasksCompleted: t.completed,
        completionRate: round(completionRate),
        onTimeRate: round(onTimeRate),
        hoursWorked: round(hMap[id] || 0),
        avgRating: round(avgRating),
        reviews: rt ? rt.count : 0,
        score: round(score),
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- CSV helper ----------
const toCsv = (rows, columns) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  return `${head}\n${body}`;
};

// ================= Controllers =================

// GET /api/dashboard?months=12
export const getOverview = handle(async (req, res) => {
  const cid = oid(req.companyId);
  const months = Math.min(Math.max(parseInt(req.query.months) || 12, 3), 24);
  const now = new Date();

  const [
    activeProjects, completedProjects, pendingTasks, totalContractors,
    revAgg, outAgg, overdueAgg, matAgg, labAgg,
    projectStatus, taskStatus, series, overdueList, recentProjects,
  ] = await Promise.all([
    Project.countDocuments({ company: cid, status: { $in: STATUS.projectActive } }),
    Project.countDocuments({ company: cid, status: { $in: STATUS.projectCompleted } }),
    Task.countDocuments({ company: cid, status: { $nin: STATUS.taskDone } }),
    Contractor.countDocuments({ company: cid }),
    Invoice.aggregate([
      { $match: { company: cid, status: { $in: STATUS.invoicePaid } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
    ]),
    Invoice.aggregate([
      { $match: { company: cid, status: { $in: STATUS.invoiceOutstanding } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { company: cid, status: { $in: STATUS.invoiceOutstanding }, dueDate: { $lt: now } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } }, count: { $sum: 1 } } },
    ]),
    agg(M('UsedMaterial'), [
      { $match: { company: cid } },
      { $group: { _id: null, total: { $sum: MATERIAL_COST } } },
    ]),
    agg(M('TimeEntry'), [
      { $match: timeMatch(cid) },
      { $group: { _id: null, total: { $sum: LABOR_COST } } },
    ]),
    Project.aggregate([{ $match: { company: cid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: { company: cid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    monthlySeries(cid, months),
    Invoice.find({ company: cid, status: { $in: STATUS.invoiceOutstanding }, dueDate: { $lt: now } })
      .sort({ dueDate: 1 }).limit(5).select('invoiceNumber total dueDate status').lean(),
    Project.find({ company: cid }).sort({ createdAt: -1 }).limit(5)
      .select('name status progress budget').lean(),
  ]);

  const revenue = revAgg[0]?.total || 0;
  const expenses = (matAgg[0]?.total || 0) + (labAgg[0]?.total || 0);

  res.json({
    success: true,
    data: {
      cards: {
        activeProjects,
        completedProjects,
        pendingTasks,
        totalContractors,
        revenue: round(revenue),
        outstandingInvoices: { amount: round(outAgg[0]?.total), count: outAgg[0]?.count || 0 },
        overdueInvoices: { amount: round(overdueAgg[0]?.total), count: overdueAgg[0]?.count || 0 },
        expenses: round(expenses),
        profit: round(revenue - expenses),
      },
      charts: {
        monthly: series,
        projectStatus: projectStatus.map((x) => ({ name: x._id || 'Unknown', value: x.count })),
        taskStatus: taskStatus.map((x) => ({ name: x._id || 'Unknown', value: x.count })),
      },
      overdueList,
      recentProjects,
    },
  });
});

// GET /api/dashboard/profitability
export const getProfitability = handle(async (req, res) => {
  const rows = await buildProfitability(oid(req.companyId));
  const totals = rows.reduce(
    (s, r) => ({ revenue: s.revenue + r.revenue, expenses: s.expenses + r.expenses, profit: s.profit + r.profit }),
    { revenue: 0, expenses: 0, profit: 0 }
  );
  res.json({
    success: true,
    data: rows,
    totals: { revenue: round(totals.revenue), expenses: round(totals.expenses), profit: round(totals.profit) },
  });
});

// GET /api/dashboard/contractors
export const getContractorPerformance = handle(async (req, res) => {
  const rows = await buildContractorPerformance(oid(req.companyId));
  res.json({ success: true, data: rows });
});

// GET /api/dashboard/export/:type   (profitability | contractors | financial)
export const exportReport = handle(async (req, res) => {
  const cid = oid(req.companyId);
  const { type } = req.params;
  let csv;

  if (type === 'profitability') {
    csv = toCsv(await buildProfitability(cid), [
      { key: 'name', label: 'Project' }, { key: 'status', label: 'Status' },
      { key: 'budget', label: 'Budget' }, { key: 'revenue', label: 'Revenue' },
      { key: 'expenses', label: 'Expenses' }, { key: 'profit', label: 'Profit' },
      { key: 'margin', label: 'Margin %' }, { key: 'budgetUsed', label: 'Budget Used %' },
    ]);
  } else if (type === 'contractors') {
    csv = toCsv(await buildContractorPerformance(cid), [
      { key: 'name', label: 'Contractor' }, { key: 'status', label: 'Status' },
      { key: 'tasksAssigned', label: 'Tasks Assigned' }, { key: 'tasksCompleted', label: 'Tasks Completed' },
      { key: 'completionRate', label: 'Completion %' }, { key: 'onTimeRate', label: 'On-time %' },
      { key: 'hoursWorked', label: 'Hours' }, { key: 'avgRating', label: 'Avg Rating' },
      { key: 'score', label: 'Score' },
    ]);
  } else if (type === 'financial') {
    const months = Math.min(Math.max(parseInt(req.query.months) || 12, 3), 24);
    csv = toCsv(await monthlySeries(cid, months), [
      { key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue' },
      { key: 'expenses', label: 'Expenses' }, { key: 'profit', label: 'Profit' },
    ]);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid report type' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
  res.send(csv);
});