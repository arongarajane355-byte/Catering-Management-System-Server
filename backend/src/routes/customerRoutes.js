const express = require('express');
const router = express.Router();
const { updateProfile, getCustomerDashboard } = require('../controllers/customerController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.use(verifyToken);
router.use(requireRole('customer'));

router.put('/profile', updateProfile);
router.get('/dashboard', getCustomerDashboard);

module.exports = router;
