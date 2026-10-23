import Document from "../models/Document.js";
import sendEmail from "../utils/sendEmail.js";

export const processExpiryReminders = async () => {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 365);

  const docs = await Document.find({
    expiryDate: { $ne: null, $lte: horizon },
    reminderSent: false,
  }).populate({
    path: "company",
    select: "name owner",
    populate: { path: "owner", select: "name email" },
  });

  const now = new Date();
  let sent = 0;

  for (const doc of docs) {
    const warnFrom = new Date(doc.expiryDate);
    warnFrom.setDate(warnFrom.getDate() - (doc.reminderDaysBefore || 30));
    if (now < warnFrom) continue; // abhi reminder ka time nahi aaya

    const owner = doc.company?.owner;
    if (!owner?.email) continue;

    const expired = doc.expiryDate < now;
    try {
      await sendEmail({
        to: owner.email,
        subject: expired
          ? `Document expired: ${doc.title}`
          : `Document expiring soon: ${doc.title}`,
        html: `
          <p>Hi ${owner.name || ""},</p>
          <p>Your document <b>${doc.title}</b> (${doc.category.replace(/_/g, " ")})
          ${expired ? "has expired on" : "will expire on"}
          <b>${doc.expiryDate.toDateString()}</b>.</p>
          <p>Please upload a renewed document.</p>
        `,
      });
      doc.reminderSent = true;
      await doc.save();
      sent++;
    } catch (err) {
      console.error("Reminder email failed:", doc._id, err.message);
    }
  }
  return sent;
};

// Server start hone par ek baar, phir har 24 ghante me
export const startReminderJob = () => {
  const run = () =>
    processExpiryReminders()
      .then((n) => n && console.log(`Expiry reminders sent: ${n}`))
      .catch((e) => console.error("Reminder job error:", e.message));

  setTimeout(run, 10 * 1000);
  setInterval(run, 24 * 60 * 60 * 1000);
};