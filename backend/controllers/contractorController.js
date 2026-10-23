import fs from "fs";
import path from "path";
import Contractor from "../models/Contractor.js";

const removeFile = (url) => {
  const p = path.join(process.cwd(), url);
  if (fs.existsSync(p)) fs.unlinkSync(p);
};

// POST /api/contractors
export const createContractor = async (req, res) => {
  try {
    const { company, documents, ...data } = req.body;

    const exists = await Contractor.findOne({
      company: req.companyId,
      email: data.email?.toLowerCase(),
    });
    if (exists) {
      return res.status(400).json({ message: "Contractor with this email already exists" });
    }

    const contractor = await Contractor.create({ ...data, company: req.companyId });
    res.status(201).json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/contractors?search=&status=&skill=&page=&limit=
export const getContractors = async (req, res) => {
  try {
    const { search, status, skill, page = 1, limit = 10 } = req.query;
    const filter = { company: req.companyId };

    if (status) filter.status = status;
    if (skill) filter.skills = { $regex: skill, $options: "i" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [contractors, total] = await Promise.all([
      Contractor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Contractor.countDocuments(filter),
    ]);

    res.json({
      contractors,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/contractors/:id
export const getContractor = async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ _id: req.params.id, company: req.companyId });
    if (!contractor) return res.status(404).json({ message: "Contractor not found" });
    res.json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/contractors/:id
export const updateContractor = async (req, res) => {
  try {
    const { company, documents, ...data } = req.body;
    const contractor = await Contractor.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    );
    if (!contractor) return res.status(404).json({ message: "Contractor not found" });
    res.json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/contractors/:id/status
export const updateContractorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Active", "Inactive", "Pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const contractor = await Contractor.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status },
      { new: true }
    );
    if (!contractor) return res.status(404).json({ message: "Contractor not found" });
    res.json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/contractors/:id
export const deleteContractor = async (req, res) => {
  try {
    const contractor = await Contractor.findOneAndDelete({
      _id: req.params.id,
      company: req.companyId,
    });
    if (!contractor) return res.status(404).json({ message: "Contractor not found" });
    contractor.documents.forEach((d) => removeFile(d.url));
    res.json({ message: "Contractor deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/contractors/:id/documents
export const uploadDocuments = async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });

    const contractor = await Contractor.findOne({ _id: req.params.id, company: req.companyId });
    if (!contractor) {
      req.files.forEach((f) => removeFile(`/uploads/contractors/${f.filename}`));
      return res.status(404).json({ message: "Contractor not found" });
    }

    const type = req.body.type || "other";
    req.files.forEach((f) => {
      contractor.documents.push({
        name: f.originalname,
        type,
        url: `/uploads/contractors/${f.filename}`,
      });
    });
    await contractor.save();
    res.status(201).json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/contractors/:id/documents/:docId
export const deleteDocument = async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ _id: req.params.id, company: req.companyId });
    if (!contractor) return res.status(404).json({ message: "Contractor not found" });

    const doc = contractor.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    removeFile(doc.url);
    doc.deleteOne();
    await contractor.save();
    res.json(contractor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};