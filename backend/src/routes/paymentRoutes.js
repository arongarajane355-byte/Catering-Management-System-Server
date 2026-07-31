const express = require('express');
const router = express.Router();
const { recordPayment, listPayments } = require('../controllers/paymentController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.use(verifyToken);

router.post('/', requireRole('staff', 'admin'), recordPayment);
router.get('/', listPayments);

module.exports = router;
