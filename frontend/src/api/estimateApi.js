import api from "./axios";

export const estimateApi = {
  list: (params) => api.get("/estimates", { params }),
  get: (id) => api.get(`/estimates/${id}`),
  create: (data) => api.post("/estimates", data),
  update: (id, data) => api.put(`/estimates/${id}`, data),
  remove: (id) => api.delete(`/estimates/${id}`),
  send: (id) => api.post(`/estimates/${id}/send`),
  pdf: (id) => api.get(`/estimates/${id}/pdf`, { responseType: "blob" }),
  publicGet: (token) => api.get(`/estimates/public/${token}`),
  publicRespond: (token, data) => api.post(`/estimates/public/${token}/respond`, data),
};