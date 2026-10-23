import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  clockIn,
  clockOut,
  getRunning,
  addManualEntry,
  getEntries,
  updateEntry,
  deleteEntry,
  approveEntry,
  rejectEntry,
  getTimesheet,
} from "../controllers/timeController.js";

const router = express.Router();

router.use(protect);

router.post("/clock-in", authorize("contractor"), clockIn);
router.post("/clock-out", authorize("contractor"), clockOut);
router.get("/running", authorize("contractor"), getRunning);
router.post("/manual", authorize("contractor"), addManualEntry);

router.get("/timesheet", getTimesheet);
router.get("/", getEntries);

router.put("/:id", authorize("contractor"), updateEntry);
router.delete("/:id", deleteEntry);

router.put("/:id/approve", authorize("company", "admin"), approveEntry);
router.put("/:id/reject", authorize("company", "admin"), rejectEntry);

export default router;