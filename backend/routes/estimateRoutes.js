import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createEstimate, getEstimates, getEstimate, updateEstimate, deleteEstimate,
  downloadPdf, sendEstimate, getPublicEstimate, respondToEstimate,
} from "../controllers/estimateController.js";

const router = express.Router();

// Public (client) — protect se PEHLE
router.get("/public/:token", getPublicEstimate);
router.post("/public/:token/respond", respondToEstimate);

// Private
router.use(protect, authorize("contractor", "admin"));

router.route("/").post(createEstimate).get(getEstimates);
router.route("/:id").get(getEstimate).put(updateEstimate).delete(deleteEstimate);
router.get("/:id/pdf", downloadPdf);
router.post("/:id/send", sendEstimate);

export default router;