import express from "express";
import { protect } from "../middleware/auth.js";
import attachCompany from "../middleware/attachCompany.js";
import {
  createCheckoutSession, getPayments, getPayment, getPendingRefunds,
  requestRefund, approveRefund, rejectRefund,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();
router.use(protect, attachCompany);

router.get("/", getPayments);
router.get("/refunds/pending", getPendingRefunds);
router.post("/checkout/:invoiceId", createCheckoutSession);
router.get("/:id", getPayment);
router.post("/:id/verify", verifyPayment);
router.post("/:id/refunds", requestRefund);
router.patch("/:id/refunds/:refundId/approve", approveRefund);
router.patch("/:id/refunds/:refundId/reject", rejectRefund);

export default router;