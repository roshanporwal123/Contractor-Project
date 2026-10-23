import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.delete("/", clearReadNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;