const express = require('express');
const router = express.Router();
const {
  getPendingVerifications,
  verifyCustomerAccount,
  getAdminSummary,
  getAllStaff,
  getAllUsers,
  createStaff,
  createUser,
  toggleUserStatus
} = require('../controllers/adminController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/pending-verifications', getPendingVerifications);
router.post('/verify-customer', verifyCustomerAccount);
router.get('/summary', getAdminSummary);
router.get('/staff', getAllStaff);
router.get('/users', getAllUsers);
router.post('/staff', createStaff);
router.post('/users', createUser);
router.put('/user-status', toggleUserStatus);

module.exports = router;
