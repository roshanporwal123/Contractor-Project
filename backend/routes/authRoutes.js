import express from "express";
import { body } from "express-validator";
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 characters"),
    body("role").isIn(["customer", "contractor"]).withMessage("Invalid role"),
  ],
  validate,
  register
);

router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  login
);

router.post("/logout", logout);
router.get("/me", protect, getMe);

router.post("/forgot-password", body("email").isEmail(), validate, forgotPassword);
router.post(
  "/reset-password/:token",
  body("password").isLength({ min: 6 }).withMessage("Password min 6 characters"),
  validate,
  resetPassword
);

// Role-based access ka example
router.get("/admin-only", protect, authorize("admin"), (req, res) =>
  res.json({ message: "Hello Admin" })
);

export default router;