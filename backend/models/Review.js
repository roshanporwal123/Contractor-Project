import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', default: null, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // project rating ya contractor rating
    reviewType: { type: String, enum: ['project', 'contractor'], required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 1500 },

    // moderation
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    moderationNote: { type: String, trim: true, maxlength: 500 },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
  },
  { timestamps: true }
);

// ek user ek project/contractor ko ek hi baar review de sakta hai
reviewSchema.index(
  { reviewer: 1, project: 1, contractor: 1, reviewType: 1 },
  { unique: true }
);

export default mongoose.model('Review', reviewSchema);