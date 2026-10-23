import api from "./axios";

export const getProjects = (params) => api.get("/projects", { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post("/projects", data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const updateProjectStatus = (id, status) =>
  api.patch(`/projects/${id}/status`, { status });
export const updateProjectProgress = (id, progress) =>
  api.patch(`/projects/${id}/progress`, { progress });
export const assignContractors = (id, contractorIds) =>
  api.post(`/projects/${id}/contractors`, { contractorIds });
export const removeContractor = (id, contractorId) =>
  api.delete(`/projects/${id}/contractors/${contractorId}`);
export const uploadProjectDocs = (id, formData) =>
  api.post(`/projects/${id}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteProjectDoc = (id, docId) =>
  api.delete(`/projects/${id}/documents/${docId}`);