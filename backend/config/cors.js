const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const allowedOrigins = [
  "http://localhost:5173",
  "https://contractor-frontend-six.vercel.app",
  ...configuredOrigins,
];