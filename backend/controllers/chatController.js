import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import sendEmail from "../utils/sendEmail.js";
import { getIO, isOnline, joinParticipants } from "../socket/socket.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// helper: user conversation ka participant hai ya nahi
const getMyConversation = async (conversationId, userId) => {
  if (!isValidId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, participants: userId });
};

// ---------- USERS (chat start karne ke liye) ----------
// GET /api/chat/users?search=ram
export const searchUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const filter = { _id: { $ne: req.user._id } };
    if (search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }
    const users = await User.find(filter)
      .select("name email role")
      .limit(20);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- CONVERSATIONS ----------
// POST /api/chat/conversations
// body: { type: "direct"|"project"|"internal", participantIds: [], projectId?, name? }
export const createConversation = async (req, res) => {
  try {
    const { type, participantIds = [], projectId, name } = req.body;

    if (!["direct", "project", "internal"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid chat type" });
    }

    const ids = [
      ...new Set([String(req.user._id), ...participantIds.map(String)]),
    ].filter(isValidId);

    // Company (agar user company owner hai)
    const company = await Company.findOne({ owner: req.user._id }).select("_id");

    // ---- Direct (Customer <-> Contractor) ----
    if (type === "direct") {
      if (ids.length !== 2) {
        return res
          .status(400)
          .json({ success: false, message: "Direct chat me sirf 2 users hote hain" });
      }
      let existing = await Conversation.findOne({
        type: "direct",
        participants: { $all: ids, $size: 2 },
      }).populate("participants", "name email role");

      if (existing) return res.json({ success: true, conversation: existing });
    }

    // ---- Project chat ----
    if (type === "project") {
      if (!projectId || !isValidId(projectId)) {
        return res
          .status(400)
          .json({ success: false, message: "Valid projectId required" });
      }
      let existing = await Conversation.findOne({ type: "project", project: projectId });
      if (existing) {
        // naye members add karo
        ids.forEach((id) => {
          if (!existing.participants.map(String).includes(id))
            existing.participants.push(id);
        });
        await existing.save();
        joinParticipants(existing);
        existing = await existing.populate("participants", "name email role");
        return res.json({ success: true, conversation: existing });
      }
    }

    // ---- Internal ----
    if (type === "internal" && ids.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: "Internal chat me kam se kam 2 members chahiye" });
    }

    const conversation = await Conversation.create({
      type,
      name: name || undefined,
      company: company?._id,
      project: type === "project" ? projectId : undefined,
      participants: ids,
      createdBy: req.user._id,
    });

    joinParticipants(conversation);

    const populated = await conversation.populate("participants", "name email role");

    // dusre participants ko real-time batao
    const io = getIO();
    if (io) {
      ids
        .filter((id) => id !== String(req.user._id))
        .forEach((id) => io.to(`user:${id}`).emit("conversation:new", populated));
    }

    res.status(201).json({ success: true, conversation: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/conversations
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name email role")
      .populate("project", "name")
      .sort({ lastMessageAt: -1 })
      .lean();

    // unread count har conversation ka
    const withUnread = await Promise.all(
      conversations.map(async (c) => {
        const unread = await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });
        return { ...c, unread };
      })
    );

    res.json({ success: true, conversations: withUnread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- MESSAGES ----------
// GET /api/chat/conversations/:id/messages?before=<ISO date>&limit=30
export const getMessages = async (req, res) => {
  try {
    const conv = await getMyConversation(req.params.id, req.user._id);
    if (!conv)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const filter = { conversation: conv._id };
    if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

    const messages = await Message.find(filter)
      .populate("sender", "name role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/chat/conversations/:id/messages  (multipart: text, files[])
export const sendMessage = async (req, res) => {
  try {
    const conv = await getMyConversation(req.params.id, req.user._id);
    if (!conv)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    const text = (req.body.text || "").trim();
    const attachments = (req.files || []).map((f) => ({
      url: `/uploads/chat/${f.filename}`,
      name: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));

    if (!text && attachments.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Message ya file required hai" });
    }

    const message = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      text,
      attachments,
      readBy: [req.user._id],
    });

    conv.lastMessage = {
      text: text || `📎 ${attachments.length} file(s)`,
      sender: req.user._id,
      createdAt: message.createdAt,
    };
    conv.lastMessageAt = message.createdAt;
    await conv.save();

    const populated = await message.populate("sender", "name role");

    // Real-time emit
    const io = getIO();
    if (io) io.to(`conv:${conv._id}`).emit("message:new", populated);

    // Email notification: jo participants offline hain
    notifyOfflineParticipants(conv, req.user, text, attachments.length).catch((e) =>
      console.error("Chat email error:", e.message)
    );

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/chat/conversations/:id/read
export const markAsRead = async (req, res) => {
  try {
    const conv = await getMyConversation(req.params.id, req.user._id);
    if (!conv)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    await Message.updateMany(
      { conversation: conv._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    const io = getIO();
    if (io)
      io.to(`conv:${conv._id}`).emit("messages:read", {
        conversationId: conv._id,
        userId: req.user._id,
      });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- FILE SHARING ----------
// GET /api/chat/conversations/:id/files
export const getSharedFiles = async (req, res) => {
  try {
    const conv = await getMyConversation(req.params.id, req.user._id);
    if (!conv)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    const msgs = await Message.find({
      conversation: conv._id,
      "attachments.0": { $exists: true },
    })
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .lean();

    const files = msgs.flatMap((m) =>
      m.attachments.map((a) => ({
        ...a,
        sentBy: m.sender?.name,
        sentAt: m.createdAt,
      }))
    );

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- COMMENTS (project / task) ----------
// GET /api/chat/comments/:parentType/:parentId
export const getComments = async (req, res) => {
  try {
    const { parentType, parentId } = req.params;
    if (!["project", "task"].includes(parentType) || !isValidId(parentId)) {
      return res.status(400).json({ success: false, message: "Invalid params" });
    }
    const comments = await Comment.find({ parentType, parentId })
      .populate("author", "name role")
      .sort({ createdAt: 1 });
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/chat/comments/:parentType/:parentId   body: { text }
export const addComment = async (req, res) => {
  try {
    const { parentType, parentId } = req.params;
    const { text } = req.body;
    if (!["project", "task"].includes(parentType) || !isValidId(parentId)) {
      return res.status(400).json({ success: false, message: "Invalid params" });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text required" });
    }
    const comment = await Comment.create({
      parentType,
      parentId,
      author: req.user._id,
      text: text.trim(),
    });
    const populated = await comment.populate("author", "name role");
    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/chat/comments/:commentId
export const deleteComment = async (req, res) => {
  try {
    if (!isValidId(req.params.commentId))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const comment = await Comment.findById(req.params.commentId);
    if (!comment)
      return res.status(404).json({ success: false, message: "Comment not found" });

    const isOwner = String(comment.author) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    await comment.deleteOne();
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- EMAIL NOTIFICATION HELPER ----------
async function notifyOfflineParticipants(conv, sender, text, fileCount) {
  const offlineIds = conv.participants
    .map(String)
    .filter((id) => id !== String(sender._id) && !isOnline(id));
  if (offlineIds.length === 0) return;

  const users = await User.find({ _id: { $in: offlineIds } }).select("name email");
  const preview = text ? text.slice(0, 200) : `${fileCount} file(s) bheji gayi hain`;

  await Promise.all(
    users.map((u) =>
      sendEmail({
        to: u.email,
        subject: `Naya message from ${sender.name}`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <p>Hi ${u.name},</p>
            <p><b>${sender.name}</b> ne aapko message bheja:</p>
            <blockquote style="border-left:3px solid #4f46e5;padding-left:10px;color:#444">
              ${preview.replace(/</g, "&lt;")}
            </blockquote>
            <p><a href="${process.env.CLIENT_URL}/chat">Chat kholo</a></p>
          </div>`,
      }).catch(() => null)
    )
  );
}