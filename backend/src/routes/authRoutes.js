const express = require('express');
const router = express.Router();
const { login, getMe, registerCustomer, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/login', login);
router.post('/register', registerCustomer); // Public — no token required
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
