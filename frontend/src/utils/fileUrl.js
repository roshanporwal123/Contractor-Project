const BASE = (import.meta.env.VITE_API_URL || "https://contractor-backend.vercel.app/api").replace(/\/api\/?$/, "");

export const fileUrl = (path) => (path ? `${BASE}${path}` : "");