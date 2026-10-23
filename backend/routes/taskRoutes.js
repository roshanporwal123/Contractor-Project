import express from "express";
import { protect } from "../middleware/auth.js";
import { taskUpload } from "../middleware/taskUpload.js";
import {
  createTask, getTasks, getTask, updateTask, updateStatus, updateProgress,
  deleteTask, addComment, deleteComment, addAttachments, deleteAttachment, getTaskStats,
} from "../controllers/taskController.js";

const router = express.Router();
router.use(protect);

router.get("/stats", getTaskStats); // must be before /:id
router.route("/").get(getTasks).post(createTask);
router.route("/:id").get(getTask).put(updateTask).delete(deleteTask);

router.patch("/:id/status", updateStatus);
router.patch("/:id/progress", updateProgress);

router.post("/:id/comments", addComment);
router.delete("/:id/comments/:commentId", deleteComment);

router.post("/:id/attachments", taskUpload.array("files", 5), addAttachments);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

export default router;