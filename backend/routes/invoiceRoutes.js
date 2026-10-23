// import express from "express";
// import { protect } from "../middleware/auth.js";
// import {
//   createInvoice, getInvoices, getInvoice, updateInvoice, deleteInvoice,
//   cancelInvoice, addPayment, getPayments, downloadInvoicePdf,
// } from "../controllers/invoiceController.js";

// const router = express.Router();
// router.use(protect);

// router.route("/").get(getInvoices).post(createInvoice);
// router.get("/:id/pdf", downloadInvoicePdf);
// router.route("/:id/payments").get(getPayments).post(addPayment);
// router.patch("/:id/cancel", cancelInvoice);
// router.route("/:id").get(getInvoice).put(updateInvoice).delete(deleteInvoice);

// export default router;

import express from "express";
import { protect } from "../middleware/auth.js";
import Company from "../models/Company.js";
import {
  createInvoice, getInvoices, getInvoice, updateInvoice, deleteInvoice,
  cancelInvoice, addPayment, getPayments, downloadInvoicePdf,
} from "../controllers/invoiceController.js";

const router = express.Router();

const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id }).select("_id");
    if (!company) {
      return res.status(400).json({ success: false, message: "Pehle company profile create karo" });
    }
    req.companyId = company._id;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.use(protect, attachCompany);

router.route("/").get(getInvoices).post(createInvoice);
router.get("/:id/pdf", downloadInvoicePdf);
router.route("/:id/payments").get(getPayments).post(addPayment);
router.patch("/:id/cancel", cancelInvoice);
router.route("/:id").get(getInvoice).put(updateInvoice).delete(deleteInvoice);

export default router;