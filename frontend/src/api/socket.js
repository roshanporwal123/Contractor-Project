import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://contractor-backend.vercel.app";

let socket = null;


export const connectSocket = () => {
  if (!socket) {
    socket = io(SERVER_URL, { withCredentials: true });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const SERVER = SERVER_URL;