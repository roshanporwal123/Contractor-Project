import express from "express";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import {
  getDashboard, getReports, getSettings, updateSettings,
  listResource, getResource, createResource, updateResource, deleteResource,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/dashboard", getDashboard);
router.get("/reports", getReports);
router.route("/settings").get(getSettings).put(updateSettings);

router.route("/:resource").get(listResource).post(createResource);
router.route("/:resource/:id").get(getResource).put(updateResource).delete(deleteResource);

export default router;