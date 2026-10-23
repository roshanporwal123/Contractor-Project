import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import {
  signToken,
  setAuthCookie,
  createRandomToken,
  hashToken,
} from "../utils/token.js";

const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  isEmailVerified: u.isEmailVerified,
});

const sendVerificationEmail = async (user) => {
  const { raw, hashed } = createRandomToken();
  user.emailVerificationToken = hashed;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const link = `${process.env.CLIENT_URL}/verify-email/${raw}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hi ${user.name},</p>
           <p>Apna email verify karne ke liye niche click karo (24 hours valid):</p>
           <p><a href="${link}">${link}</a></p>`,
  });
};

// POST /api/auth/register  (customer / contractor)
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!["customer", "contractor"].includes(role)) {
      return res.status(400).json({ message: "Role must be customer or contractor" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email: normalizedEmail, password, role, phone });

    try {
      await sendVerificationEmail(user);
    } catch (mailErr) {
      console.error("Email error:", mailErr.message);
    }

    res.status(201).json({
      message: "Registered successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ message: "Email already registered" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/verify-email/:token
export const verifyEmail = async (req, res) => {
  try {
    const hashed = hashToken(req.params.token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/resend-verification
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && !user.isEmailVerified) {
      await sendVerificationEmail(user);
    }
    res.json({ message: "If the account exists, a verification email has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login  (body me optional `role` – portal ke hisaab se)
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (role && user.role !== role) {
      return res
        .status(403)
        .json({ message: `This account is not a ${role} account` });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked by admin" });
    }

    if (!user.isEmailVerified && user.role !== "admin") {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.json({ message: "Login successful", token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out" });
};

// GET /api/auth/me
export const getMe = (req, res) => {
  res.json({ user: safeUser(req.user) });
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const { raw, hashed } = createRandomToken();
      user.passwordResetToken = hashed;
      user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      const link = `${process.env.CLIENT_URL}/reset-password/${raw}`;
      await sendEmail({
        to: user.email,
        subject: "Password reset",
        html: `<p>Password reset karne ke liye click karo (15 minutes valid):</p>
               <p><a href="${link}">${link}</a></p>
               <p>Agar aapne request nahi ki, to ignore karo.</p>`,
      });
    }

    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const hashed = hashToken(req.params.token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};