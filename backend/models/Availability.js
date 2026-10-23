import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true },
    status: {
      type: String,
      enum: ['available', 'unavailable', 'leave'],
      default: 'unavailable',
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

availabilitySchema.index({ company: 1, contractor: 1, start: 1, end: 1 });

export default mongoose.model('Availability', availabilitySchema);