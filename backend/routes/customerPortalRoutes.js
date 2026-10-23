import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { attachCompany } from "../middleware/attachCompany.js";
import { getCustomerDashboard } from "../controllers/customerPortalController.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  authorize("customer", "admin"),
  attachCompany,
  getCustomerDashboard
);

export default router;