import express from 'express';
import { protect } from '../middleware/auth.js';
import Company from '../models/Company.js';
import {
  getOverview,
  getProfitability,
  getContractorPerformance,
  exportReport,
} from '../controllers/dashboardController.js';

const router = express.Router();

// Module 10 jaisa: apni local copy
const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id }).select('_id');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Pehle company profile banao' });
    }
    req.companyId = company._id;
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

router.use(protect, attachCompany);

router.get('/overview', getOverview);
router.get('/profitability', getProfitability);
router.get('/contractors', getContractorPerformance);
router.get('/export/:type', exportReport);

export default router;