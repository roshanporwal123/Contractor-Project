import Payout from "../models/Payout.js";

const ALLOWED = ["contractor", "project", "amount", "method", "periodStart", "periodEnd", "note"];
const pick = (body) =>
  ALLOWED.reduce((o, k) => (body[k] !== undefined && body[k] !== "" ? { ...o, [k]: body[k] } : o), {});

const findOwn = (req) => Payout.findOne({ _id: req.params.id, company: req.companyId });

/* POST /api/payouts */
export const createPayout = async (req, res) => {
  try {
    const payout = await Payout.create({ ...pick(req.body), company: req.companyId, createdBy: req.user._id });
    res.status(201).json({ success: true, payout });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* GET /api/payouts?status=&contractor=&page=&limit= */
export const getPayouts = async (req, res) => {
  try {
    const { status, contractor, page = 1, limit = 10 } = req.query;
    const filter = { company: req.companyId };
    if (status) filter.status = status;
    if (contractor) filter.contractor = contractor;

    const skip = (Number(page) - 1) * Number(limit);
    const [payouts, total, agg] = await Promise.all([
      Payout.find(filter)
        .populate("contractor")
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payout.countDocuments(filter),
      Payout.aggregate([
        { $match: { company: req.companyId, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      payouts,
      summary: agg[0] || { pending: 0, paid: 0 },
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payouts/summary  -> contractor wise pending / paid */
export const getPayoutSummary = async (req, res) => {
  try {
    const rows = await Payout.aggregate([
      { $match: { company: req.companyId, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$contractor",
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);
    const data = await Payout.populate(
      rows.map((r) => ({ contractor: r._id, pending: r.pending, paid: r.paid, count: r.count })),
      { path: "contractor" }
    );
    res.json({ success: true, summary: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/payouts/:id  (sirf pending) */
export const updatePayout = async (req, res) => {
  try {
    const payout = await findOwn(req);
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found" });
    if (payout.status !== "pending")
      return res.status(400).json({ success: false, message: "Sirf pending payout edit ho sakta hai" });
    Object.assign(payout, pick(req.body));
    await payout.save();
    res.json({ success: true, payout });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* PATCH /api/payouts/:id/pay   body: { method, reference, note } */
export const markPaid = async (req, res) => {
  try {
    const payout = await findOwn(req);
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found" });
    if (payout.status !== "pending")
      return res.status(400).json({ success: false, message: `Payout pehle se ${payout.status} hai` });

    if (req.body.method) payout.method = req.body.method;
    if (req.body.reference) payout.reference = req.body.reference;
    if (req.body.note) payout.note = req.body.note;
    payout.status = "paid";
    payout.paidAt = new Date();
    await payout.save();
    res.json({ success: true, payout });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* PATCH /api/payouts/:id/cancel */
export const cancelPayout = async (req, res) => {
  try {
    const payout = await findOwn(req);
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found" });
    if (payout.status !== "pending")
      return res.status(400).json({ success: false, message: "Sirf pending payout cancel ho sakta hai" });
    payout.status = "cancelled";
    await payout.save();
    res.json({ success: true, payout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};