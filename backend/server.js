import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { allowedOrigins } from "./config/cors.js";
import authRoutes from "./routes/authRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import contractorRoutes from "./routes/contractorRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import timeRoutes from "./routes/timeRoutes.js";
import estimateRoutes from "./routes/estimateRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { initSocket } from "./socket/socket.js"
import { stripeWebhook } from "./controllers/paymentController.js";
import documentRoutes from "./routes/documentRoutes.js";
import { startReminderJob } from "./utils/documentReminders.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import { startReminderJob as startCalendarReminders} from "./utils/reminderJob.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { startDocumentExpiryJob } from "./utils/documentExpiryChecker.js";
import adminRoutes from "./routes/adminRoutes.js";
import contractorPortalRoutes from "./routes/contractorPortalRoutes.js";
import customerPortalRoutes from "./routes/customerPortalRoutes.js";
import adminPortalRoutes from "./routes/adminPortalRoutes.js"; 

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/api/version", (req, res) => res.json({ v: "cors-fix-1" }));

let dbPromise;
const ensureDB = () => {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
};

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.send("API running"));
app.use("/api/auth", authRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/company", companyRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/estimates", estimateRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contractor-portal", contractorPortalRoutes);
app.use("/api/customer-portal", customerPortalRoutes);
app.use("/api/admin-portal", adminPortalRoutes);

// const PORT = process.env.PORT || 5000;

// const server = http.createServer(app);
// initSocket(server);

// connectDB().then(() => {
//   startReminderJob();
//   startDocumentExpiryJob();
//   startCalendarReminders();
//   server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// });

// export default app;

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

const PORT = process.env.PORT || 5000;

// Sirf local pe: socket + cron jobs + listen
if (!process.env.VERCEL) {
  const server = http.createServer(app);
  initSocket(server);
  ensureDB().then(() => {
    startReminderJob();
    startDocumentExpiryJob();
    startCalendarReminders();
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  }).catch((err) => {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  });
}

export default app;