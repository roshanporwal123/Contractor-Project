import Invoice, { generateInvoiceNumber } from "../models/Invoice.js";
import { buildInvoicePdf } from "../utils/invoicePdf.js";

const ALLOWED = [
  "project", "client", "issueDate", "dueDate", "laborItems", "materialItems",
  "taxRate", "discountType", "discountValue", "notes",
];

const pick = (body) =>
  ALLOWED.reduce((o, k) => (body[k] !== undefined ? { ...o, [k]: body[k] } : o), {});

const markOverdue = (company) =>
  Invoice.updateMany(
    { company, status: { $in: ["unpaid", "partial"] }, dueDate: { $lt: new Date() }, balanceDue: { $gt: 0 } },
    { $set: { status: "overdue" } }
  );

const findOwn = (req) =>
  Invoice.findOne({ _id: req.params.id, company: req.companyId });

/* POST /api/invoices */
export const createInvoice = async (req, res) => {
  try {
    const invoiceNumber = await generateInvoiceNumber(req.companyId);
    const invoice = await Invoice.create({
      ...pick(req.body),
      company: req.companyId,
      createdBy: req.user._id,
      invoiceNumber,
    });
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices?status=&project=&search=&page=&limit= */
export const getInvoices = async (req, res) => {
  try {
    const company = req.companyId;
    await markOverdue(company);

    const { status, project, search, page = 1, limit = 10 } = req.query;
    const filter = { company };
    if (status) filter.status = status;
    if (project) filter.project = project;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { "client.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total, agg] = await Promise.all([
      Invoice.find(filter)
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: { company, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: "$total" },
            totalPaid: { $sum: "$amountPaid" },
            outstanding: { $sum: "$balanceDue" },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      invoices,
      summary: agg[0] || { totalBilled: 0, totalPaid: 0, outstanding: 0 },
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices/:id */
export const getInvoice = async (req, res) => {
  try {
    await markOverdue(req.companyId);
    const invoice = await findOwn(req).populate("project", "name");
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/invoices/:id  (sirf jab koi payment na ho) */
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await findOwn(req);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "cancelled")
      return res.status(400).json({ success: false, message: "Cancelled invoice edit nahi ho sakta" });
    if (invoice.payments.length)
      return res.status(400).json({ success: false, message: "Payment hone ke baad invoice edit nahi ho sakta" });

    Object.assign(invoice, pick(req.body));
    await invoice.save();
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* DELETE /api/invoices/:id */
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await findOwn(req);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.payments.length)
      return res.status(400).json({ success: false, message: "Payment wala invoice delete nahi hota, cancel karo" });
    await invoice.deleteOne();
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PATCH /api/invoices/:id/cancel */
export const cancelInvoice = async (req, res) => {
  try {
    const invoice = await findOwn(req);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "paid")
      return res.status(400).json({ success: false, message: "Paid invoice cancel nahi hota" });
    invoice.status = "cancelled";
    await invoice.save();
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/invoices/:id/payments */
export const addPayment = async (req, res) => {
  try {
    const invoice = await findOwn(req);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "cancelled")
      return res.status(400).json({ success: false, message: "Cancelled invoice par payment nahi ho sakti" });

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount daalo" });
    if (amount > invoice.balanceDue)
      return res.status(400).json({
        success: false,
        message: `Amount balance due ($${invoice.balanceDue}) se zyada nahi ho sakta`,
      });

    invoice.payments.push({
      amount,
      method: req.body.method,
      date: req.body.date || new Date(),
      reference: req.body.reference,
      note: req.body.note,
      recordedBy: req.user._id,
    });
    await invoice.save();
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices/:id/payments */
export const getPayments = async (req, res) => {
  try {
    const invoice = await findOwn(req).select("invoiceNumber total amountPaid balanceDue payments");
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, payments: invoice.payments, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices/:id/pdf */
export const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await findOwn(req).populate("company").populate("project", "name");
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${invoice.invoiceNumber}.pdf`);
    buildInvoicePdf(invoice, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};