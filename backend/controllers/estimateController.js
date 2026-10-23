// import Estimate from "../models/Estimate.js";
// import Project from "../models/Project.js";
// import sendEmail from "../utils/sendEmail.js";
// import { buildEstimatePdf } from "../utils/estimatePdf.js";

// const nextNumber = async (company) => {
//   const year = new Date().getFullYear();
//   const count = await Estimate.countDocuments({ company });
//   return `EST-${year}-${String(count + 1).padStart(4, "0")}`;
// };

// const ownEstimate = (req) => ({ _id: req.params.id, company: req.user.company });

// // POST /api/estimates
// export const createEstimate = async (req, res) => {
//   try {
//     const { project } = req.body;
//     if (project) {
//       const p = await Project.findOne({ _id: project, company: req.user.company });
//       if (!p) return res.status(404).json({ message: "Project not found" });
//     }
//     const estimate = await Estimate.create({
//       ...req.body,
//       status: "draft",
//       company: req.user.company,
//       createdBy: req.user._id,
//       estimateNumber: await nextNumber(req.user.company),
//     });
//     res.status(201).json(estimate);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// // GET /api/estimates?status=&project=&search=
// export const getEstimates = async (req, res) => {
//   try {
//     const { status, project, search } = req.query;
//     const q = { company: req.user.company };
//     if (status) q.status = status;
//     if (project) q.project = project;
//     if (search)
//       q.$or = [
//         { title: new RegExp(search, "i") },
//         { estimateNumber: new RegExp(search, "i") },
//         { "client.name": new RegExp(search, "i") },
//       ];
//     const estimates = await Estimate.find(q).populate("project", "name").sort("-createdAt");
//     res.json(estimates);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET /api/estimates/:id
// export const getEstimate = async (req, res) => {
//   const estimate = await Estimate.findOne(ownEstimate(req)).populate("project", "name");
//   if (!estimate) return res.status(404).json({ message: "Estimate not found" });
//   res.json(estimate);
// };

// // PUT /api/estimates/:id  (sirf draft edit hoga)
// export const updateEstimate = async (req, res) => {
//   try {
//     const estimate = await Estimate.findOne(ownEstimate(req));
//     if (!estimate) return res.status(404).json({ message: "Estimate not found" });
//     if (estimate.status !== "draft")
//       return res.status(400).json({ message: "Only draft estimates can be edited" });

//     const allowed = [
//       "title", "project", "client", "laborItems", "materialItems", "additionalExpenses",
//       "taxRate", "discountType", "discountValue", "validUntil", "notes",
//     ];
//     allowed.forEach((k) => {
//       if (req.body[k] !== undefined) estimate[k] = req.body[k];
//     });
//     await estimate.save();
//     res.json(estimate);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// // DELETE /api/estimates/:id
// export const deleteEstimate = async (req, res) => {
//   const estimate = await Estimate.findOne(ownEstimate(req));
//   if (!estimate) return res.status(404).json({ message: "Estimate not found" });
//   if (estimate.status === "accepted")
//     return res.status(400).json({ message: "Accepted estimate cannot be deleted" });
//   await estimate.deleteOne();
//   res.json({ message: "Estimate deleted" });
// };

// // GET /api/estimates/:id/pdf
// export const downloadPdf = async (req, res) => {
//   const estimate = await Estimate.findOne(ownEstimate(req));
//   if (!estimate) return res.status(404).json({ message: "Estimate not found" });
//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader("Content-Disposition", `attachment; filename=${estimate.estimateNumber}.pdf`);
//   const doc = buildEstimatePdf(estimate, req.user.companyName || "Company");
//   doc.pipe(res);
//   doc.end();
// };

// // POST /api/estimates/:id/send
// export const sendEstimate = async (req, res) => {
//   try {
//     const estimate = await Estimate.findOne(ownEstimate(req));
//     if (!estimate) return res.status(404).json({ message: "Estimate not found" });
//     if (estimate.status === "accepted")
//       return res.status(400).json({ message: "Estimate already accepted" });
//     if (!estimate.laborItems.length && !estimate.materialItems.length && !estimate.additionalExpenses.length)
//       return res.status(400).json({ message: "Add at least one item before sending" });

//     const link = `${process.env.CLIENT_URL}/estimate/${estimate.publicToken}`;
//     await sendEmail({
//       to: estimate.client.email,
//       subject: `Estimate ${estimate.estimateNumber} - ${estimate.title}`,
//       html: `
//         <p>Hello ${estimate.client.name},</p>
//         <p>Aapke liye estimate <b>${estimate.estimateNumber}</b> ready hai. Total: <b>$${estimate.total.toFixed(2)}</b></p>
//         <p><a href="${link}">Estimate dekhein aur Accept / Reject karein</a></p>
//       `,
//     });

//     estimate.status = "sent";
//     estimate.sentAt = new Date();
//     await estimate.save();
//     res.json({ message: "Estimate sent to client", estimate });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- PUBLIC (client, no login) ----------

// // GET /api/estimates/public/:token
// export const getPublicEstimate = async (req, res) => {
//   const estimate = await Estimate.findOne({ publicToken: req.params.token })
//     .select("-publicToken -createdBy")
//     .populate("project", "name");
//   if (!estimate || estimate.status === "draft")
//     return res.status(404).json({ message: "Estimate not found" });

//   if (estimate.status === "sent" && estimate.validUntil && estimate.validUntil < new Date()) {
//     estimate.status = "expired";
//     await estimate.save();
//   }
//   res.json(estimate);
// };

// // POST /api/estimates/public/:token/respond   body: { action: "accept" | "reject", reason }
// export const respondToEstimate = async (req, res) => {
//   const { action, reason } = req.body;
//   if (!["accept", "reject"].includes(action))
//     return res.status(400).json({ message: "Invalid action" });

//   const estimate = await Estimate.findOne({ publicToken: req.params.token });
//   if (!estimate || estimate.status === "draft")
//     return res.status(404).json({ message: "Estimate not found" });
//   if (estimate.status !== "sent")
//     return res.status(400).json({ message: `Estimate already ${estimate.status}` });
//   if (estimate.validUntil && estimate.validUntil < new Date())
//     return res.status(400).json({ message: "Estimate has expired" });

//   estimate.status = action === "accept" ? "accepted" : "rejected";
//   estimate.respondedAt = new Date();
//   if (action === "reject") estimate.rejectionReason = reason || "";
//   await estimate.save();
//   res.json({ message: `Estimate ${estimate.status}`, status: estimate.status });
// };

import Estimate from "../models/Estimate.js";
import Project from "../models/Project.js";
import sendEmail from "../utils/sendEmail.js";
import { buildEstimatePdf } from "../utils/estimatePdf.js";

// Company module aane tak user ka _id use hoga
const getCompany = (req) => req.user.company || req.user._id;

const nextNumber = async (company) => {
  const year = new Date().getFullYear();
  const count = await Estimate.countDocuments({ company });
  return `EST-${year}-${String(count + 1).padStart(4, "0")}`;
};

const ownEstimate = (req) => ({ _id: req.params.id, company: getCompany(req) });

// POST /api/estimates
export const createEstimate = async (req, res) => {
  try {
    const { project } = req.body;
    if (project) {
      const p = await Project.findOne({ _id: project, company: getCompany(req) });
      if (!p) return res.status(404).json({ message: "Project not found" });
    }
    const estimate = await Estimate.create({
      ...req.body,
      status: "draft",
      company: getCompany(req),
      createdBy: req.user._id,
      estimateNumber: await nextNumber(getCompany(req)),
    });
    res.status(201).json(estimate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/estimates?status=&project=&search=
export const getEstimates = async (req, res) => {
  try {
    const { status, project, search } = req.query;
    const q = { company: getCompany(req) };
    if (status) q.status = status;
    if (project) q.project = project;
    if (search)
      q.$or = [
        { title: new RegExp(search, "i") },
        { estimateNumber: new RegExp(search, "i") },
        { "client.name": new RegExp(search, "i") },
      ];
    const estimates = await Estimate.find(q).populate("project", "name").sort("-createdAt");
    res.json(estimates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/estimates/:id
export const getEstimate = async (req, res) => {
  const estimate = await Estimate.findOne(ownEstimate(req)).populate("project", "name");
  if (!estimate) return res.status(404).json({ message: "Estimate not found" });
  res.json(estimate);
};

// PUT /api/estimates/:id  (sirf draft edit hoga)
export const updateEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne(ownEstimate(req));
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    if (estimate.status !== "draft")
      return res.status(400).json({ message: "Only draft estimates can be edited" });

    const allowed = [
      "title", "project", "client", "laborItems", "materialItems", "additionalExpenses",
      "taxRate", "discountType", "discountValue", "validUntil", "notes",
    ];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) estimate[k] = req.body[k];
    });
    await estimate.save();
    res.json(estimate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/estimates/:id
export const deleteEstimate = async (req, res) => {
  const estimate = await Estimate.findOne(ownEstimate(req));
  if (!estimate) return res.status(404).json({ message: "Estimate not found" });
  if (estimate.status === "accepted")
    return res.status(400).json({ message: "Accepted estimate cannot be deleted" });
  await estimate.deleteOne();
  res.json({ message: "Estimate deleted" });
};

// GET /api/estimates/:id/pdf
export const downloadPdf = async (req, res) => {
  const estimate = await Estimate.findOne(ownEstimate(req));
  if (!estimate) return res.status(404).json({ message: "Estimate not found" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${estimate.estimateNumber}.pdf`);
  const doc = buildEstimatePdf(estimate, req.user.companyName || "Company");
  doc.pipe(res);
  doc.end();
};

// POST /api/estimates/:id/send
export const sendEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne(ownEstimate(req));
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    if (estimate.status === "accepted")
      return res.status(400).json({ message: "Estimate already accepted" });
    if (!estimate.laborItems.length && !estimate.materialItems.length && !estimate.additionalExpenses.length)
      return res.status(400).json({ message: "Add at least one item before sending" });

    const link = `${process.env.CLIENT_URL}/estimate/${estimate.publicToken}`;
    await sendEmail({
      to: estimate.client.email,
      subject: `Estimate ${estimate.estimateNumber} - ${estimate.title}`,
      html: `
        <p>Hello ${estimate.client.name},</p>
        <p>Aapke liye estimate <b>${estimate.estimateNumber}</b> ready hai. Total: <b>$${estimate.total.toFixed(2)}</b></p>
        <p><a href="${link}">Estimate dekhein aur Accept / Reject karein</a></p>
      `,
    });

    estimate.status = "sent";
    estimate.sentAt = new Date();
    await estimate.save();
    res.json({ message: "Estimate sent to client", estimate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- PUBLIC (client, no login) ----------

// GET /api/estimates/public/:token
export const getPublicEstimate = async (req, res) => {
  const estimate = await Estimate.findOne({ publicToken: req.params.token })
    .select("-publicToken -createdBy")
    .populate("project", "name");
  if (!estimate || estimate.status === "draft")
    return res.status(404).json({ message: "Estimate not found" });

  if (estimate.status === "sent" && estimate.validUntil && estimate.validUntil < new Date()) {
    estimate.status = "expired";
    await estimate.save();
  }
  res.json(estimate);
};

// POST /api/estimates/public/:token/respond   body: { action: "accept" | "reject", reason }
export const respondToEstimate = async (req, res) => {
  const { action, reason } = req.body;
  if (!["accept", "reject"].includes(action))
    return res.status(400).json({ message: "Invalid action" });

  const estimate = await Estimate.findOne({ publicToken: req.params.token });
  if (!estimate || estimate.status === "draft")
    return res.status(404).json({ message: "Estimate not found" });
  if (estimate.status !== "sent")
    return res.status(400).json({ message: `Estimate already ${estimate.status}` });
  if (estimate.validUntil && estimate.validUntil < new Date())
    return res.status(400).json({ message: "Estimate has expired" });

  estimate.status = action === "accept" ? "accepted" : "rejected";
  estimate.respondedAt = new Date();
  if (action === "reject") estimate.rejectionReason = reason || "";
  await estimate.save();
  res.json({ message: `Estimate ${estimate.status}`, status: estimate.status });
};