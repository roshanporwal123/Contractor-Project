// import { Server } from "socket.io";
// import jwt from "jsonwebtoken";
// import { parse } from "cookie";
// import Conversation from "../models/Conversation.js";


// const parseCookies = (header = "") => {
//   const out = {};
//   header.split(";").forEach((part) => {
//     const i = part.indexOf("=");
//     if (i < 0) return;
//     const key = part.slice(0, i).trim();
//     const val = part.slice(i + 1).trim();
//     try {
//       out[key] = decodeURIComponent(val);
//     } catch {
//       out[key] = val;
//     }
//   });
//   return out;
// };

// let io;
// // userId -> number of active sockets (multiple tabs support)
// const onlineUsers = new Map();

// export const initSocket = (httpServer) => {
//   io = new Server(httpServer, {
//     cors: {
//       origin: process.env.CLIENT_URL,
//       credentials: true,
//     },
//   });

//   // Auth: cookie se JWT verify
//   io.use((socket, next) => {
//     try {
//       const cookies = parseCookies(socket.handshake.headers.cookie || "");
//       const token = cookies[process.env.COOKIE_NAME || "token"];
//       if (!token) return next(new Error("Not authenticated"));
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       socket.userId = String(decoded.id || decoded._id || decoded.userId);
//       next();
//     } catch (err) {
//       next(new Error("Invalid token"));
//     }
//   });

//   io.on("connection", async (socket) => {
//     const userId = socket.userId;

//     onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
//     socket.join(`user:${userId}`);

//     // user ki saari conversations ke rooms join karo
//     const convs = await Conversation.find({ participants: userId }).select("_id");
//     convs.forEach((c) => socket.join(`conv:${c._id}`));

//     io.emit("presence", { userId, online: true });

//     socket.on("typing", ({ conversationId, isTyping }) => {
//       socket.to(`conv:${conversationId}`).emit("typing", {
//         conversationId,
//         userId,
//         isTyping: !!isTyping,
//       });
//     });

//     socket.on("disconnect", () => {
//       const count = (onlineUsers.get(userId) || 1) - 1;
//       if (count <= 0) {
//         onlineUsers.delete(userId);
//         io.emit("presence", { userId, online: false });
//       } else {
//         onlineUsers.set(userId, count);
//       }
//     });
//   });

//   return io;
// };

// export const getIO = () => io;
// export const isOnline = (userId) => onlineUsers.has(String(userId));
// export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

// // Nayi conversation banne par participants ke sockets ko room me add karo
// export const joinParticipants = (conversation) => {
//   if (!io) return;
//   conversation.participants.forEach((pid) => {
//     io.in(`user:${pid}`).socketsJoin(`conv:${conversation._id}`);
//   });
// };
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.js";
import { allowedOrigins } from "../config/cors.js";

let io;
// userId -> number of active sockets (multiple tabs support)
const onlineUsers = new Map();

const parseCookies = (header = "") => {
  const out = {};
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  });
  return out;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Auth: cookie se JWT verify
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const token = cookies[process.env.COOKIE_NAME || "token"];
      if (!token) return next(new Error("Not authenticated"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id || decoded._id || decoded.userId);
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
    socket.join(`user:${userId}`);

    // user ki saari conversations ke rooms join karo
    const convs = await Conversation.find({ participants: userId }).select("_id");
    convs.forEach((c) => socket.join(`conv:${c._id}`));

    io.emit("presence", { userId, online: true });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on("disconnect", () => {
      const count = (onlineUsers.get(userId) || 1) - 1;
      if (count <= 0) {
        onlineUsers.delete(userId);
        io.emit("presence", { userId, online: false });
      } else {
        onlineUsers.set(userId, count);
      }
    });
  });

  return io;
};

export const getIO = () => io;
export const isOnline = (userId) => onlineUsers.has(String(userId));
export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

// Nayi conversation banne par participants ke sockets ko room me add karo
export const joinParticipants = (conversation) => {
  if (!io) return;
  conversation.participants.forEach((pid) => {
    io.in(`user:${pid}`).socketsJoin(`conv:${conversation._id}`);
  });
};