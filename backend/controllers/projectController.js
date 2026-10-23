import fs from "fs";
import path from "path";
import Project from "../models/Project.js";

// Company ya user ke hisaab se scope filter
const scope = (req) =>
  req.user.company ? { company: req.user.company } : { createdBy: req.user._id };

// POST /api/projects
export const createProject = async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      company: req.user.company,
      createdBy: req.user._id,
    });
    const project1 = await Project.create({ ...req.body, company: company._id });

  await notifyMany(
  (project.assignedContractors || []).map((c) => c.user || c), // contractor ka user id
  {
    type: "new_project",
    title: "New project assigned",
    message: `You have been added to "${project.name}".`,
    link: `/projects/${project._id}`,
    data: { refId: String(project._id) },
  }
);
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects?status=&search=&page=&limit=
export const getProjects = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = { ...scope(req) };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "client.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("contractors", "name email status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query),
    ]);

    res.json({
      success: true,
      projects,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/:id
export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ...scope(req),
    }).populate("contractors", "name email phone status");
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    // protected fields
    delete req.body.company;
    delete req.body.createdBy;
    delete req.body.documents;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      req.body,
      { new: true, runValidators: true }
    ).populate("contractors", "name email phone status");
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      ...scope(req),
    });
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    // uploaded files bhi delete
    project.documents.forEach((d) => {
      const p = path.join(process.cwd(), d.url);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/projects/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === "completed") update.progress = 100;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      update,
      { new: true, runValidators: true }
    );
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/projects/:id/progress
export const updateProgress = async (req, res) => {
  try {
    const progress = Number(req.body.progress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100)
      return res
        .status(400)
        .json({ success: false, message: "Progress must be 0-100" });

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      { progress },
      { new: true }
    );
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/projects/:id/contractors  { contractorIds: [] }
export const assignContractors = async (req, res) => {
  try {
    const { contractorIds } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      { $addToSet: { contractors: { $each: contractorIds || [] } } },
      { new: true }
    ).populate("contractors", "name email phone status");
    await notifyUser({
    recipient: contractor.user,
    type: "new_project",
    title: "You were added to a project",
    message: `You have been assigned to "${project.name}".`,
    link: `/projects/${project._id}`,
    data: { refId: String(project._id) },
    });
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id/contractors/:contractorId
export const removeContractor = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      { $pull: { contractors: req.params.contractorId } },
      { new: true }
    ).populate("contractors", "name email phone status");
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/projects/:id/documents  (multipart, field: files)
export const uploadDocuments = async (req, res) => {
  try {
    if (!req.files || !req.files.length)
      return res.status(400).json({ success: false, message: "No files uploaded" });

    const docs = req.files.map((f) => ({
      name: f.originalname,
      url: `/uploads/projects/${f.filename}`,
    }));

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      { $push: { documents: { $each: docs } } },
      { new: true }
    );
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id/documents/:docId
export const deleteDocument = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ...scope(req),
    });
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    const doc = project.documents.id(req.params.docId);
    if (!doc)
      return res.status(404).json({ success: false, message: "Document not found" });

    const p = path.join(process.cwd(), doc.url);
    if (fs.existsSync(p)) fs.unlinkSync(p);

    doc.deleteOne();
    await project.save();
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/stats  (dashboard ke liye)
export const getProjectStats = async (req, res) => {
  try {
    const match = scope(req);
    const stats = await Project.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          budget: { $sum: "$budget" },
        },
      },
    ]);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};