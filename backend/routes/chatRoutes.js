import express from "express";
import { protect } from "../middleware/auth.js";
import chatUpload from "../middleware/chatUpload.js";
import {
  searchUsers,
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getSharedFiles,
  getComments,
  addComment,
  deleteComment,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(protect);

// users search
router.get("/users", searchUsers);

// conversations
router.get("/conversations", getMyConversations);
router.post("/conversations", createConversation);

// messages
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", chatUpload.array("files", 5), sendMessage);
router.put("/conversations/:id/read", markAsRead);
router.get("/conversations/:id/files", getSharedFiles);

// comments (project / task)
router.get("/comments/:parentType/:parentId", getComments);
router.post("/comments/:parentType/:parentId", addComment);
router.delete("/comments/:commentId", deleteComment);

export default router;