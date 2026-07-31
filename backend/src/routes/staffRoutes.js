const express = require('express');
const router = express.Router();
const { createCustomerAccount, getCreatedCustomers, getStaffDashboard } = require('../controllers/staffController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.use(verifyToken);
router.use(requireRole('staff', 'admin'));

router.post('/customers', createCustomerAccount);
router.get('/customers', getCreatedCustomers);
router.get('/dashboard', getStaffDashboard);

module.exports = router;
