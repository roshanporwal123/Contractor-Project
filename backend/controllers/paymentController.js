import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import { getStripe } from "../utils/stripe.js";

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ============ STRIPE CHECKOUT ============ */

/* POST /api/payments/checkout/:invoiceId   body: { amount? } */
export const createCheckoutSession = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, company: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "cancelled" || invoice.status === "paid")
      return res.status(400).json({ success: false, message: `Invoice ${invoice.status} hai, payment nahi ho sakti` });

    const amount = req.body.amount ? round(req.body.amount) : invoice.balanceDue;
    if (!amount || amount <= 0 || amount > invoice.balanceDue)
      return res.status(400).json({ success: false, message: `Amount 0 se zyada aur $${invoice.balanceDue} se kam hona chahiye` });

    const payment = await Payment.create({
      company: req.companyId,
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      payerName: invoice.client.name,
      payerEmail: invoice.client.email,
      amount,
      createdBy: req.user._id,
    });

    const meta = {
      paymentId: payment._id.toString(),
      invoiceId: invoice._id.toString(),
      companyId: req.companyId.toString(),
    };

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: invoice.client.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice ${invoice.invoiceNumber}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: meta,
      payment_intent_data: { metadata: meta },
      success_url: `${process.env.CLIENT_URL}/invoices/${invoice._id}?payment=success&pid=${payment._id}`,
      cancel_url: `${process.env.CLIENT_URL}/invoices/${invoice._id}?payment=cancelled`,
    });

    payment.stripeSessionId = session.id;
    await payment.save();

    res.status(201).json({ success: true, url: session.url, paymentId: payment._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============ STRIPE WEBHOOK (raw body, auth nahi) ============ */

const handleCompleted = async (session) => {
  if (session.payment_status !== "paid") return;
  const payment = await Payment.findById(session.metadata?.paymentId);
  if (!payment || payment.status === "succeeded") return; // idempotent

  payment.status = "succeeded";
  payment.paidAt = new Date();
  payment.failureReason = undefined;
  payment.stripePaymentIntentId = session.payment_intent;
  await payment.save();

  const invoice = await Invoice.findById(payment.invoice);
  if (invoice) {
    invoice.payments.push({
      amount: payment.amount,
      method: "stripe",
      date: new Date(),
      reference: session.payment_intent,
      paymentId: payment._id,
    });
    await invoice.save(); // status khud paid/partial ho jayega
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const obj = event.data.object;

    if (event.type === "checkout.session.completed") {
      await handleCompleted(obj);
    } else if (event.type === "checkout.session.expired") {
      await Payment.updateOne(
        { _id: obj.metadata?.paymentId, status: "pending" },
        { status: "failed", failureReason: "Checkout session expired" }
      );
    } else if (event.type === "payment_intent.payment_failed") {
      await Payment.updateOne(
        { _id: obj.metadata?.paymentId, status: { $ne: "succeeded" } },
        { status: "failed", failureReason: obj.last_payment_error?.message || "Payment failed" }
      );
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============ PAYMENT STATUS + HISTORY ============ */

/* GET /api/payments?status=&invoice=&search=&page=&limit= */
export const getPayments = async (req, res) => {
  try {
    const { status, invoice, search, page = 1, limit = 10 } = req.query;
    const filter = { company: req.companyId };
    if (status) filter.status = status;
    if (invoice) filter.invoice = invoice;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { payerName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total, agg] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: { company: req.companyId } },
        {
          $group: {
            _id: null,
            received: {
              $sum: { $cond: [{ $in: ["$status", ["succeeded", "partially_refunded", "refunded"]] }, "$amount", 0] },
            },
            refunded: { $sum: "$refundedAmount" },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      payments,
      summary: agg[0] || { received: 0, refunded: 0, pending: 0 },
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payments/:id */
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============ REFUND WORKFLOW ============ */

/* GET /api/payments/refunds/pending */
export const getPendingRefunds = async (req, res) => {
  try {
    const payments = await Payment.find({ company: req.companyId, "refunds.status": "requested" }).sort({ updatedAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/payments/:id/refunds   body: { amount, reason } */
export const requestRefund = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (!["succeeded", "partially_refunded"].includes(payment.status))
      return res.status(400).json({ success: false, message: "Is payment par refund nahi ho sakta" });

    const amount = round(req.body.amount || 0);
    const alreadyRequested = payment.refunds
      .filter((r) => r.status === "requested")
      .reduce((s, r) => s + r.amount, 0);
    const available = round(payment.amount - payment.refundedAmount - alreadyRequested);

    if (amount <= 0 || amount > available)
      return res.status(400).json({ success: false, message: `Refund amount 0 se zyada aur $${available} se kam hona chahiye` });

    payment.refunds.push({ amount, reason: req.body.reason, requestedBy: req.user._id });
    await payment.save();
    res.status(201).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PATCH /api/payments/:id/refunds/:refundId/approve */
export const approveRefund = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const refund = payment.refunds.id(req.params.refundId);
    if (!refund) return res.status(404).json({ success: false, message: "Refund request not found" });
    if (refund.status !== "requested")
      return res.status(400).json({ success: false, message: `Refund pehle se ${refund.status} hai` });

    const available = round(payment.amount - payment.refundedAmount);
    if (refund.amount > available)
      return res.status(400).json({ success: false, message: `Sirf $${available} refund ho sakta hai` });

    // 1) Stripe par refund (fail hua to kuch change nahi hoga)
    const stripeRefund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refund.amount * 100),
      reason: "requested_by_customer",
      metadata: { paymentId: payment._id.toString(), refundId: refund._id.toString() },
    });

    // 2) Payment update
    refund.status = "processed";
    refund.stripeRefundId = stripeRefund.id;
    refund.processedBy = req.user._id;
    refund.processedAt = new Date();
    payment.refundedAmount = round(payment.refundedAmount + refund.amount);
    payment.status = payment.refundedAmount >= payment.amount ? "refunded" : "partially_refunded";
    await payment.save();

    // 3) Invoice se payment kam karo
    const invoice = await Invoice.findOne({ _id: payment.invoice, company: req.companyId });
    if (invoice) {
      const entry = invoice.payments.find((p) => String(p.paymentId) === String(payment._id));
      if (entry) {
        entry.amount = round(entry.amount - refund.amount);
        if (entry.amount <= 0.001) invoice.payments.pull(entry._id);
        await invoice.save();
      }
    }

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PATCH /api/payments/:id/refunds/:refundId/reject   body: { note } */
export const rejectRefund = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const refund = payment.refunds.id(req.params.refundId);
    if (!refund) return res.status(404).json({ success: false, message: "Refund request not found" });
    if (refund.status !== "requested")
      return res.status(400).json({ success: false, message: `Refund pehle se ${refund.status} hai` });

    refund.status = "rejected";
    refund.rejectionNote = req.body.note;
    refund.processedBy = req.user._id;
    refund.processedAt = new Date();
    await payment.save();
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/payments/:id/verify */
export const verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.status === "succeeded") return res.json({ success: true, payment });
    if (!payment.stripeSessionId)
      return res.status(400).json({ success: false, message: "Stripe session nahi bana" });

    const session = await getStripe().checkout.sessions.retrieve(payment.stripeSessionId);
    await handleCompleted(session); // sirf tab update karega jab Stripe par payment "paid" ho

    const updated = await Payment.findById(payment._id);
    res.json({ success: true, payment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};