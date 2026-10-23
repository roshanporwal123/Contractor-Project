import fs from "fs";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Contractor from "../models/Contractor.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Project progress = average of its (non-cancelled) tasks' progress
const syncProjectProgress = async (projectId) => {
  try {
    const tasks = await Task.find({ project: projectId, status: { $ne: "cancelled" } }).select("progress");
    const avg = tasks.length
      ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
      : 0;
    await Project.findByIdAndUpdate(projectId, { progress: avg });
  } catch (e) {
    console.error("Project progress sync failed:", e.message);
  }
};

const populateTask = (q) =>
  q
    .populate("project", "name status")
    .populate("assignedTo", "name email phone status")
    .populate("createdBy", "name email")
    .populate("comments.user", "name email role");

// POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, priority, dueDate } = req.body;
    if (!title || !project) return res.status(400).json({ message: "Title and project are required" });
    if (!isValidId(project)) return res.status(400).json({ message: "Invalid project id" });

    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ message: "Project not found" });

    if (assignedTo) {
      if (!isValidId(assignedTo)) return res.status(400).json({ message: "Invalid contractor id" });
      const c = await Contractor.findById(assignedTo);
      if (!c) return res.status(404).json({ message: "Contractor not found" });
    }

    const task = await Task.create({
      title, description, project,
      assignedTo: assignedTo || null,
      priority, dueDate: dueDate || undefined,
      createdBy: req.user._id,
    });

    await syncProjectProgress(project);
    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ message: "Task created", task: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks?project=&assignedTo=&status=&priority=&search=&overdue=true&page=&limit=
export const getTasks = async (req, res) => {
  try {
    const { project, assignedTo, status, priority, search, overdue } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const filter = {};
    if (project && isValidId(project)) filter.project = project;
    if (assignedTo && isValidId(assignedTo)) filter.assignedTo = assignedTo;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: "i" };
    if (overdue === "true") {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $nin: ["completed", "cancelled"] };
    }

    const [tasks, total] = await Promise.all([
      populateTask(Task.find(filter).select("-comments -attachments"))
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({ tasks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks/:id
export const getTask = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const fields = ["title", "description", "assignedTo", "priority", "dueDate", "status", "progress"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) task[f] = req.body[f] === "" ? undefined : req.body[f];
    });

    await task.save();
    await syncProjectProgress(task.project);
    const populated = await populateTask(Task.findById(task._id));
    res.json({ message: "Task updated", task: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/tasks/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["todo", "in_progress", "review", "completed", "cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.status = status;
    await task.save();
    await syncProjectProgress(task.project);
    res.json({ message: "Status updated", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/tasks/:id/progress
export const updateProgress = async (req, res) => {
  try {
    const progress = Number(req.body.progress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100)
      return res.status(400).json({ message: "Progress must be 0-100" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.progress = progress;
    await task.save();
    await syncProjectProgress(task.project);
    res.json({ message: "Progress updated", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.attachments.forEach((a) => fs.existsSync(a.path) && fs.unlinkSync(a.path));
    await task.deleteOne();
    await syncProjectProgress(task.project);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks/:id/comments
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.comments.push({ user: req.user._id, text });
    await task.save();
    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ message: "Comment added", comments: populated.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id/comments/:commentId
export const deleteComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = comment.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin")
      return res.status(403).json({ message: "Not allowed" });

    comment.deleteOne();
    await task.save();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks/:id/attachments  (field: files)
export const addAttachments = async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });

    const task = await Task.findById(req.params.id);
    if (!task) {
      req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(404).json({ message: "Task not found" });
    }

    req.files.forEach((f) =>
      task.attachments.push({
        originalName: f.originalname,
        filename: f.filename,
        path: f.path,
        mimetype: f.mimetype,
        size: f.size,
        uploadedBy: req.user._id,
      })
    );
    await task.save();
    res.status(201).json({ message: "Attachments uploaded", attachments: task.attachments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id/attachments/:attachmentId
export const deleteAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const att = task.attachments.id(req.params.attachmentId);
    if (!att) return res.status(404).json({ message: "Attachment not found" });

    if (fs.existsSync(att.path)) fs.unlinkSync(att.path);
    att.deleteOne();
    await task.save();
    res.json({ message: "Attachment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks/stats?project=
export const getTaskStats = async (req, res) => {
  try {
    const match = {};
    if (req.query.project && isValidId(req.query.project))
      match.project = new mongoose.Types.ObjectId(req.query.project);

    const byStatus = await Task.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const overdue = await Task.countDocuments({
      ...match,
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    });

    const stats = { todo: 0, in_progress: 0, review: 0, completed: 0, cancelled: 0 };
    byStatus.forEach((s) => (stats[s._id] = s.count));
    res.json({ stats, overdue, total: Object.values(stats).reduce((a, b) => a + b, 0) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}