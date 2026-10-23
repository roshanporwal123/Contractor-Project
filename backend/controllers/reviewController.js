import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Project from '../models/Project.js';

import Company from "../models/Company.js";
const oid = (id) => new mongoose.Types.ObjectId(id);
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Average rating + distribution (sirf approved reviews)
const getSummary = async (match) => {
  const rows = await Review.aggregate([
    { $match: { ...match, status: 'approved' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  rows.forEach((r) => {
    distribution[r._id] = r.count;
    total += r.count;
    sum += r._id * r.count;
  });

  return {
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    count: total,
    distribution,
  };
};

// POST /api/reviews  — customer review create
export const createReview = async (req, res) => {
  try {
    const { projectId, contractorId, reviewType, rating, title, comment } = req.body;

    if (!isValidId(projectId)) return res.status(400).json({ message: 'Valid projectId required' });
    if (!['project', 'contractor'].includes(reviewType))
      return res.status(400).json({ message: 'reviewType must be project or contractor' });
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    if (reviewType === 'contractor' && !isValidId(contractorId))
      return res.status(400).json({ message: 'contractorId required for contractor review' });

    // const project = await Project.findById(projectId);
    // if (!project) return res.status(404).json({ message: 'Project not found' });

    // const review = await Review.create({
    //   company: project.company,
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

   // company resolve: pehle project.company, nahi to project ke owner user se
   let companyId = project.company;
   if (!companyId) {
   const ownerId = project.createdBy || project.owner || project.user;
   const company = ownerId ? await Company.findOne({ owner: ownerId }) : null;
   companyId = company?._id;
}
if (!companyId) {
  return res.status(400).json({ message: 'Project ki company resolve nahi hui' });
}

const review = await Review.create({
      company: companyId,
      project: project._id,
      contractor: reviewType === 'contractor' ? contractorId : null,
      reviewer: req.user._id,
      reviewType,
      rating,
      title,
      comment,
      status: 'pending',
    });

    res.status(201).json({ message: 'Review submitted, moderation ke baad dikhega', review });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Aap pehle hi is item ko review de chuke ho' });
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/mine — mere diye hue reviews
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewer: req.user._id })
      .populate('project', 'name')
      .populate('contractor')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews — moderation list (admin = sab, company = apni company)
export const listReviews = async (req, res) => {
  try {
    const { status, reviewType, contractor, project } = req.query;
    const filter = req.user.role === 'admin' ? {} : { company: req.companyId };

    if (status) filter.status = status;
    if (reviewType) filter.reviewType = reviewType;
    if (contractor && isValidId(contractor)) filter.contractor = contractor;
    if (project && isValidId(project)) filter.project = project;

    const reviews = await Review.find(filter)
      .populate('reviewer', 'name email')
      .populate('project', 'name')
      .populate('contractor')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/contractor/:id — approved reviews + average
export const getContractorReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid id' });

    const match = { contractor: oid(id), reviewType: 'contractor' };
    const [reviews, summary] = await Promise.all([
      Review.find({ ...match, status: 'approved' })
        .populate('reviewer', 'name')
        .populate('project', 'name')
        .sort({ createdAt: -1 }),
      getSummary(match),
    ]);

    res.json({ summary, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/project/:id — approved reviews + average
export const getProjectReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid id' });

    const match = { project: oid(id), reviewType: 'project' };
    const [reviews, summary] = await Promise.all([
      Review.find({ ...match, status: 'approved' })
        .populate('reviewer', 'name')
        .sort({ createdAt: -1 }),
      getSummary(match),
    ]);

    res.json({ summary, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/reviews/:id — reviewer apna review edit kare (dobara pending ho jata hai)
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (String(review.reviewer) !== String(req.user._id))
      return res.status(403).json({ message: 'Sirf apna review edit kar sakte ho' });

    const { rating, title, comment } = req.body;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating 1-5 hona chahiye' });
      review.rating = rating;
    }
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;

    review.status = 'pending';
    review.moderationNote = undefined;
    await review.save();

    res.json({ message: 'Review updated', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/reviews/:id/moderate — approve / reject
export const moderateReview = async (req, res) => {
  try {
    const { status, moderationNote } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (req.user.role !== 'admin' && String(review.company) !== String(req.companyId))
      return res.status(403).json({ message: 'Not allowed' });

    review.status = status;
    review.moderationNote = moderationNote;
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();

    res.json({ message: `Review ${status}`, review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reviews/:id — reviewer ya admin
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = String(review.reviewer) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not allowed' });

    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/stats — moderation counts + overall average + top contractors
export const getReviewStats = async (req, res) => {
  try {
    const base = req.user.role === 'admin' ? {} : { company: oid(req.companyId) };

    const [counts, overall, topContractors] = await Promise.all([
      Review.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      getSummary(base),
      Review.aggregate([
        { $match: { ...base, reviewType: 'contractor', status: 'approved' } },
        { $group: { _id: '$contractor', average: { $avg: '$rating' }, count: { $sum: 1 } } },
        { $sort: { average: -1, count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'contractors', localField: '_id', foreignField: '_id', as: 'contractor' } },
        { $unwind: { path: '$contractor', preserveNullAndEmptyArrays: true } },
        { $project: { average: { $round: ['$average', 1] }, count: 1, contractor: 1 } },
      ]),
    ]);

    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    counts.forEach((c) => (byStatus[c._id] = c.count));

    res.json({ byStatus, overall, topContractors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};