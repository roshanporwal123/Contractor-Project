import multer from "multer";
import path from "path";
import fs from "fs";

// const dir = "uploads/projects";
// fs.mkdirSync(dir, { recursive: true });

const dir = process.env.VERCEL ? "/tmp/projects" : "uploads/projects";
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

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx|xls|xlsx|png|jpg|jpeg/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error("Unsupported file type"), ok);
};

export const uploadProject = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});