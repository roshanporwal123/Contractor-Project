import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? "http://localhost:5000/api"
      : "https://contractor-backend.vercel.app/api"),
  withCredentials: true,
});

// Vercel frontend and backend can be on different origins, where browsers may
// omit the auth cookie. Keep the login token for this tab and send it explicitly.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("authToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
