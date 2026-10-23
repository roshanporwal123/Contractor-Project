import multer from "multer";
import path from "path";
import fs from "fs";

// const dir = "uploads/tasks";
// fs.mkdirSync(dir, { recursive: true });
const dir = process.env.VERCEL ? "/tmp/tasks" : "uploads/tasks";
try {
  fs.mkdirSync(dir, { recursive: true });
} catch (e) {
  console.log("mkdir skipped:", e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const allowed = [
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const taskUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("File type not allowed")),
});