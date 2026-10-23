import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    minutesBefore: { type: Number, required: true, min: 0 },
    sent: { type: Boolean, default: false },
  },
  { _id: false }
);

const calendarEventSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['site_visit', 'appointment', 'meeting', 'reminder', 'other'],
      default: 'appointment',
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', default: null },
    client: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    location: { type: String, default: '' },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    reminders: { type: [reminderSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

calendarEventSchema.index({ company: 1, start: 1, end: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);