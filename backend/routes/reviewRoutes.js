import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Company from '../models/Company.js';
import {
  createReview,
  getMyReviews,
  listReviews,
  getContractorReviews,
  getProjectReviews,
  updateReview,
  moderateReview,
  deleteReview,
  getReviewStats,
} from '../controllers/reviewController.js';

const router = express.Router();

// company resolve (Company.owner = user._id). Admin ko company ki zarurat nahi.
const attachCompany = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    req.companyId = company._id;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.use(protect);

// moderators
const MODERATORS = ['admin', 'company'];

// specific routes pehle, /:id wale baad me
router.get('/mine', getMyReviews);
router.get('/stats', authorize(...MODERATORS), attachCompany, getReviewStats);
router.get('/contractor/:id', getContractorReviews);
router.get('/project/:id', getProjectReviews);

router.get('/', authorize(...MODERATORS), attachCompany, listReviews);
router.post('/', authorize('customer', 'admin', 'company'), createReview);

router.patch('/:id/moderate', authorize(...MODERATORS), attachCompany, moderateReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;