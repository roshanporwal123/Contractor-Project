import multer from "multer";
import path from "path";
import fs from "fs";

const makeUploader = (folder, allowed) => {
  // const dir = path.join("uploads", folder);
  // fs.mkdirSync(dir, { recursive: true });
  const dir = process.env.VERCEL
  ? path.join("/tmp", folder)
  : path.join("uploads", folder);
  try {
  fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
  console.log("mkdir skipped:", e.message);
  }
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
      allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error("File type not allowed")),
  });
};

export const uploadLogo = makeUploader("logos", [
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const uploadDoc = makeUploader("company-docs", [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);