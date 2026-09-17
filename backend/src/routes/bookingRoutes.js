const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus,
  getBookedDates
} = require('../controllers/bookingController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Public endpoint: check unavailable event dates (no token required)
router.get('/booked-dates', getBookedDates);

router.use(verifyToken);

router.post('/', requireRole('customer'), createBooking);
router.get('/', listBookings);
router.get('/:id', getBookingById);
router.put('/:id/status', requireRole('staff', 'admin'), updateBookingStatus);

module.exports = router;
