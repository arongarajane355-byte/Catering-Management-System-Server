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
  toggleUserStatus,
  getAdminReportsSummary,
  getAdminBookingsReport,
  getAdminTransactionsReport,
  getAdminStaffPerformance,
  getAdminStaffReportsDetail,
  getAdminAuditLogs
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

// Reports & Monitoring Routes
router.get('/reports/summary', getAdminReportsSummary);
router.get('/reports/bookings', getAdminBookingsReport);
router.get('/reports/transactions', getAdminTransactionsReport);
router.get('/reports/staff-performance', getAdminStaffPerformance);
router.get('/reports/staff-details', getAdminStaffReportsDetail);
router.get('/reports/staff-detail', getAdminStaffReportsDetail);
router.get('/reports/audit-logs', getAdminAuditLogs);
router.get('/audit-logs', getAdminAuditLogs);

module.exports = router;

module.exports = router;
