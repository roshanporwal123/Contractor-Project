import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Document, { DOCUMENT_CATEGORIES } from "../models/Document.js";
import { processExpiryReminders } from "../utils/documentReminders.js";

const removeFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    /* file pehle se nahi hai to ignore */
  }
};

const clean = (v) => (v === "" || v === "null" || v === "undefined" ? null : v);

// ---------- CREATE (upload) ----------
export const createDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const { title, category, description, project, contractor, invoice, estimate, expiryDate, reminderDaysBefore } =
      req.body;

    if (!title || !category) {
      await removeFile(req.file.path);
      return res.status(400).json({ message: "Title and category are required" });
    }
    if (!DOCUMENT_CATEGORIES.includes(category)) {
      await removeFile(req.file.path);
      return res.status(400).json({ message: "Invalid category" });
    }

    const doc = await Document.create({
      company: req.companyId,
      title,
      category,
      description,
      project: clean(project),
      contractor: clean(contractor),
      invoice: clean(invoice),
      estimate: clean(estimate),
      expiryDate: clean(expiryDate),
      reminderDaysBefore: reminderDaysBefore ? Number(reminderDaysBefore) : 30,
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      uploadedBy: req.user._id,
    });

    res.status(201).json({ message: "Document uploaded", document: doc });
  } catch (err) {
    if (req.file) await removeFile(req.file.path);
    res.status(500).json({ message: err.message });
  }
};

// ---------- LIST (filters + search + pagination) ----------
export const getDocuments = async (req, res) => {
  try {
    const { category, project, contractor, search, expiry, page = 1, limit = 20 } = req.query;
    const filter = { company: req.companyId };

    if (category) filter.category = category;
    if (project) filter.project = project;
    if (contractor) filter.contractor = contractor;
    if (search) filter.title = { $regex: search, $options: "i" };

    const now = new Date();
    if (expiry === "expired") {
      filter.expiryDate = { $lt: now };
    } else if (expiry === "expiring") {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      filter.expiryDate = { $gte: now, $lte: soon };
    } else if (expiry === "valid") {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      filter.$or = [{ expiryDate: null }, { expiryDate: { $gt: soon } }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate("project", "name")
        .populate("contractor", "name firstName lastName")
        .populate("uploadedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Document.countDocuments(filter),
    ]);

    res.json({
      documents,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET ONE ----------
export const getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId })
      .populate("project", "name")
      .populate("contractor", "name firstName lastName")
      .populate("uploadedBy", "name");
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- UPDATE (metadata + optional new file => version++) ----------
export const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc) {
      if (req.file) await removeFile(req.file.path);
      return res.status(404).json({ message: "Document not found" });
    }

    const fields = ["title", "category", "description", "project", "contractor", "invoice", "estimate"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) doc[f] = clean(req.body[f]);
    });

    if (req.body.category && !DOCUMENT_CATEGORIES.includes(req.body.category)) {
      if (req.file) await removeFile(req.file.path);
      return res.status(400).json({ message: "Invalid category" });
    }

    if (req.body.reminderDaysBefore) doc.reminderDaysBefore = Number(req.body.reminderDaysBefore);

    if (req.body.expiryDate !== undefined) {
      const newDate = clean(req.body.expiryDate);
      const changed = String(doc.expiryDate || "") !== String(newDate ? new Date(newDate) : "");
      doc.expiryDate = newDate;
      if (changed) doc.reminderSent = false; // nayi date => reminder dobara
    }

    if (req.file) {
      const oldPath = doc.file?.path;
      doc.file = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
      doc.version += 1;
      await removeFile(oldPath);
    }

    await doc.save();
    res.json({ message: "Document updated", document: doc });
  } catch (err) {
    if (req.file) await removeFile(req.file.path);
    res.status(500).json({ message: err.message });
  }
};

// ---------- DELETE ----------
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await removeFile(doc.file?.path);
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- DOWNLOAD ----------
export const downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc || !doc.file?.path) return res.status(404).json({ message: "Document not found" });

    const abs = path.resolve(doc.file.path);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: "File missing on server" });

    res.download(abs, doc.file.originalName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- EXPIRING / EXPIRED LIST ----------
export const getExpiringDocuments = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);

    const documents = await Document.find({
      company: req.companyId,
      expiryDate: { $ne: null, $lte: limitDate },
    })
      .populate("project", "name")
      .populate("contractor", "name firstName lastName")
      .sort({ expiryDate: 1 });

    res.json({ documents, total: documents.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- SUMMARY ----------
export const getDocumentSummary = async (req, res) => {
  try {
    const company = new mongoose.Types.ObjectId(req.companyId);
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const [byCategory, expired, expiringSoon, total] = await Promise.all([
      Document.aggregate([
        { $match: { company } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Document.countDocuments({ company, expiryDate: { $lt: now } }),
      Document.countDocuments({ company, expiryDate: { $gte: now, $lte: soon } }),
      Document.countDocuments({ company }),
    ]);

    res.json({
      total,
      expired,
      expiringSoon,
      byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- MANUAL REMINDER TRIGGER (testing ke liye) ----------
export const runRemindersNow = async (req, res) => {
  try {
    const sent = await processExpiryReminders();
    res.json({ message: `Reminders sent: ${sent}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};