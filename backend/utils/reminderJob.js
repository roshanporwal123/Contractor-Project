import CalendarEvent from '../models/CalendarEvent.js';
import sendEmail from './sendEmail.js';

const checkReminders = async () => {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

    const events = await CalendarEvent.find({
      status: 'scheduled',
      start: { $gt: now, $lte: horizon },
      'reminders.sent': false,
    })
      .populate('createdBy', 'email name')
      .populate('contractor');

    for (const event of events) {
      let changed = false;

      for (const r of event.reminders) {
        if (r.sent) continue;
        const fireAt = new Date(event.start.getTime() - r.minutesBefore * 60 * 1000);
        if (fireAt > now) continue;

        const recipients = [
          event.createdBy?.email,
          event.contractor?.email,
          event.client?.email,
        ].filter(Boolean);

        for (const to of recipients) {
          try {
            await sendEmail({
              to,
              subject: `Reminder: ${event.title}`,
              html: `
                <h3>${event.title}</h3>
                <p><b>Time:</b> ${event.start.toLocaleString()}</p>
                ${event.location ? `<p><b>Location:</b> ${event.location}</p>` : ''}
                ${event.description ? `<p>${event.description}</p>` : ''}
              `,
            });
          } catch (err) {
            console.error('Reminder email fail:', to, err.message);
          }
        }

        r.sent = true;
        changed = true;
      }

      if (changed) await event.save();
    }
  } catch (err) {
    console.error('Reminder job error:', err.message);
  }
};

export const startReminderJob = () => {
  checkReminders();
  setInterval(checkReminders, 60 * 1000); // har 1 minute
  console.log('Calendar reminder job started');
};