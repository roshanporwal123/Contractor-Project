import express from "express";
import { protect } from "../middleware/auth.js";
import Company from "../models/Company.js";
import { uploadDocumentFile } from "../middleware/documentUpload.js";
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getExpiringDocuments,
  getDocumentSummary,
  runRemindersNow,
} from "../controllers/documentController.js";

const router = express.Router();

// Is routes file ka apna attachCompany (jaise materialRoutes.js me hai)
const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ message: "Company profile not found" });
    req.companyId = company._id;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.use(protect, attachCompany);

// Static routes pehle, /:id baad me
router.get("/summary", getDocumentSummary);
router.get("/expiring", getExpiringDocuments);
router.post("/reminders/run", runRemindersNow);

router.route("/").get(getDocuments).post(uploadDocumentFile, createDocument);

router.get("/:id/download", downloadDocument);

router
  .route("/:id")
  .get(getDocument)
  .put(uploadDocumentFile, updateDocument)
  .delete(deleteDocument);

export default router;