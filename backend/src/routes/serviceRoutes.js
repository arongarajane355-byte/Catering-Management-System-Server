const express = require('express');
const router = express.Router();
const {
  getServicesGrouped,
  getAllCategories,
  createCategory,
  getAllServices,
  createService,
  updateService
} = require('../controllers/serviceController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Public route for Landing Page
router.get('/grouped', getServicesGrouped);

// Protected Admin routes
router.get('/categories', getAllCategories);
router.post('/categories', verifyToken, requireRole('admin'), createCategory);

router.get('/', getAllServices);
router.post('/', verifyToken, requireRole('admin'), createService);
router.put('/:id', verifyToken, requireRole('admin'), updateService);

module.exports = router;
