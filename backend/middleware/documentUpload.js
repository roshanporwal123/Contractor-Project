import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// const UPLOAD_DIR = "uploads/documents";
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const UPLOAD_DIR = process.env.VERCEL ? "/tmp/documents" : "uploads/documents";
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  console.log("mkdir skipped:", e.message);
}

const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx", ".txt"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const uploadDocumentFile = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
};