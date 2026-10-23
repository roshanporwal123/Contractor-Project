import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { attachCompany } from "../middleware/attachCompany.js";
import { uploadContractorDocs } from "../middleware/uploadContractor.js";
import {
  createContractor,
  getContractors,
  getContractor,
  updateContractor,
  updateContractorStatus,
  deleteContractor,
  uploadDocuments,
  deleteDocument,
} from "../controllers/contractorController.js";

const router = express.Router();

router.use(protect, attachCompany);

// ⚠️ "company" role ka naam wahi rakho jo User.js me hai
const manage = authorize("admin", "customer");

router.route("/").get(getContractors).post(manage, createContractor);

router
  .route("/:id")
  .get(getContractor)
  .put(manage, updateContractor)
  .delete(manage, deleteContractor);

router.patch("/:id/status", manage, updateContractorStatus);

router.post("/:id/documents", manage, uploadContractorDocs.array("files", 5), uploadDocuments);
router.delete("/:id/documents/:docId", manage, deleteDocument);

export default router;