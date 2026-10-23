import { loadModels, getModel } from "../utils/adminModels.js";

const RESOURCES = {
  users: { model: "User", search: ["name", "email"], canCreate: true },
  companies: { model: "Company", search: ["name", "email"] },
  contractors: { model: "Contractor", search: ["name", "email", "status"] },
  projects: { model: "Project", search: ["name", "status"] },
  services: { model: "Service", search: ["name", "category"], canCreate: true },
  payments: { model: "Payment", search: ["status"] },
  invoices: { model: "Invoice", search: ["invoiceNumber", "status"] },
  documents: { model: "Document", search: ["name", "title", "type"] },
  reviews: { model: "Review", search: ["comment", "status"] },
  subscriptions: { model: "Subscription", search: ["plan", "status"] },
};

const wrap = (fn) => async (req, res) => {
  try {
    await loadModels();
    await fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const resolve = (req, res) => {
  const cfg = RESOURCES[req.params.resource];
  if (!cfg) {
    res.status(404).json({ message: "Unknown resource" });
    return null;
  }
  const Model = getModel(cfg.model);
  if (!Model) {
    res.status(404).json({ message: `${cfg.model} model not found yet` });
    return null;
  }
  return { cfg, Model };
};

const clean = (body) => {
  const data = { ...body };
  delete data._id;
  delete data.__v;
  delete data.createdAt;
  delete data.updatedAt;
  return data;
};

/* ---------- Generic CRUD ---------- */

export const listResource = wrap(async (req, res) => {
  const r = resolve(req, res);
  if (!r) return;
  const { cfg, Model } = r;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const { q = "", status = "", sort = "-createdAt" } = req.query;

  const filter = {};
  if (q) {
    filter.$or = cfg.search.map((f) => ({ [f]: { $regex: q, $options: "i" } }));
  }
  if (status) filter.status = status;

  const total = await Model.countDocuments(filter);
  let query = Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean();
  if (cfg.model === "User") query = query.select("-password");
  const data = await query;

  res.json({ data, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const getResource = wrap(async (req, res) => {
  const r = resolve(req, res);
  if (!r) return;
  let query = r.Model.findById(req.params.id).lean();
  if (r.cfg.model === "User") query = query.select("-password");
  const doc = await query;
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

export const createResource = wrap(async (req, res) => {
  const r = resolve(req, res);
  if (!r) return;
  if (!r.cfg.canCreate) {
    return res.status(400).json({ message: "Create not allowed for this resource" });
  }
  const doc = await r.Model.create(clean(req.body));
  const obj = doc.toObject();
  delete obj.password;
  res.status(201).json(obj);
});

export const updateResource = wrap(async (req, res) => {
  const r = resolve(req, res);
  if (!r) return;
  const data = clean(req.body);

  if (r.cfg.model === "User") {
    delete data.password;
    if (req.params.id === req.user._id.toString() && ("role" in data || "isBlocked" in data)) {
      return res.status(400).json({ message: "You cannot change your own role or block status" });
    }
  }

  let query = r.Model.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (r.cfg.model === "User") query = query.select("-password");
  const doc = await query;
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

export const deleteResource = wrap(async (req, res) => {
  const r = resolve(req, res);
  if (!r) return;
  if (r.cfg.model === "User" && req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }
  const doc = await r.Model.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted successfully" });
});

/* ---------- Dashboard ---------- */

const count = async (name, filter = {}) => {
  const M = getModel(name);
  return M ? M.countDocuments(filter) : 0;
};

const PAID = /succeeded|paid|completed/i;

export const getDashboard = wrap(async (req, res) => {
  const Payment = getModel("Payment");
  const User = getModel("User");

  let revenue = 0;
  if (Payment) {
    const agg = await Payment.aggregate([
      { $match: { status: { $regex: PAID } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    revenue = agg[0]?.total || 0;
  }

  const [
    users, companies, contractors, pendingContractors, projects, activeProjects,
    tasks, invoices, unpaidInvoices, payments, documents, pendingReviews, subscriptions,
  ] = await Promise.all([
    count("User"),
    count("Company"),
    count("Contractor"),
    count("Contractor", { status: "Pending" }),
    count("Project"),
    count("Project", { status: { $regex: /^(active|in.?progress|ongoing)$/i } }),
    count("Task"),
    count("Invoice"),
    count("Invoice", { status: { $in: ["Unpaid", "Overdue"] } }),
    count("Payment"),
    count("Document"),
    count("Review", { status: { $regex: /pending/i } }),
    count("Subscription"),
  ]);

  const recentUsers = User
    ? await User.find().sort("-createdAt").limit(5).select("name email role createdAt").lean()
    : [];
  const recentPayments = Payment ? await Payment.find().sort("-createdAt").limit(5).lean() : [];

  res.json({
    stats: {
      users, companies, contractors, pendingContractors, projects, activeProjects,
      tasks, invoices, unpaidInvoices, payments, documents, pendingReviews,
      subscriptions, revenue,
    },
    recentUsers,
    recentPayments,
  });
});

/* ---------- Reports ---------- */

const sinceDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const monthly = (M, match = {}, sumField = null) =>
  M.aggregate([
    { $match: { createdAt: { $gte: sinceDate() }, ...match } },
    {
      $group: {
        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
        total: sumField ? { $sum: `$${sumField}` } : { $sum: 1 },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]);

const groupBy = (M, field) =>
  M.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

const fmt = (rows) => rows.map((r) => ({ label: `${r._id.y}-${String(r._id.m).padStart(2, "0")}`, total: r.total }));

export const getReports = wrap(async (req, res) => {
  const User = getModel("User");
  const Payment = getModel("Payment");
  const Project = getModel("Project");
  const Invoice = getModel("Invoice");
  const Subscription = getModel("Subscription");

  const [userGrowth, revenue, projectGrowth, usersByRole, projectsByStatus, invoicesByStatus, subsByPlan] =
    await Promise.all([
      User ? monthly(User) : [],
      Payment ? monthly(Payment, { status: { $regex: PAID } }, "amount") : [],
      Project ? monthly(Project) : [],
      User ? groupBy(User, "role") : [],
      Project ? groupBy(Project, "status") : [],
      Invoice ? groupBy(Invoice, "status") : [],
      Subscription ? groupBy(Subscription, "plan") : [],
    ]);

  res.json({
    userGrowth: fmt(userGrowth),
    revenue: fmt(revenue),
    projectGrowth: fmt(projectGrowth),
    usersByRole,
    projectsByStatus,
    invoicesByStatus,
    subsByPlan,
  });
});

/* ---------- System Settings ---------- */

const getSettingDoc = async () => {
  const Setting = getModel("Setting");
  return (await Setting.findOne()) || (await Setting.create({}));
};

export const getSettings = wrap(async (req, res) => {
  res.json(await getSettingDoc());
});

export const updateSettings = wrap(async (req, res) => {
  const doc = await getSettingDoc();
  Object.assign(doc, clean(req.body));
  await doc.save();
  res.json(doc);
});