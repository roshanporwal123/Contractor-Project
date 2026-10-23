import Notification from "../models/Notification.js";

export const notifyUser = async ({
  recipient,
  type = "general",
  title,
  message = "",
  link = "",
  data = {},
}) => {
  try {
    if (!recipient) return null;
    return await Notification.create({ recipient, type, title, message, link, data });
  } catch (err) {
    console.error("notifyUser error:", err.message);
    return null;
  }
};

export const notifyMany = async (recipients = [], payload = {}) => {
  try {
    const unique = [...new Set(recipients.filter(Boolean).map(String))];
    if (!unique.length) return [];
    const docs = unique.map((id) => ({ ...payload, recipient: id }));
    return await Notification.insertMany(docs);
  } catch (err) {
    console.error("notifyMany error:", err.message);
    return [];
  }
};