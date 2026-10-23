import multer from "multer";
import path from "path";
import fs from "fs";

// const dir = "uploads/chat";
const dir = process.env.VERCEL ? "/tmp/chat" : "uploads/chat";
try{
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}catch (e) {
  console.log("mkdir skipped:", e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safe = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safe}-${unique}${path.extname(file.originalname)}`);
  },
});

const allowed = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const chatUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type allowed nahi hai"));
  },
});

export default chatUpload;