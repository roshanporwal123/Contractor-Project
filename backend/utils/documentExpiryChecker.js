import Document from "../models/Document.js";
import Company from "../models/Company.js";
import Notification from "../models/Notification.js";
import { notifyUser } from "./notify.js";

const DAYS_BEFORE = 30;

export const checkDocumentExpiry = async () => {
  try {
    const now = new Date();
    const limit = new Date(now.getTime() + DAYS_BEFORE * 24 * 60 * 60 * 1000);

    const docs = await Document.find({
      expiryDate: { $ne: null, $lte: limit },
    });

    for (const doc of docs) {
      const company = await Company.findById(doc.company).select("owner");
      if (!company?.owner) continue;

      const expired = doc.expiryDate < now;
      const state = expired ? "expired" : "expiring";

      // duplicate na bheje: same document + same state ke liye ek hi baar
      const already = await Notification.findOne({
        recipient: company.owner,
        type: "document_expiry",
        "data.refId": String(doc._id),
        "data.state": state,
      });
      if (already) continue;

      const dateStr = doc.expiryDate.toDateString();
      await notifyUser({
        recipient: company.owner,
        type: "document_expiry",
        title: expired ? "Document expired" : "Document expiring soon",
        message: expired
          ? `"${doc.title}" expired on ${dateStr}.`
          : `"${doc.title}" will expire on ${dateStr}.`,
        link: "/documents",
        data: { refId: String(doc._id), state },
      });
    }
  } catch (err) {
    console.error("checkDocumentExpiry error:", err.message);
  }
};

export const startDocumentExpiryJob = () => {
  checkDocumentExpiry();
  setInterval(checkDocumentExpiry, 24 * 60 * 60 * 1000);
};