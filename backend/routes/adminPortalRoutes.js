import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getAdminDashboard } from "../controllers/adminPortalController.js";

const router = express.Router();

router.get("/dashboard", protect, authorize("admin"), getAdminDashboard);

export default router;