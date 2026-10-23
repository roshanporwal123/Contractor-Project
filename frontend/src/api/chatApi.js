import api from "./axios";

export const chatApi = {
  searchUsers: (search = "") => api.get("/chat/users", { params: { search } }),
  getConversations: () => api.get("/chat/conversations"),
  createConversation: (data) => api.post("/chat/conversations", data),
  getMessages: (id, before) =>
    api.get(`/chat/conversations/${id}/messages`, { params: { before } }),
  sendMessage: (id, formData) =>
    api.post(`/chat/conversations/${id}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  markRead: (id) => api.put(`/chat/conversations/${id}/read`),
  getFiles: (id) => api.get(`/chat/conversations/${id}/files`),
  getComments: (type, id) => api.get(`/chat/comments/${type}/${id}`),
  addComment: (type, id, text) => api.post(`/chat/comments/${type}/${id}`, { text }),
  deleteComment: (commentId) => api.delete(`/chat/comments/${commentId}`),
};