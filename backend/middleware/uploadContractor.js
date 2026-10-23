import multer from "multer";
import path from "path";
import fs from "fs";

// const dir = "uploads/contractors";
// fs.mkdirSync(dir, { recursive: true });
const dir = process.env.VERCEL ? "/tmp/contractors" : "uploads/contractors";
try {
  fs.mkdirSync(dir, { recursive: true });
} catch (e) {
  console.log("mkdir skipped:", e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only PDF, image, DOC files allowed"));
};

export const uploadContractorDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});