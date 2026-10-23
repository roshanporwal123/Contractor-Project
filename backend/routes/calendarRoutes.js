import express from 'express';
import { protect } from '../middleware/auth.js';
import Company from '../models/Company.js';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  setAvailability,
  getAvailability,
  deleteAvailability,
  checkAvailability,
  getCalendarFeed,
  getUpcoming,
} from '../controllers/calendarController.js';

const router = express.Router();

const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ message: 'Pehle company profile banao' });
    req.companyId = company._id;
    next();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

router.use(protect, attachCompany);

// Combined calendar feed
router.get('/feed', getCalendarFeed);
router.get('/upcoming', getUpcoming);

// Availability (/:id se pehle rakho)
router.get('/availability/check', checkAvailability);
router.get('/availability', getAvailability);
router.post('/availability', setAvailability);
router.delete('/availability/:id', deleteAvailability);

// Events
router.route('/events').get(getEvents).post(createEvent);
router.route('/events/:id').get(getEventById).put(updateEvent).delete(deleteEvent);
router.patch('/events/:id/status', updateEventStatus);

export default router;