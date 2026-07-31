const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus
} = require('../controllers/bookingController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.use(verifyToken);

router.post('/', requireRole('customer'), createBooking);
router.get('/', listBookings);
router.get('/:id', getBookingById);
router.put('/:id/status', requireRole('staff', 'admin'), updateBookingStatus);

module.exports = router;
