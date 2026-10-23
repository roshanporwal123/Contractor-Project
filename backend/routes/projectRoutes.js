import express from "express";
import { protect } from "../middleware/auth.js";
import { uploadProject } from "../middleware/uploadProject.js";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  updateStatus,
  updateProgress,
  assignContractors,
  removeContractor,
  uploadDocuments,
  deleteDocument,
  getProjectStats,
} from "../controllers/projectController.js";

const router = express.Router();

router.use(protect);

router.get("/stats", getProjectStats); // :id se pehle rakhna zaroori hai

router.route("/").post(createProject).get(getProjects);
router.route("/:id").get(getProject).put(updateProject).delete(deleteProject);

router.patch("/:id/status", updateStatus);
router.patch("/:id/progress", updateProgress);

router.post("/:id/contractors", assignContractors);
router.delete("/:id/contractors/:contractorId", removeContractor);

router.post("/:id/documents", uploadProject.array("files", 5), uploadDocuments);
router.delete("/:id/documents/:docId", deleteDocument);

export default router;