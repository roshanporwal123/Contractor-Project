import express from "express";
import { protect } from "../middleware/auth.js";
import attachCompany from "../middleware/attachCompany.js";
import {
  createPayout, getPayouts, getPayoutSummary, updatePayout, markPaid, cancelPayout,
} from "../controllers/payoutController.js";

const router = express.Router();
router.use(protect, attachCompany);

router.route("/").get(getPayouts).post(createPayout);
router.get("/summary", getPayoutSummary);
router.route("/:id").put(updatePayout);
router.patch("/:id/pay", markPaid);
router.patch("/:id/cancel", cancelPayout);

export default router;