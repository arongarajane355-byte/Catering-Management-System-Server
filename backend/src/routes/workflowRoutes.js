const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  createBookingRequest,
  getBookingRequests,
  getBookingRequestById,
  reviewBookingRequest,
  getEventOrders,
  getEventOrderById,
  submitRequirement,
  reviewRequirement,
  logMilestone,
  submitEvaluation
} = require('../controllers/workflowController');

const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Setup multer storage for requirement document uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `req-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ── 1. Booking Requests (Inquiries / Stage 1) ────────────────────────────────
router.post('/requests', verifyToken, requireRole('customer'), createBookingRequest);
router.get('/requests', verifyToken, getBookingRequests);
router.get('/requests/:id', verifyToken, getBookingRequestById);
router.post('/requests/:id/review', verifyToken, requireRole('admin', 'staff'), reviewBookingRequest);

// ── 2. Active Event Orders (Placements / Stage 3) ───────────────────────────
router.get('/orders', verifyToken, getEventOrders);
router.get('/orders/:id', verifyToken, getEventOrderById);

// ── 3. Requirements Checklist (Stage 4) ─────────────────────────────────────
router.post('/requirements/:id/submit', verifyToken, upload.single('file'), submitRequirement);
router.post('/requirements/:id/review', verifyToken, requireRole('admin', 'staff'), reviewRequirement);

// ── 4. Event Milestones (Stage 5) ───────────────────────────────────────────
router.post('/milestones/:id/log', verifyToken, requireRole('admin', 'staff'), logMilestone);

// ── 5. Closeout & Evaluations (Stage 6) ─────────────────────────────────────
router.post('/orders/:id/evaluate', verifyToken, requireRole('customer'), submitEvaluation);

module.exports = router;
