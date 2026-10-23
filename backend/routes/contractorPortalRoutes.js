import express from "express";
import { protect } from "../middleware/auth.js";
import { getContractorDashboard } from "../controllers/contractorPortalController.js";

const router = express.Router();

const contractorOnly = (req, res, next) => {
  if (req.user.role !== "contractor") {
    return res.status(403).json({ message: "Sirf contractors ke liye" });
  }
  next();
};

router.get("/dashboard", protect, contractorOnly, getContractorDashboard);

export default router;